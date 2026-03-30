const { exec } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const AGENT_LOG_PATH = path.join(__dirname, 'agent_log.json');
let agentLog = {};
try {
  if (fs.existsSync(AGENT_LOG_PATH)) {
    agentLog = JSON.parse(fs.readFileSync(AGENT_LOG_PATH, 'utf8'));
  }
} catch (e) {
  console.error('[WA] Error al cargar agent_log.json:', e.message);
}

function saveAgentLog() {
  try {
    fs.writeFileSync(AGENT_LOG_PATH, JSON.stringify(agentLog, null, 2));
  } catch (e) {
    console.error('[WA] Error al guardar agent_log.json:', e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let waClient = null;
let currentStatus = 'disconnected'; // 'disconnected' | 'qr' | 'authenticated' | 'ready'
let currentQR = null;
let connectedNumber = null;
const inboxMessages = [];
let autoResponseConfig = { enabled: false, templateId: null, content: '' };
let menuConfig = { enabled: false, options: {} }; // options: { "1": "Template Content", "2": "...", ... }
let keywordConfig = { enabled: true, mappings: [] }; // { keyword: string, templateId: string, content: string }
let coordinatorConfig = {
  efigas: '573000000001',
  ph: '573000000002',
  fna: '573000000003',
  crediorbe: '573000000004',
  cartera: '',
  contact_center: '',
  emdata: '',
  juridica: ''
};
const autoRespondedNumbers = new Set();
const waitingForOption = new Map(); // number -> { timestamp, state, portfolio, startTime }
const humanAgentSessions = new Map(); // number -> { agentName: string, startTime: number }

const CONFIG_PATH = path.join(__dirname, 'config.json');

// EMBOT Visuals (Portable relative paths for Docker)
const IMG_WELCOME = path.join(__dirname, 'assets', 'welcome.png');
const IMG_WAIT = path.join(__dirname, 'assets', 'wait.png');
const IMG_FINAL = path.join(__dirname, 'assets', 'final.png');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.autoResponseConfig) autoResponseConfig = data.autoResponseConfig;
      if (data.menuConfig) menuConfig = data.menuConfig;
      if (data.keywordConfig) keywordConfig = data.keywordConfig;
      if (data.coordinatorConfig) coordinatorConfig = data.coordinatorConfig;
      console.log('[Config] Configuración cargada desde disco.');
    }
  } catch (e) {
    console.error('[Config] Error cargando configuración:', e.message);
  }
}

