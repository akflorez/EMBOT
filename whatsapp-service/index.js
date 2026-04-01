const { exec } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:npg_GuSK6s5WFkRA@ep-royal-dream-akghr3kp-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require",
});

// Probar y inicializar DB
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('[DB] Error de conexión a Neon:', err.message);
  } else {
    console.log('[DB] Conectado exitosamente a Neon PostgreSQL.');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "Messages" (
          "Id" UUID PRIMARY KEY,
          "CreatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      // Asegurar que existan las columnas necesarias (para evitar errores si la tabla ya existía)
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "ContactName" TEXT');
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "PhoneNumber" TEXT');
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "Category" TEXT');
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "Service" TEXT');
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "Portfolio" TEXT');
      await pool.query('ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "Content" TEXT');
      
      console.log('[DB] Tabla Messages verificada/migrada exitosamente.');
    } catch (e) {
      console.error('[DB] Error inicializando tabla:', e.message);
    }
  }
});

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

let businessHours = {
  "1": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }],
  "2": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }],
  "3": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }],
  "4": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }],
  "5": [{ "start": "08:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }],
  "6": [],
  "0": []
};
let customHolidays = []; // Array of strings "YYYY-MM-DD"
let autoHolidaysEnabled = true;

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
      if (data.businessHours) businessHours = data.businessHours;
      if (data.customHolidays) customHolidays = data.customHolidays;
      if (typeof data.autoHolidaysEnabled === 'boolean') autoHolidaysEnabled = data.autoHolidaysEnabled;
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
      coordinatorConfig,
      businessHours,
      customHolidays,
      autoHolidaysEnabled
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
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                headless: true,
                timeout: 0, 
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
                ]
            },
            webVersionCache: {
              type: 'remote',
              remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js'
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
      console.log(`[WA] 📥 Mensaje recibido de ${number}: "${msg.body}"`);

      // CRITICAL: Check if a human agent is already attending
      if (humanAgentSessions.has(number)) {
        console.log(`[WA] 👤 Sesión atendida por humano para ${number}. Ignorando bot.`);
        return;
      }

      const userState = waitingForOption.get(number);
      console.log(`[WA] 🔄 Estado actual para ${number}:`, userState ? userState.state : 'NUEVO');

      let contact = {};
      try {
        contact = await msg.getContact();
      } catch (e) {
        console.error(`[WA] Error obteniendo contacto para ${number}:`, e.message);
      }
      
      const bodyClean = msg.body?.trim().toLowerCase() || '';

      // Secret Developer Command to forcefully clear memory blocks for testing
      if (bodyClean === 'reset cally' || bodyClean === 'reset bot') {
        console.log(`[WA] 🧹 Comando RESET activado para ${number}`);
        humanAgentSessions.delete(number);
        waitingForOption.delete(number);
        await waClient.sendMessage(from, '✅ Memoria del bot reiniciada para este número. Ya puedes probar el flujo de nuevo.');
        return;
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
            const alertMsg = `👤 *CLIENTE:* ${contact.pushname || 'Sin Nombre'}\n📱 *NÚMERO:* +${number}\n\n🔔 *Alerta de Lead (Instagram)*\nEl cliente ha activado la palabra clave: *${match.keyword}*.\n\n🔗 *Chat Directo:* https://wa.me/${number}\n\nPor favor, atiende la conversación en el dashboard.`;
            await sendAlertToAgents(match.agentNumber, alertMsg);
          }
        }
      }

      // Lógica de Festivos en Colombia (Ley Emiliani - Ley 51 de 1983)
      const isColombiaHoliday = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const day = date.getDate();

        // 1. Festivos Fijos (No se mueven)
        const fixedHolidays = [
          { m: 0, d: 1 },   // 1 de Enero
          { m: 4, d: 1 },   // 1 de Mayo
          { m: 6, d: 20 },  // 20 de Julio
          { m: 7, d: 7 },   // 7 de Agosto
          { m: 11, d: 8 },  // 8 de Diciembre
          { m: 11, d: 25 }, // 25 de Diciembre
        ];
        if (autoHolidaysEnabled && fixedHolidays.some(h => h.m === month && h.d === day)) return true;
        
        // 1.5. Custom Holidays (User Defined)
        const dateStr = date.toISOString().split('T')[0];
        if (customHolidays.includes(dateStr)) return true;

        if (!autoHolidaysEnabled) return false;

        // Helper to get Monday after a date
        const getMovedMonday = (m, d) => {
          const dObj = new Date(year, m, d);
          const dayOfWeek = dObj.getDay(); // 0: Sun, 1: Mon
          if (dayOfWeek === 1) return dObj;
          const diff = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          return new Date(year, m, d + diff);
        };

        // 2. Festivos Ley Emiliani (Se mueven al siguiente lunes si no caen lunes)
        const emilianiHolidays = [
          { m: 0, d: 6 },   // Reyes Magos (6 de Enero)
          { m: 2, d: 19 },  // San José (19 de Marzo)
          { m: 5, d: 29 },  // San Pedro y San Pablo (29 de Junio)
          { m: 7, d: 15 },  // Asunción de la Virgen (15 de Agosto)
          { m: 9, d: 12 },  // Día de la Raza (12 de Octubre)
          { m: 10, d: 1 },  // Todos los Santos (1 de Noviembre)
          { m: 10, d: 11 }, // Independencia de Cartagena (11 de Noviembre)
        ];

        for (const h of emilianiHolidays) {
          const moved = getMovedMonday(h.m, h.d);
          if (moved.getMonth() === month && moved.getDate() === day) return true;
        }

        // 3. Festivos basados en Pascua
        const getEasterDate = (y) => {
          const a = y % 19, b = Math.floor(y / 100), c = y % 100;
          const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
          const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
          const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
          const m = Math.floor((a + 11 * h + 22 * l) / 451);
          const month = Math.floor((h + l - 7 * m + 114) / 31);
          const day = ((h + l - 7 * m + 114) % 31) + 1;
          return new Date(y, month - 1, day);
        };

        const easter = getEasterDate(year);
        const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

        // Jueves y Viernes Santo
        const maundyThursday = addDays(easter, -3);
        const goodFriday = addDays(easter, -2);
        if (maundyThursday.getMonth() === month && maundyThursday.getDate() === day) return true;
        if (goodFriday.getMonth() === month && goodFriday.getDate() === day) return true;

        // Festivos móviles movidos a Lunes
        const ascension = getMovedMonday(easter.getMonth(), easter.getDate() + 39);
        const corpusChristi = getMovedMonday(easter.getMonth(), easter.getDate() + 60);
        const sacredHeart = getMovedMonday(easter.getMonth(), easter.getDate() + 68);

        if (ascension.getMonth() === month && ascension.getDate() === day) return true;
        if (corpusChristi.getMonth() === month && corpusChristi.getDate() === day) return true;
        if (sacredHeart.getMonth() === month && sacredHeart.getDate() === day) return true;

        return false;
      };

      const isBusinessHours = () => {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // 1. Validar Festivos de Colombia y Personalizados
        if (isColombiaHoliday(now)) return false;
        
        // 2. Validar Horario Dinámico
        const todaySchedules = businessHours[day] || [];
        if (todaySchedules.length === 0) return false;

        const inRange = todaySchedules.some(range => {
          return currentTime >= range.start && currentTime < range.end;
        });

        return inRange;
      };

      // Helper: Finalize Flow with Internal 5s Delay and Alerting
      const finalizeFlow = async (from, number, state, answers = '') => {
        const contactName = contact.name || contact.pushname || 'Sin Nombre';
        
        // 1. Send Alert to Coordinator immediately (internal)
        let alertMsg = `👤 *CLIENTE:* ${contactName}\n📱 *NÚMERO:* +${number}\n\n🆘 *Alerta de Lead - Cally*\nEl cliente requiere atención humana.\n`;
        alertMsg += `🔗 *Chat Directo:* https://wa.me/${number}\n\n`;
        
        if (state.categoria === 'interesado_servicios') {
          alertMsg += `📌 *Categoría:* Interesado en Servicios\n🛠️ *Servicio:* ${state.servicio}\n`;
        } else if (state.categoria === 'servicio_al_cliente') {
          alertMsg += `📌 *Categoría:* Servicio al Cliente\n📁 *Portafolio:* ${state.portafolio}\n`;
        } else if (state.status === 'fuera_de_horario') {
          alertMsg += `🌙 *Estado:* Fuera de Horario (Datos capturados)\n`;
        }

        if (answers) {
          alertMsg += `✍️ *DATOS CAPTURADOS:*\n${answers}\n`;
        }

        // Determine destination number
        let target = '';
        if (state.portafolio === 'Crediorbe') target = coordinatorConfig.crediorbe;
        else if (state.portafolio === 'Efigas') target = coordinatorConfig.efigas;
        else if (state.portafolio === 'FNA') target = coordinatorConfig.fna;
        else if (state.portafolio === 'Propiedad horizontal') target = coordinatorConfig.ph;
        else if (state.servicio === 'gestion_cartera') target = coordinatorConfig.cartera;
        else if (state.servicio === 'contact_center') target = coordinatorConfig.contact_center;
        else if (state.servicio === 'emdata') target = coordinatorConfig.emdata;
        else if (state.servicio === 'asesoria_juridica') target = coordinatorConfig.juridica;

        if (target) {
          console.log(`[Bot] Enviando alerta a coordinador: ${target}`);
          await sendAlertToAgents(target, alertMsg);
        }

        // --- PERSISTENCIA EN NEON ---
        try {
          const query = `
            INSERT INTO "Messages" ("id", "ContactName", "PhoneNumber", "Category", "Service", "Portfolio", "Content", "timestamp")
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `;
          const values = [
            crypto.randomUUID(),
            contactName,
            number,
            state.categoria || 'lead',
            state.servicio || '',
            state.portafolio || '',
            answers || ''
          ];
          await pool.query(query, values);
          console.log(`[DB] Interaction saved to Neon for ${number}`);
          
          // Emit updated stats for real-time dashboard
          const updatedStats = await getStatsJSON();
          if (updatedStats) {
            io.emit('wa:stats_update', updatedStats);
          }
        } catch (dbErr) {
          console.error('[DB] Error saving message to Neon:', dbErr.message);
        }

        // 2. Internal 5 second delay (not visible to user)
        setTimeout(async () => {
          try {
            await waClient.sendMessage(from, "Gracias por tu información. Pronto uno de nuestros agentes te atenderá 🙌");
          } catch (e) { console.error("[Bot] Error sending final message:", e.message); }
          
          waitingForOption.delete(number);
          humanAgentSessions.set(number, { 
            agentName: "Asignación Automática", 
            startTime: Date.now() 
          });
        }, 5000);
      };

      const inHours = isBusinessHours();
      console.log(`[WA] 🕒 Validación de Horario para ${number}: ¿En horario?: ${inHours} | ¿Es festivo?: ${isColombiaHoliday(new Date())}`);

      // --- OUT OF HOURS LOGIC ---
      if (!inHours) {
        if (!userState || userState.state !== 'OUT_OF_HOURS_COLLECTING_DATA') {
          const outOfHoursMsg = `Hola 👋 gracias por escribirnos a EMDECOB.
En este momento estamos fuera de nuestro horario de atención.

🕗 *Horario de atención:*
Lunes a viernes de 8:00 a. m. a 12:00 m. y de 1:00 p. m. a 5:00 p. m.
No atendemos sábados, domingos ni festivos.

Por favor, déjanos tu *nombre completo* y tu *mensaje*, y te responderemos en nuestro próximo horario hábil 🙌`;
          await waClient.sendMessage(from, outOfHoursMsg);
          waitingForOption.set(number, { state: 'OUT_OF_HOURS_COLLECTING_DATA', status: 'fuera_de_horario', time: new Date() });
          return;
        } else {
          // Saving out of hours data
          console.log(`[Bot] Capturando datos fuera de horario para ${number}: ${msg.body}`);
          await finalizeFlow(from, number, userState, msg.body);
          return;
        }
      }

      // --- IN-HOURS LOGIC (MENU SYSTEM) ---
      if (!userState && !keywordTriggered) {
        // First message in hours
        try {
          const media = MessageMedia.fromFilePath(IMG_WELCOME);
          await waClient.sendMessage(from, media);
        } catch (e) { console.error("[Cally] Error sending welcome img:", e.message); }

        const menuMsg = `Hola 👋 gracias por escribirnos a EMDECOB.

Cuéntanos, ¿en qué podemos ayudarte hoy?

1️⃣ Interesado en nuestros servicios
2️⃣ Servicio al cliente (consulta de deuda)

Responde con el número de la opción 👇`;
        await waClient.sendMessage(from, menuMsg);
        waitingForOption.set(number, { state: 'MAIN_MENU' });
        return;
      }

      if (userState) {
        const body = msg.body.trim().toLowerCase();

        switch (userState.state) {
          case 'MAIN_MENU':
            if (body === '1' || body.includes('servicio')) {
              const servicesMsg = `Perfecto 👌
En EMDECOB contamos con diferentes soluciones para apoyar la gestión y el crecimiento de tu operación.

Selecciona el servicio de tu interés:

1️⃣ Gestión de cartera
2️⃣ Contact center (ventas, servicio o recaudo)
3️⃣ Analítica de datos – EMDATA (Power BI)
4️⃣ Asesoría jurídica

Responde con el número de la opción 👇`;
              await waClient.sendMessage(from, servicesMsg);
              waitingForOption.set(number, { state: 'SERVICES_SUBMENU', categoria: 'interesado_servicios' });
            } else if (body === '2' || body.includes('cliente') || body.includes('deuda')) {
              const portfolioMsg = `Perfecto 👌
Para ayudarte con tu solicitud, selecciona el portafolio:

1️⃣ Crediorbe
2️⃣ Efigas
3️⃣ FNA
4️⃣ Propiedad horizontal

Responde con el número de la opción 👇`;
              await waClient.sendMessage(from, portfolioMsg);
              waitingForOption.set(number, { state: 'CS_PORTFOLIO', categoria: 'servicio_al_cliente' });
            } else {
              await waClient.sendMessage(from, "Por favor responde con el número de una de las opciones disponibles 👇");
            }
            break;

          case 'SERVICES_SUBMENU':
            if (body === '1' || body.includes('gestión') || body.includes('cartera')) {
              await waClient.sendMessage(from, `Perfecto 👌
En EMDECOB te ayudamos a recuperar cartera de forma estratégica, priorizando, segmentando y optimizando cada gestión para lograr resultados reales.

Por favor indícanos:
- tu nombre completo
- si tu cartera es administrativa o jurídica
- de qué sector es`);
              waitingForOption.set(number, { ...userState, state: 'COLLECTING_CARTERA_DATA', servicio: 'gestion_cartera' });
            } else if (body === '2' || body.includes('contact')) {
              await waClient.sendMessage(from, `Perfecto 👌
Nuestro servicio de contact center está enfocado en resultados: ventas, recaudo y servicio al cliente, con procesos estructurados y medición constante.

Por favor indícanos:
- tu nombre completo
- qué deseas mejorar (Ventas, Servicio o Recaudo)`);
              waitingForOption.set(number, { ...userState, state: 'COLLECTING_CONTACT_DATA', servicio: 'contact_center' });
            } else if (body === '3' || body.includes('emdata') || body.includes('analítica')) {
              await waClient.sendMessage(from, `Perfecto 👌
Con EMDATA llevamos tu información a otro nivel con tableros en Power BI y asesoría personalizada.

Por favor indícanos:
- tu nombre completo
- qué te gustaría medir o mejorar en tu negocio`);
              waitingForOption.set(number, { ...userState, state: 'COLLECTING_EMDATA_DATA', servicio: 'emdata' });
            } else if (body === '4' || body.includes('asesoría') || body.includes('jurídica')) {
              await waClient.sendMessage(from, `Perfecto 👌
Sabemos que estos procesos pueden ser complejos, pero con el acompañamiento adecuado todo se vuelve mucho más claro.

En EMDECOB te guiamos paso a paso para proteger tus intereses y avanzar de forma segura.

Por favor indícanos:
- tu nombre completo
- un breve resumen de tu caso`);
              waitingForOption.set(number, { ...userState, state: 'COLLECTING_JURIDICA_DATA', servicio: 'asesoria_juridica' });
            } else {
              await waClient.sendMessage(from, "Por favor responde con el número de una de las opciones disponibles 👇");
            }
            break;

          case 'CS_PORTFOLIO':
            const portfolioMap = {
              "1": "Crediorbe", "crediorbe": "Crediorbe",
              "2": "Efigas", "efigas": "Efigas",
              "3": "FNA", "fna": "FNA",
              "4": "Propiedad horizontal", "ph": "Propiedad horizontal", "propiedad": "Propiedad horizontal"
            };
            const selected = portfolioMap[body];
            if (selected) {
              await waClient.sendMessage(from, `Por favor indícanos:\n\n- tu nombre completo\n- tu número de cédula`);
              waitingForOption.set(number, { ...userState, state: 'COLLECTING_CS_DATA', portafolio: selected, servicio: 'consulta_deuda' });
            } else {
              await waClient.sendMessage(from, `Por favor selecciona correctamente el portafolio:

1️⃣ Crediorbe
2️⃣ Efigas
3️⃣ FNA
4️⃣ Propiedad horizontal

Responde con el número de la opción 👇`);
            }
            break;

          case 'COLLECTING_CARTERA_DATA':
          case 'COLLECTING_CONTACT_DATA':
          case 'COLLECTING_EMDATA_DATA':
          case 'COLLECTING_JURIDICA_DATA':
          case 'COLLECTING_CS_DATA':
            // Robust check: we need enough "information" (just saving what user says for now as per prompt "capture data")
            if (msg.body.length < 5) {
              await waClient.sendMessage(from, "Por favor, para poder ayudarte mejor, bríndanos la información completa solicitada de forma amable 🙌");
            } else {
              await finalizeFlow(from, number, userState, msg.body);
            }
            break;
        }
        return;
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
    console.error('[WA] Error crítico al inicializar el cliente WhatsApp:', err);
    if (err.stack) console.error(err.stack);
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

const getStatsJSON = async () => {
  try {
    const totalLeadsRes = await pool.query('SELECT COUNT(*) FROM "Messages"');
    const categoriesRes = await pool.query('SELECT "Category", COUNT(*) FROM "Messages" GROUP BY "Category"');
    const servicesRes = await pool.query('SELECT "Service", COUNT(*) FROM "Messages" WHERE "Service" != \'\' GROUP BY "Service"');
    const portfoliosRes = await pool.query('SELECT "Portfolio", COUNT(*) FROM "Messages" WHERE "Portfolio" != \'\' GROUP BY "Portfolio"');
    
    return {
      totalLeads: parseInt(totalLeadsRes.rows[0].count),
      categories: categoriesRes.rows.reduce((acc, curr) => ({ ...acc, [curr.Category]: parseInt(curr.count) }), {}),
      services: servicesRes.rows.reduce((acc, curr) => ({ ...acc, [curr.Service]: parseInt(curr.count) }), {}),
      portfolios: portfoliosRes.rows.reduce((acc, curr) => ({ ...acc, [curr.Portfolio]: parseInt(curr.count) }), {})
    };
  } catch (err) {
    console.error('[Stats] Error generated JSON:', err.message);
    return null;
  }
};

app.get('/stats', async (req, res) => {
  const stats = await getStatsJSON();
  if (stats) res.json(stats);
  else res.status(500).json({ error: 'Error fetching statistics' });
});

app.get('/leads', async (req, res) => {
  try {
    const result = await pool.query('SELECT *, "timestamp" as "CreatedAt" FROM "Messages" ORDER BY "timestamp" DESC LIMIT 100');
    const leads = result.rows.map(row => ({
      name: row.ContactName || 'Desconocido',
      phoneNumber: row.PhoneNumber,
      service: row.Service || 'General',
      category: row.Category,
      portfolio: row.Portfolio,
      content: row.Content,
      time: new Date(row.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(row.timestamp).toLocaleDateString('es-MX')
    }));
    res.json(leads);
  } catch (err) {
    console.error('[API] ❌ Error en /leads:', err.message);
    res.status(500).json({ error: 'Error fetching leads', details: err.message });
  }
});

app.get('/agents', async (req, res) => {
  try {
    const query = `
      SELECT u."Name" as name, p.name as portfolio, u."IsActive" as active
      FROM "Users" u
      LEFT JOIN "Portfolios" p ON u."PortfolioId" = p.id
      ORDER BY u."Name" ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('[Agents] Error fetching agents:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query('SELECT *, "timestamp" as "CreatedAt", "id" as "Id" FROM "Messages" ORDER BY "timestamp" DESC LIMIT 10');
    const alerts = result.rows.map(row => ({
      id: row.id,
      title: `Nuevo lead: ${row.ContactName || 'Desconocido'}`,
      description: row.Content ? (row.Content.substring(0, 50) + '...') : `Interesado en ${row.Service || 'General'}`,
      time: new Date(row.timestamp).toLocaleTimeString('es-MX'),
      type: row.Category === 'interesado_servicios' ? 'service' : 'customer'
    }));
    res.json(alerts);
  } catch (err) {
    console.error('[API] ❌ Error en /alerts:', err.message);
    res.status(500).json({ error: 'Error fetching alerts' });
  }
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
        const msgs = await chat.fetchMessages({ limit: 20 });
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
            // Media bulk download has been disabled to prevent extreme latency and timeouts.
            let mediaData = null;
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

app.get('/config/schedules', (req, res) => {
  res.json({ businessHours, customHolidays, autoHolidaysEnabled });
});

app.post('/config/schedules', (req, res) => {
  const { hours, holidays, autoHolidays } = req.body;
  if (hours) businessHours = hours;
  if (holidays) customHolidays = holidays;
  if (typeof autoHolidays === 'boolean') autoHolidaysEnabled = autoHolidays;
  saveConfig();
  res.json({ ok: true });
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

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`[WA Service] Corriendo en puerto ${PORT}`);
  loadConfig();
  initWhatsApp();
});
// Old background timer removed as timeout is now handled directly via completeFlow()