function saveConfig() {
  try {
    const data = { 
      autoResponseConfig, 
      menuConfig, 
      keywordConfig,
      coordinatorConfig 
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    console.log('[Config] Configuración guardada en disco.');
  } catch (e) {
    console.error('[Config] Error guardando configuración:', e.message);
  }
}

function initWhatsApp() {
  waClient = new Client({
            authStrategy: new LocalAuth({
                clientId: 'embot-session',
                dataPath: './wa_session_v2'
            }),
            puppeteer: {
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

  waClient.on('qr', async (qr) => {
    console.log('[WA] QR recibido, emitiendo al frontend...');
    currentStatus = 'qr';
    currentQR = await qrcode.toDataURL(qr);
    io.emit('wa:status', { status: 'qr', qr: currentQR });
  });

  waClient.on('authenticated', () => {
    console.log('[WA] Autenticado correctamente.');
    currentStatus = 'authenticated';
    currentQR = null;
    io.emit('wa:status', { status: 'authenticated' });
  });

  waClient.on('ready', async () => {
    console.log('[WA] Cliente listo!');
    currentStatus = 'ready';
    const info = waClient.info;
    connectedNumber = info?.wid?.user || 'Desconocido';
    io.emit('wa:status', { status: 'ready', number: connectedNumber });
  });

  waClient.on('disconnected', (reason) => {
    console.log('[WA] Desconectado:', reason);
    currentStatus = 'disconnected';
    connectedNumber = null;
    io.emit('wa:status', { status: 'disconnected' });
    // Re-initialize after a short delay
    setTimeout(initWhatsApp, 5000);
  });

  // Helper to send alert to one or more agents
  const sendAlertToAgents = async (numbersStr, alertMsg) => {
    if (!numbersStr) return;
    const targets = numbersStr.split(',').map(s => s.trim()).filter(s => s);
    for (const raw of targets) {
      const agentId = raw.includes('@') ? raw : `${raw}@c.us`;
      try {
        console.log(`[WA] 🔔 Enviando alerta a asesor: ${agentId}`);
        await waClient.sendMessage(agentId, alertMsg);
      } catch (e) {
        console.error(`[WA] Error enviando alerta a ${agentId}:`, e.message);
      }
    }
  };

  waClient.on('message', async (msg) => {
    try {
      if (msg.fromMe) return; // Ignore messages sent by the bot itself
      
      const from = msg.from || '';
      if (from.includes('@broadcast') || from.includes('status') || !msg.body?.trim()) return;
      if (from.includes('@g.us')) return;

      const number = from.split('@')[0];

      let contact = {};
      try {
        contact = await msg.getContact();
      } catch (e) {
        console.error(`[WA] Error obteniendo contacto para ${number}:`, e.message);
      }
      
      // 1. Check for Keywords (Priority)
      let keywordTriggered = false;
      if (keywordConfig.enabled && keywordConfig.mappings.length > 0) {
        const body = msg.body.toLowerCase();
        const match = keywordConfig.mappings.find(m => body.includes(m.keyword.toLowerCase()));
        if (match) {
          console.log(`[WA] 🔑 Palabra clave detectada: "${match.keyword}" para ${number}`);
          await waClient.sendMessage(from, match.content);
          keywordTriggered = true;
          
          // Send Alert to Agent if configured
          if (match.agentNumber) {
            const alertMsg = `🔔 *Alerta de Lead (Instagram)*\n\nEl cliente *${contact.pushname || number}* (${number}) ha activado la palabra clave: *${match.keyword}*.\n\nPor favor, atiende la conversación en el dashboard.`;
            await sendAlertToAgents(match.agentNumber, alertMsg);
          }
        }
      }

      // Helper for Business Hours
      const isBusinessHours = () => {
        // America/Bogota time
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
        const day = now.getDay();
        const hour = now.getHours();
        
        // M-F (1 to 5)
        if (day === 0 || day === 6) return false;
        
        // 8 AM to 11:59 AM (8 <= hour < 12) OR 1 PM to 4:59 PM (13 <= hour < 17)
        if ((hour >= 8 && hour < 12) || (hour >= 13 && hour < 17)) {
          return true;
        }
        return false;
      };

      // Check if bot is silenced for this user (Handover to Human)
      if (humanAgentSessions.has(number)) {
        console.log(`[WA] 👤 Silenciando bot para ${number} (Atención Humana)`);
      } else if (!keywordTriggered && autoResponseConfig.enabled && !waitingForOption.has(number)) {
        // FIRST MESSAGE
        const inHours = isBusinessHours();
        
        if (!inHours) {
          const outOfHoursMsg = `Hola 👋 gracias por escribirnos a EMDECOB.\nEn este momento estamos fuera de nuestro horario de atención.\n\nHorario de atención:\nLunes a viernes de 8:00 a. m. a 12:00 m. y de 1:00 p. m. a 5:00 p. m.\nNo atendemos sábados, domingos ni festivos.\n\nPor favor, déjanos tu nombre completo y tu mensaje, y te responderemos en nuestro próximo horario hábil 🙌`;
          await waClient.sendMessage(from, outOfHoursMsg);
          waitingForOption.set(number, { state: 'awaiting_out_of_hours_data', originalFrom: from, startTime: Date.now() });
        } else {
          try {
            const media = MessageMedia.fromFilePath(IMG_WELCOME);
            await waClient.sendMessage(from, media);
          } catch (e) {
            console.error('[Cally] Error enviando imagen de bienvenida:', e.message);
          }
          
          const menuMsg = `Hola 👋 gracias por escribirnos a EMDECOB.\nCuéntanos, ¿en qué podemos ayudarte hoy?\n\n1. Manejo de cartera (recuperación de cartera)\n2. Contact center (ventas, servicio o recaudo)\n3. Analítica de datos – EMDATA (tableros en Power BI)\n4. Asesoría jurídica\n5. Servicio al cliente (consulta de deuda o información)\n\nResponde con el número de la opción 👇`;
          await waClient.sendMessage(from, menuMsg);
          waitingForOption.set(number, { state: 'main_menu', originalFrom: from, startTime: Date.now() });
        }
      } else if (waitingForOption.has(number) && !humanAgentSessions.has(number)) {
        const body = msg.body.trim().toLowerCase();
        let userState = waitingForOption.get(number);
        
        // Helper to complete flow
        const completeFlow = async () => {
          setTimeout(async () => {
            const endMsg = `Gracias por tu información. Pronto uno de nuestros agentes te atenderá 🙌`;
            try {
              await waClient.sendMessage(from, endMsg);
            } catch (e) { console.error('[Bot] Error final message:', e.message); }
          }, 5000);
          waitingForOption.set(number, { ...userState, state: 'completed', startTime: Date.now() });
        };

        if (userState.state === 'main_menu') {
          if (body === '1' || body.includes('manejo') || body.includes('cartera')) {
            const reply = `Perfecto 👌\nEn EMDECOB te ayudamos a recuperar cartera de forma estratégica, priorizando, segmentando y optimizando cada gestión para lograr resultados reales.\n\nPor favor indícanos:\n\n- tu nombre completo\n- si tu cartera es administrativa o jurídica\n- de qué sector es`;
            await waClient.sendMessage(from, reply);
            waitingForOption.set(number, { ...userState, state: 'awaiting_opt1_data' });
          } else if (body === '2' || body.includes('contact center')) {
            const reply = `Perfecto 👌\nNuestro servicio de contact center está enfocado en resultados: ventas, recaudo y servicio al cliente, con procesos estructurados y medición constante.\n\nPor favor indícanos:\n\n- tu nombre completo\n- qué deseas mejorar:\n  • Ventas\n  • Servicio\n  • Recaudo`;
            await waClient.sendMessage(from, reply);
            waitingForOption.set(number, { ...userState, state: 'awaiting_opt2_data' });
          } else if (body === '3' || body.includes('emdata') || body.includes('analítica')) {
            const reply = `Perfecto 👌\nCon EMDATA llevamos tu información a otro nivel con tableros en Power BI y asesoría personalizada.\n\nPor favor indícanos:\n\n- tu nombre completo\n- qué te gustaría medir o mejorar en tu negocio`;
            await waClient.sendMessage(from, reply);
            waitingForOption.set(number, { ...userState, state: 'awaiting_opt3_data' });
          } else if (body === '4' || body.includes('jurídica') || body.includes('juridica') || body.includes('asesoría')) {
            const reply = `Perfecto 👌\nSabemos que estos procesos pueden ser complejos, pero con el acompañamiento adecuado todo se vuelve mucho más claro.\n\nEn EMDECOB te guiamos paso a paso para proteger tus intereses y avanzar de forma segura.\n\nPor favor indícanos:\n\n- tu nombre completo\n- un breve resumen de tu caso`;
            await waClient.sendMessage(from, reply);
            waitingForOption.set(number, { ...userState, state: 'awaiting_opt4_data' });
          } else if (body === '5' || body.includes('servicio')) {
            const reply = `Perfecto 👌\nPara ayudarte con tu solicitud, selecciona el portafolio:\n\n1. Crediorbe\n2. Efigas\n3. FNA\n4. Propiedad horizontal\n\nResponde con el número de la opción 👇`;
            await waClient.sendMessage(from, reply);
            waitingForOption.set(number, { ...userState, state: 'awaiting_opt5_portafolio' });
          } else {
            const errorMsg = `Por favor responde con el número de una de las opciones disponibles 👇`;
            await waClient.sendMessage(from, errorMsg);
          }
        } 
        else if (userState.state === 'awaiting_opt5_portafolio') {
          const portfolioMap = {
            "1": { name: "Crediorbe", coord: coordinatorConfig.crediorbe },
            "crediorbe": { name: "Crediorbe", coord: coordinatorConfig.crediorbe },
            "2": { name: "Efigas", coord: coordinatorConfig.efigas },
            "efigas": { name: "Efigas", coord: coordinatorConfig.efigas },
            "3": { name: "FNA", coord: coordinatorConfig.fna },
            "fna": { name: "FNA", coord: coordinatorConfig.fna },
            "4": { name: "Propiedad horizontal", coord: coordinatorConfig.ph },
            "propiedad": { name: "Propiedad horizontal", coord: coordinatorConfig.ph },
            "horizontal": { name: "Propiedad horizontal", coord: coordinatorConfig.ph },
            "propiedad horizontal": { name: "Propiedad horizontal", coord: coordinatorConfig.ph }
          };
          const selected = portfolioMap[body];
          if (selected) {
             const dataRequestMsg = `Por favor indícanos:\n\n- tu nombre completo\n- tu número de cédula`;
             await waClient.sendMessage(from, dataRequestMsg);
             waitingForOption.set(number, { ...userState, state: 'awaiting_opt5_data', portfolio: selected });
          } else {
             const errorMsg = `Por favor selecciona correctamente el portafolio:\n\n1. Crediorbe\n2. Efigas\n3. FNA\n4. Propiedad horizontal\n\nResponde con el número de la opción 👇`;
             await waClient.sendMessage(from, errorMsg);
          }
        }
        else if (userState.state.startsWith('awaiting_opt') || userState.state === 'awaiting_out_of_hours_data') {
          const numberAlertMsg = `🆘 *Alerta de Lead - Cally*\n\nEl cliente *${contact.pushname || number}* (${number}) ha ingresado sus datos y requiere atención humana.\n\nPor favor, revisa el Inbox.`;

          if (userState.state === 'awaiting_opt5_data' && userState.portfolio) {
            console.log(`[Cally] 🆘 Intentando enviar alerta a ${userState.portfolio.coord}...`);
            const alertMsg = `🆘 *Alerta de Portafolio - Cally*\n\nEl cliente *${contact.pushname || number}* (${number}) ha seleccionado el portafolio: *${userState.portfolio.name}*.\n\nPor favor, revisa el Inbox para atender.`;
            await sendAlertToAgents(userState.portfolio.coord, alertMsg);
          } else if (userState.state === 'awaiting_opt1_data' && coordinatorConfig.cartera) {
            await sendAlertToAgents(coordinatorConfig.cartera, numberAlertMsg + "\nOpción: Manejo de Cartera");
          } else if (userState.state === 'awaiting_opt2_data' && coordinatorConfig.contact_center) {
            await sendAlertToAgents(coordinatorConfig.contact_center, numberAlertMsg + "\nOpción: Contact Center");
          } else if (userState.state === 'awaiting_opt3_data' && coordinatorConfig.emdata) {
            await sendAlertToAgents(coordinatorConfig.emdata, numberAlertMsg + "\nOpción: EMDATA");
          } else if (userState.state === 'awaiting_opt4_data' && coordinatorConfig.juridica) {
            await sendAlertToAgents(coordinatorConfig.juridica, numberAlertMsg + "\nOpción: Asesoría Jurídica");
          }
          
          await completeFlow();
        }
      }

      const inboxMsg = {
        id: msg.id._serialized,
        chatId: from,
        from: contact.name || contact.pushname || contact.number || number,
        number: number,
        text: msg.body,
        time: new Date(msg.timestamp * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        timestamp: msg.timestamp
      };
      
      inboxMessages.unshift(inboxMsg);
      if (inboxMessages.length > 500) inboxMessages.pop();
      io.emit('wa:message', inboxMsg);
      console.log(`[WA] ✉️ Mensaje de ${inboxMsg.from}: ${inboxMsg.text}`);
    } catch (e) {
      console.error('[WA] Error procesando mensaje:', e.message);
    }
  });

  waClient.initialize().catch(err => {
    console.error('[WA] Error inicializando:', err.message);
    setTimeout(initWhatsApp, 10000);
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), service: 'whatsapp-backend' });
});

// REST Endpoints
app.get('/status', (req, res) => {
  res.json({ status: currentStatus, number: connectedNumber, hasQR: !!currentQR });
});

app.get('/qr', (req, res) => {
  res.json({ qr: currentQR, status: currentStatus });
});

app.get('/messages', (req, res) => {
  res.json(inboxMessages);
});

app.get('/chats', async (req, res) => {
  console.log(`[API] 📥 Solicitando lista de chats (Estado: ${currentStatus})...`);
  if (!waClient || currentStatus !== 'ready') {
    console.log(`[API] ⚠️ No se pueden obtener chats: Cliente no listo (Estado: ${currentStatus})`);
    return res.json([]);
  }
  try {
    console.log(`[API] Intentando waClient.getChats() con timeout...`);
    
    const getChatsWithTimeout = () => {
      return Promise.race([
        waClient.getChats(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de WhatsApp (getChats)')), 15000))
      ]);
    };

    const chats = await getChatsWithTimeout();
    console.log(`[API] ✅ ${chats.length} chats recibidos de WhatsApp.`);
    
    // Si no hay chats, puede ser que la sincronización aún no termine
    if (chats.length === 0) {
      console.log('[API] ℹ️ La lista de chats está vacía. Es posible que la sincronización esté en curso.');
    }

    // Filter out groups, broadcast and status to avoid 'strange names'
    const filteredChats = chats.filter(c => !c.isGroup && !c.isReadOnly && !c.id.user.includes('status'));

    const activeChats = await Promise.all(filteredChats.slice(0, 15).map(async (chat) => {
      try {
        const msgs = await chat.fetchMessages({ limit: 40 });
        const contact = await chat.getContact().catch(() => ({}));
        
        // Resolve a readable name: priority name > pushname > number
        const resolvedName = contact.name || contact.pushname || chat.name || chat.id.user;

        return {
          id: chat.id._serialized,
          name: resolvedName,
          number: chat.id.user,
          avatar: await waClient.getProfilePicUrl(chat.id._serialized).catch(() => null),
          preview: msgs.length > 0 ? msgs[msgs.length - 1].body : '',
          time: msgs.length > 0 ? new Date(msgs[msgs.length - 1].timestamp * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
          unread: chat.unreadCount,
          tag: 'WhatsApp',
          messages: await Promise.all(msgs.map(async (m, idx) => {
            let mediaData = null;
            // Solo los últimos 5 para evitar que sea muy pesado
            const isRecent = idx >= msgs.length - 5;
            const isSupportedMedia = m.hasMedia && ['image', 'sticker', 'video', 'gif'].includes(m.type);
            
            if (isRecent && isSupportedMedia) {
              try {
                // Implementamos timeout de 5s por media para evitar que se cuelgue el API
                const media = await Promise.race([
                  m.downloadMedia(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (media) {
                  mediaData = `data:${media.mimetype};base64,${media.data}`;
                }
              } catch (e) {
                // Logueamos pero no bloqueamos el retorno de los chats
                if (e.message !== 'Timeout') {
                  console.error(`[WA] Error media (${m.type}):`, e.message);
                }
              }
            }
            return {
              id: m.id._serialized,
              text: m.body,
              sender: m.fromMe ? 'user' : 'wa',
              time: new Date(m.timestamp * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              type: m.type,
              hasMedia: m.hasMedia,
              mediaData: mediaData,
              agentName: agentLog[m.id._serialized] || null
            };
          }))
        };
      } catch (err) {
        console.error(`[API] Error obteniendo mensajes para ${chat.id.user}:`, err.message);
        return {
          id: chat.id._serialized,
          name: chat.name,
          number: chat.id.user,
          preview: '',
          time: '',
          unread: 0,
          tag: 'WhatsApp',
          messages: []
        };
      }
    }));
    res.json(activeChats);
  } catch (e) {
    console.error('[API] ❌ Error crítico en /chats:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/contacts', async (req, res) => {
  if (!waClient || currentStatus !== 'ready') return res.status(503).json({ error: 'WhatsApp no está listo' });
  try {
    const contacts = await waClient.getContacts();
    // Filtrar solo contactos reales (no grupos, no newsletters)
    const filtered = contacts
      .filter(c => c.isMyContact && !c.isGroup && !c.isNewsletter)
      .map(c => ({
        id: c.id._serialized,
        name: c.name || c.pushname || c.number,
        number: c.number
      }));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contactos' });
  }
});

app.post('/send', async (req, res) => {
  const { number, message, agentName } = req.body;
  if (!number || !message) {
    return res.status(400).json({ error: 'number y message son requeridos' });
  }
  if (!waClient || currentStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp no está conectado' });
  }

  try {
    console.log(`[WA] Intentando enviar mensaje a: ${number}...`);
    
    let chatId = number;
    if (!chatId.includes('@')) {
      const contactId = await waClient.getNumberId(number);
      console.log(`[WA] getNumberId para ${number} retorno:`, contactId);
      if (contactId) {
        chatId = contactId._serialized;
      } else {
        chatId = `${number}@c.us`;
      }
    }
    
    console.log(`[WA] Sincronizando chat para: ${chatId}...`);
    const chat = await waClient.getChatById(chatId);
    const sentMsg = await chat.sendMessage(message);
    
    if (agentName && sentMsg && sentMsg.id) {
      agentLog[sentMsg.id._serialized] = agentName;
      saveAgentLog();
    }

    console.log(`[WA] ✅ Mensaje enviado via objeto Chat a ${chatId} (Agente: ${agentName || 'IA'})`);
    
    // Si un agente humano responde, dejamos de esperar opción del bot
    if (number && waitingForOption.has(number)) {
      waitingForOption.delete(number);
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error(`[WA] ❌ Error enviando mensaje a ${number}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/config/auto-response', (req, res) => {
  const { enabled, templateId, content, agentNumber } = req.body;
  autoResponseConfig = { enabled, templateId, content, agentNumber: agentNumber || '' };
  console.log('[WA] Configuración de auto-respuesta actualizada:', autoResponseConfig);
  saveConfig();
  res.json({ ok: true });
});

app.post('/config/menu', (req, res) => {
  const { enabled, options } = req.body;
  menuConfig = { enabled, options };
  console.log('[WA] Configuración de menú actualizada:', menuConfig);
  saveConfig();
  res.json({ ok: true });
});

app.post('/config/keywords', (req, res) => {
  const { enabled, mappings } = req.body;
  keywordConfig = { enabled, mappings: mappings || [] };
  console.log('[WA] Configuración de palabras clave actualizada:', keywordConfig);
  saveConfig();
  res.json({ ok: true });
});

app.get('/config/coordinators', (req, res) => {
  res.json(coordinatorConfig);
});

app.post('/config/coordinators', (req, res) => {
  console.log('[WA] Recibida nueva configuración de coordinadores:', req.body);
  const { efigas, ph, fna, crediorbe, cartera, contact_center, emdata, juridica } = req.body;
  coordinatorConfig = {
    efigas: efigas || coordinatorConfig.efigas,
    ph: ph || coordinatorConfig.ph,
    fna: fna || coordinatorConfig.fna,
    crediorbe: crediorbe || coordinatorConfig.crediorbe,
    cartera: cartera || coordinatorConfig.cartera,
    contact_center: contact_center || coordinatorConfig.contact_center,
    emdata: emdata || coordinatorConfig.emdata,
    juridica: juridica || coordinatorConfig.juridica
  };
  saveConfig();
  res.json({ ok: true, config: coordinatorConfig });
});

app.post('/config/handover/start', (req, res) => {
  const { number, agentName } = req.body;
  if (number) {
    humanAgentSessions.set(number, { 
      agentName: agentName || 'Agente Externo', 
      startTime: Date.now() 
    });
    console.log(`[WA] 👤 Bot silenciado manualmente para: ${number} (Agente: ${agentName})`);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Falta el número' });
  }
});

app.post('/config/handover/reset', (req, res) => {
  const { number } = req.body;
  if (number) {
    humanAgentSessions.delete(number);
    waitingForOption.delete(number); // Allow bot to run welcome flow again
    console.log(`[WA] Bot reactivado para: ${number}`);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'Falta el número' });
  }
});

app.get('/config/handover/sessions', (req, res) => {
  const sessions = {};
  humanAgentSessions.forEach((val, key) => {
    sessions[key] = val;
  });
  res.json(sessions);
});

app.post('/logout', async (req, res) => {
  try {
    console.log('[WA] 🚪 Iniciando cierre de sesión solicitado...');
    if (waClient) {
      try {
        await waClient.logout();
        console.log('[WA] Logout exitoso via API.');
      } catch (e) {
        console.warn('[WA] Error en logout normal, procediendo con destrucción:', e.message);
        try {
          await waClient.destroy();
        } catch (err) {}
      }
      waClient = null;
    }
    
    // Reset state
    currentStatus = 'disconnected';
    currentQR = null;
    connectedNumber = null;
    io.emit('wa:status', { status: 'disconnected' });

    res.json({ ok: true });
    
    // Re-init after a moment
    setTimeout(initWhatsApp, 2000);
  } catch (e) {
    console.error('[WA] Error en logout:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/logout/force', async (req, res) => {
  try {
    console.log('[WA] ⚠️ Forzando cierre de sesión y limpieza de caché...');
    
    // Destroy client with timeout to prevent hanging
    if (waClient) {
      try {
        console.log('[WA] Intentando destruir cliente...');
        const destroyPromise = waClient.destroy();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Destroy timeout')), 5000)
        );
        await Promise.race([destroyPromise, timeoutPromise]);
        console.log('[WA] Cliente destruido exitosamente.');
      } catch (e) {
        console.error('[WA] Error o timeout destruyendo cliente:', e.message);
      }
      waClient = null;
    }

    // Reset state and notify frontend immediately
    currentStatus = 'disconnected';
    currentQR = null;
    connectedNumber = null;
    io.emit('wa:status', { status: 'disconnected' });

    // Give Puppeteer a moment to release file locks before deleting
    setTimeout(() => {
      try {
        const sessionPath = path.join(__dirname, 'wa_session');
        if (fs.existsSync(sessionPath)) {
          // On Windows, sometimes destruction is slow. Try taskkill if possible or just try-catch.
          if (process.platform === 'win32') {
            exec('taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq about:blank"', (err) => {
               // Ignore errors (might not exist)
            });
          }
          
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log('[WA] Cache de sesión (wa_session) eliminado exitosamente.');
        }
      } catch (err) {
        console.warn('[WA] No se pudo borrar wa_session (posiblemente bloqueado):', err.message);
      }
      initWhatsApp();
    }, 4000);
    
    res.json({ ok: true });
  } catch (e) {
    console.error('[WA] Error en reset forzado:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('[Socket] Cliente conectado:', socket.id);
  // Send current state immediately
  socket.emit('wa:status', {
    status: currentStatus,
    qr: currentStatus === 'qr' ? currentQR : null,
    number: connectedNumber
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[WA Service] Corriendo en http://localhost:${PORT}`);
  loadConfig();
  initWhatsApp();
});
// Old background timer removed as timeout is now handled directly via completeFlow()
