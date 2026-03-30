import { useState, useEffect, useRef, useCallback } from 'react';
import { WA_API_URL, WA_SOCKET_URL, WA_SOCKET_PATH } from '../config';
import { io, Socket } from 'socket.io-client';
import { Send, Bot, User, Sparkles, Filter, MoreVertical, Search, CheckCircle2, MessageSquare, Wifi, WifiOff, FileText, X, Plus, UserPlus, DollarSign, ArrowRight, Settings, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import botAvatar from '../assets/bot-avatar.png';

type Message = {
  id: string | number;
  text: string;
  sender: 'user' | 'ai' | 'wa';
  time: string;
  intention?: string;
  action?: string;
  type?: string;
  hasMedia?: boolean;
  mediaData?: string;
  agentName?: string;
};

type Thread = {
  id: string; // phone number or identifier
  name: string;
  number: string;
  preview: string;
  time: string;
  tag: string;
  messages: Message[];
  unread: number;
  avatar?: string;
};

// Initial demo thread so inbox isn't empty before real messages arrive
const demoThread: Thread = {
  id: 'demo',
  name: 'Alex Fernández',
  number: 'Demo',
  preview: 'Hola, me gustaría agendar una cita...',
  time: '10:02 AM',
  tag: 'Soporte',
  unread: 0,
  messages: [
    { id: 1, text: "Hola, me gustaría agendar una cita para soporte técnico.", sender: 'user', time: '10:02 AM' },
    { id: 2, text: "¡Hola! Claro que sí, puedo ayudarte. ¿Para qué equipo o servicio necesitas asistencia técnica?", sender: 'ai', time: '10:02 AM', intention: 'Soporte', action: 'Pedir Información' },
    { id: 3, text: "Tengo un problema con el acceso a mi cuenta, me sale error 500.", sender: 'user', time: '10:05 AM' },
    { id: 4, text: "El error 500 suele ser temporal. Basado en tu historial de cuenta Pro, ¿te comunico con un especialista?", sender: 'ai', time: '10:05 AM', intention: 'Soporte Técnico', action: 'Ofrecer opciones' },
  ]
};

const tagColors: Record<string, string> = {
  Soporte: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Ventas: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Cobranza: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500',
  WhatsApp: 'bg-[#25D366]/10 text-[#25D366]',
  default: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export default function Inbox() {
  const [threads, setThreads] = useState<Thread[]>([demoThread]);
  const [activeThreadId, setActiveThreadId] = useState<string>('demo');
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [waConnected, setWaConnected] = useState(false);
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [threadCategories, setThreadCategories] = useState<Record<string, string>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, any>>({});
  const [agentName, setAgentName] = useState<string>(localStorage.getItem('agent_name') || '');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [silencedNumbers, setSilencedNumbers] = useState<string[]>([]); // Keep for legacy compatibility if needed
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ amount: '', date: '', observations: '' });
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('message_templates');
    if (saved) setCustomTemplates(JSON.parse(saved));
    const savedCats = localStorage.getItem('thread_categories');
    if (savedCats) setThreadCategories(JSON.parse(savedCats));
  }, []);

  // Persist threads to cache (lite version without heavy media)
  useEffect(() => {
    if (threads.length > 0) {
      try {
        const toSave = threads
          .filter(t => t.id !== 'demo')
          .map(t => ({
            ...t,
            messages: t.messages.map(m => ({ ...m, mediaData: undefined })) // Remove heavy base64
          }));
        localStorage.setItem('chat_threads_cache', JSON.stringify(toSave));
      } catch (e) {
        console.error('Error saving to cache (likely quota exceeded):', e);
        // If quota exceeded, try saving even less or clear it
        localStorage.removeItem('chat_threads_cache');
      }
    }
  }, [threads]);

  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem('last_active_thread', activeThreadId);
    }
  }, [activeThreadId]);

  const saveCats = (newCats: Record<string, string>) => {
    setThreadCategories(newCats);
    localStorage.setItem('thread_categories', JSON.stringify(newCats));
  };

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(WA_API_URL + '/chats');
      const data = await r.json();
      if (data && Array.isArray(data)) {
        setThreads(prev => {
          const others = data.filter(t => t && t.id && t.id !== 'demo');
          const demo = prev.filter(t => t.id === 'demo');
          return [...others, ...demo];
        });
        setActiveThreadId(currentId => {
          if (data.length > 0 && (!currentId || currentId === 'demo')) {
            return data[0].id;
          }
          return currentId;
        });
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Error fetching chats:', e);
    } finally {
      setLoading(false);
    }
  }, []); // Removed activeThreadId dependency

  useEffect(() => {
    // Connect to whatsapp-service directly for better stability
    const socket = io(WA_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: WA_SOCKET_PATH,
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setWaConnected(true));
    socket.on('disconnect', () => setWaConnected(false));

    socket.on('wa:status', (data: { status: string }) => {
      setWaConnected(data.status === 'ready');
      if (data.status === 'ready') fetchChats();
    });


    // Real incoming WhatsApp message
    socket.on('wa:message', (msg: { id: string; chatId: string; from: string; number: string; text: string; time: string }) => {
      const threadId = msg.chatId;
      const newMsg: Message = {
        id: msg.id,
        text: msg.text,
        sender: 'wa',
        time: msg.time,
      };

      setThreads(prev => {
        const exists = prev.find(t => t.id === threadId);
        if (exists) {
          return prev.map(t =>
            t.id === threadId
              ? { ...t, messages: [...t.messages, newMsg], preview: msg.text, time: msg.time, unread: t.unread + 1 }
              : t
          );
        } else {
          // New contact
          const newThread: Thread = {
            id: threadId,
            name: msg.from,
            number: msg.number,
            preview: msg.text,
            time: msg.time,
            tag: 'WhatsApp',
            unread: 1,
            messages: [newMsg],
          };
          return [newThread, ...prev];
        }
      });

      // Auto-select new thread if none selected or set active
      setActiveThreadId(id => id === 'demo' ? threadId : id);
    });

    const fetchSilenced = async () => {
      try {
        const r = await fetch(WA_API_URL + '/config/handover/sessions');
        const data = await r.json();
        setActiveSessions(data);
        setSilencedNumbers(Object.keys(data));
      } catch {}
    };

    // Load existing messages and chats
    fetchChats();
    fetchSilenced();

    // Poll for silenced status occasionally
    const interval = setInterval(fetchSilenced, 5000);

    return () => { 
      socket.disconnect(); 
      clearInterval(interval);
    };
  }, [fetchChats]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadId, threads]);

  const activeThread = threads.find(t => t.id === activeThreadId) || (threads.length > 0 ? threads[0] : null);

  const filteredThreads = threads.filter(t => {
    if (!t) return false;
    const matchTab = activeTab === 'Todos' || t.tag === activeTab;
    const nameStr = String(t.name || '').toLowerCase();
    const previewStr = String(t.preview || '').toLowerCase();
    const searchStr = String(search || '').toLowerCase();
    const matchSearch = nameStr.includes(searchStr) || previewStr.includes(searchStr);
    return matchTab && matchSearch;
  });

  const [lastSync, setLastSync] = useState<string>('Nunca');

  const handleSend = async () => {
    if (!input.trim() || !activeThread) return;
    const text = input.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistically add message to UI
    const newMsg: Message = { id: Date.now(), text, sender: 'user', time: now };
    setThreads(prev => prev.map(t =>
      t.id === activeThread.id ? { ...t, messages: [...t.messages, newMsg], preview: text, time: now } : t
    ));
    setInput('');

    // Send via WhatsApp if it's a real thread (not the demo)
    if (activeThread.id !== 'demo' && activeThread.number) {
      try {
        const res = await fetch(WA_API_URL + '/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: activeThread.id, message: text, agentName }),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('[Inbox] Error enviando:', err.error);
        }
      } catch (e) {
        console.error('[Inbox] No se pudo conectar al servicio WhatsApp');
      }
    }
  };

  const reactivateBot = async (number: string) => {
    try {
      await fetch(WA_API_URL + '/config/handover/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number })
      });
      setSilencedNumbers(prev => prev.filter(n => n !== number));
    } catch {}
  };

  const silenceBot = async (number: string) => {
    if (!agentName) {
      setShowAgentModal(true);
      return;
    }

    try {
      await fetch(WA_API_URL + '/config/handover/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, agentName: agentName })
      });
      fetchSilenced(); // Refresh sessions
    } catch {}
  };

  const fetchSilenced = async () => {
    try {
      const r = await fetch(WA_API_URL + '/config/handover/sessions');
      const data = await r.json();
      setActiveSessions(data);
      setSilencedNumbers(Object.keys(data));
    } catch {}
  };

  const markRead = (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, unread: 0 } : t));
    setActiveThreadId(id);
  };

  const fetchContacts = async () => {
    try {
      const r = await fetch(WA_API_URL + '/contacts');
      const data = await r.json();
      if (Array.isArray(data)) setContacts(data);
    } catch {}
  };

  const startNewChat = (contact: any) => {
    const existing = threads.find(t => t.id === contact.number);
    if (!existing) {
      const newThread: Thread = {
        id: contact.number,
        name: contact.name,
        number: contact.number,
        preview: 'Nueva conversación',
        time: 'Ahora',
        tag: 'WhatsApp',
        unread: 0,
        messages: []
      };
      setThreads([newThread, ...threads]);
      setActiveThreadId(contact.number);
    } else {
      setActiveThreadId(contact.number);
    }
    setShowNewChatModal(false);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchContact.toLowerCase()) || 
    c.number.includes(searchContact)
  );

  const suggestedTemplates = activeThread ? customTemplates.filter(t => t.category === threadCategories[activeThread.id]) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-text-main">Inteligencia Conversacional</h1>
        <div className="flex items-center gap-2">
          {waConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-full border border-[#25D366]/20">
              <Wifi className="w-3.5 h-3.5" /> WhatsApp Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full border border-red-500/20">
              <WifiOff className="w-3.5 h-3.5" /> WhatsApp Desconectado
            </span>
          )}
          <button 
            onClick={() => fetchChats()}
            className="p-1.5 hover:bg-hover rounded-full text-text-muted transition-colors"
            title="Recargar Chats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 px-3 py-1.5 rounded-full border border-brand-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Autopilot Activo
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">

        {/* Thread List */}
        <Card className="w-80 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-main">Conversaciones</h3>
                  <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-full border border-brand-500/20 font-bold">
                    {threads.length}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">Sincronizado: {lastSync}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { localStorage.removeItem('chat_threads_cache'); fetchChats(); }}
                  className="p-1 text-text-muted hover:text-brand-600 transition-colors"
                  title="Limpiar caché y recargar"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => { setShowNewChatModal(true); fetchContacts(); }}
                  className="p-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg border border-brand-500/20 hover:bg-brand-500 hover:text-text-main transition-all shadow-sm outline-none"
                  title="Nuevo Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar chats..."
                className="w-full bg-surface border border-border-subtle rounded-lg py-2 pl-9 pr-4 text-sm text-text-main placeholder-gray-500 outline-none focus:border-brand-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {['Todos', 'WhatsApp', 'Soporte', 'Ventas'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-border-subtle bg-brand-500/5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Tu Identidad</p>
                  <p className="text-sm font-semibold text-text-main truncate">
                    {agentName || 'Sin Identificar'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAgentModal(true)}
                className="p-1.5 hover:bg-brand-500/20 rounded-lg text-brand-500 transition-colors"
                title="Cambiar Nombre de Agente"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p>Sin conversaciones</p>
                {loading && (
                  <div className="mt-4 flex items-center gap-2 text-brand-500 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Cargando chats...</span>
                  </div>
                )}
                {!loading && (
                  <p className="text-[10px] opacity-50 mt-2">
                    Threads: {threads.length} | Tab: {activeTab} | Search: {search || 'None'}
                  </p>
                )}
              </div>
            )}
            {filteredThreads.map(thread => (
              <div
                key={thread.id}
                onClick={() => markRead(thread.id)}
                className={`p-4 border-b border-border-subtle cursor-pointer transition-colors ${thread.id === activeThreadId ? 'bg-hover border-l-4 border-l-brand-500' : 'hover:bg-card'}`}
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-border-subtle flex-shrink-0 flex items-center justify-center font-bold text-text-muted overflow-hidden relative">
                    {thread.avatar ? (
                      <img src={thread.avatar} className="w-full h-full object-cover" alt={thread.name} />
                    ) : (
                      (thread.name || '??').slice(0, 2).toUpperCase()
                    )}
                    {activeSessions[thread.id] && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface rounded-full shadow-sm" title="Siendo gestionado"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-text-main truncate">{thread.name}</h4>
                        {thread.unread > 0 && (
                          <span className="w-4 h-4 bg-brand-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{thread.unread}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted whitespace-nowrap">{thread.time}</span>
                    </div>
                    <p className="text-xs text-text-muted truncate mb-1">{thread.preview}</p>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${tagColors[thread.tag] || tagColors.default}`}>{thread.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-w-0">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-bold text-text-muted border border-border-subtle overflow-hidden">
                    {activeThread?.avatar ? (
                      <img src={activeThread.avatar} className="w-full h-full object-cover" alt={activeThread.name} />
                    ) : (
                      ((activeThread?.name || activeThread?.number || '??')).slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-text-main font-medium">{activeThread?.name}</h2>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-brand-600 dark:text-brand-400">
                        {activeThread?.number !== 'Demo' ? `+${activeThread?.number}` : 'Demo'} •
                        {waConnected ? <span className="text-[#25D366]"> WhatsApp activo</span> : ' Offline'}
                      </p>
                      {activeThread?.id && activeSessions[activeThread.id] && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase italic">
                          Gestionado por: {activeSessions[activeThread.id].agentName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeThread?.number && (
                    <button
                      onClick={() => (activeThread?.number && silencedNumbers.includes(activeThread.number)) ? reactivateBot(activeThread.number) : (activeThread?.number && silenceBot(activeThread.number))}
                      className={`${(activeThread?.number && silencedNumbers.includes(activeThread.number)) ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20' : 'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20'} text-text-main px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2`}
                    >
                      {activeThread?.number && silencedNumbers.includes(activeThread.number) ? (
                        <>
                          <User className="w-4 h-4" /> Control Humano
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" /> Bot Activo
                        </>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAgentModal(true)}
                    className="text-text-muted hover:text-text-main p-1 hover:bg-hover rounded-full transition-colors"
                    title="Configurar Nombre de Agente"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Handover Warning Banner */}
              {activeThread?.number && silencedNumbers.includes(activeThread.number) && (
                <div className="bg-brand-500/10 border-b border-brand-500/20 p-3 flex items-center justify-between animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <div>
                      <p className="text-xs font-semibold text-text-main">
                        Atención Humana por {activeSessions[activeThread.id]?.agentName || 'Agente'}
                      </p>
                      <p className="text-[10px] text-text-muted">El chatbot está silenciado para este contacto.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => reactivateBot(activeThread.number)}
                    className="text-[10px] font-bold uppercase tracking-wider bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition-all"
                  >
                    Reactivar Chatbot
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-transparent to-[#14161b]/30">
                {(!activeThread || !activeThread.messages || activeThread.messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin mensajes aún</p>
                  </div>
                )}
                {activeThread?.messages?.map(msg => (
                  <div key={msg.id} className={`flex gap-4 ${msg.sender !== 'ai' ? 'justify-end' : ''}`}>
                    {msg.sender === 'ai' && (
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-white flex-shrink-0 flex items-center justify-center mt-1 shadow-[0_0_15px_rgba(99,102,241,0.25)] border-2 border-brand-500/20 px-1">
                        <img src={botAvatar} alt="Bot" className="w-[85%] h-[85%] object-contain" />
                      </div>
                    )}

                    <div className={`flex flex-col gap-1 max-w-[75%] ${msg.sender !== 'ai' ? 'items-end' : 'items-start'}`}>
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">Cally</span>
                          <span className="text-[10px] text-text-muted">{msg.time}</span>
                        </div>
                      )}
                      {(msg.sender === 'wa' || msg.sender === 'user') && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-text-muted">{activeThread.name}</span>
                          <span className="text-[10px] text-gray-600">{msg.time}</span>
                        </div>
                      )}

                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === 'ai'
                          ? 'bg-hover text-text-main border border-border-subtle rounded-tl-sm'
                          : msg.sender === 'wa'
                          ? 'bg-[#25D366]/10 text-text-main border border-[#25D366]/20 rounded-tr-sm'
                          : 'bg-surface text-text-main border border-border-subtle rounded-tr-sm'
                      }`}>
                        {msg.type === 'sticker' && msg.mediaData ? (
                          <div className="flex flex-col items-center">
                            <img src={msg.mediaData} className="w-32 h-32 object-contain" alt="Sticker" />
                          </div>
                        ) : (msg.type === 'image' || msg.type === 'video' || msg.type === 'gif' || msg.type === 'ptv') && msg.mediaData ? (
                          <div className="space-y-2">
                            {msg.type === 'image' ? (
                              <img src={msg.mediaData} className="max-w-full rounded-lg border border-border-subtle shadow-sm" alt="WhatsApp Image" />
                            ) : (
                              <video src={msg.mediaData} controls={msg.type !== 'gif'} autoPlay={msg.type === 'gif'} loop={msg.type === 'gif'} muted={msg.type === 'gif'} className="max-w-full rounded-lg border border-border-subtle shadow-sm" />
                            )}
                            {msg.text && <p>{msg.text}</p>}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {msg.text && <p>{msg.text}</p>}
                            {msg.hasMedia && !msg.mediaData && (
                              <div className="flex items-center gap-1.5 text-[11px] text-brand-600 dark:text-brand-400 bg-brand-500/10 px-3 py-2 rounded-lg border border-brand-500/20 font-medium">
                                <span className="text-lg">📷</span> <span>Archivo Multimedia Recibido (Ver en app)</span>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.agentName && (
                          <div className="mt-2 pt-1 border-t border-brand-500/20 text-[10px] italic opacity-70 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" /> 
                            <span>Agente: {msg.agentName}</span>
                          </div>
                        )}
                        
                        {msg.action === 'Registrar Acuerdo' && (
                          <div className="mt-3 p-3 bg-surface border border-border-subtle rounded-xl text-left border-l-4 border-l-emerald-500 shadow-sm shadow-emerald-500/10">
                            <h5 className="font-semibold text-text-main flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Nuevo Acuerdo Registrado</h5>
                            <p className="text-text-muted text-xs mt-1">El asesor ha fijado un compromiso de pago. Queda registrado en la billetera del contacto.</p>
                            <div className="flex gap-4 mt-2 mb-1">
                              <div><span className="text-text-muted text-[10px] block">Monto a Pagar</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">$1,500 MXN</span></div>
                              <div><span className="text-text-muted text-[10px] block">Fecha de Pago</span><span className="text-text-main font-medium">30 Mar 2026</span></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {msg.sender === 'ai' && msg.intention && (
                        <div className="flex gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface px-2 py-1 rounded">
                            <Filter className="w-3 h-3 text-emerald-600 dark:text-emerald-500" /> Intención: {msg.intention}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface px-2 py-1 rounded">
                            <CheckCircle2 className="w-3 h-3 text-blue-500" /> Acción: {msg.action}
                          </span>
                        </div>
                      )}
                    </div>

                    {(msg.sender === 'wa' || msg.sender === 'user') && (
                      <div className="w-8 h-8 rounded-full bg-hover border border-border-subtle flex-shrink-0 flex items-center justify-center text-text-muted mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border-subtle bg-card relative">
                {suggestedTemplates.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 p-3 flex gap-2 overflow-x-auto no-scrollbar bg-gradient-to-t from-[#181b21] to-transparent">
                    {suggestedTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setInput(t.content)}
                        className="flex-shrink-0 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-text-main transition-all shadow-sm"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                
                {showTemplates && (
                  <div className="absolute bottom-full left-4 mb-2 w-64 bg-hover border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                    <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-surface">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Plantillas Rápidas</span>
                      <button onClick={() => setShowTemplates(false)} className="text-text-muted hover:text-text-main"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {customTemplates.length === 0 ? (
                        <div className="p-4 text-center text-xs text-text-muted">No hay plantillas guardadas</div>
                      ) : (
                        customTemplates.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setInput(t.content); setShowTemplates(false); }}
                            className="w-full text-left p-3 hover:bg-brand-500/10 border-b border-border-subtle last:border-0 transition-colors group"
                          >
                            <div className="text-xs font-medium text-text-main group-hover:text-brand-600 dark:text-brand-400">{t.name}</div>
                            <div className="text-[10px] text-text-muted line-clamp-1">{t.content}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${showTemplates ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400' : 'bg-surface border-border-subtle text-text-muted hover:border-brand-500/50 hover:text-text-main'}`}
                    title="Plantillas de respuesta"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder={(activeThread.number && silencedNumbers.includes(activeThread.number)) ? "Escribe tu respuesta..." : "La IA gestiona este chat. Escribe para sugerir..."}
                    className="flex-1 bg-surface border border-border-subtle rounded-xl py-3 px-4 text-sm text-text-main placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button
                    onClick={handleSend}
                    className="bg-brand-600 hover:bg-brand-500 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-brand-500/20"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
                <div className="mt-2 flex justify-between items-center px-1">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {(activeThread.number && silencedNumbers.includes(activeThread.number)) ? 'Estás en control de este chat.' : 'Eres un observador. La IA responderá automáticamente.'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Selecciona una conversación</p>
              </div>
            </div>
          )}
        </Card>

        {/* CRM Context Panel */}
        {activeThread && (
          <Card className="w-72 flex flex-col flex-shrink-0 hidden xl:flex">
            <div className="p-4 border-b border-border-subtle bg-card">
              <h3 className="font-semibold text-text-main">Contexto CRM</h3>
            </div>
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Contacto</h4>
                <div className="space-y-2">
                  <div><span className="text-xs text-text-muted block">Nombre</span><span className="text-sm font-medium text-text-main">{activeThread?.name || '---'}</span></div>
                  {activeThread?.number !== 'Demo' && activeThread?.number && (
                    <div><span className="text-xs text-text-muted block">WhatsApp</span><span className="text-sm text-emerald-600 dark:text-emerald-500">+{activeThread.number}</span></div>
                  )}
                  <div>
                    <span className="text-xs text-text-muted block">Canal</span>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${tagColors[activeThread?.tag || ''] || tagColors.default}`}>{activeThread?.tag || 'Desconocido'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Mensajes</span>
                    <span className="text-sm text-text-main">{activeThread?.messages?.length || 0}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-xs text-text-muted block mb-2">Categoría del Chat</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['Soporte', 'Ventas', 'Cobranza', 'Citas'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => saveCats({ ...threadCategories, [activeThread.id]: cat })}
                          className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all ${
                            threadCategories[activeThread.id] === cat 
                              ? 'bg-brand-500/20 border-brand-500 text-brand-600 dark:text-brand-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                              : 'bg-dark-bg border-dark-border text-text-muted hover:border-brand-500/40 hover:text-text-muted'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-px bg-[#272a30] w-full" />
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Gestión de Cobranza</h4>
                <button 
                  onClick={() => setShowAgreementModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/50"
                >
                  <DollarSign className="w-4 h-4" /> Registrar Acuerdo
                </button>
              </div>

              <div className="h-px bg-[#272a30] w-full" />
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Insights IA</h4>
                <div className="p-3 bg-surface rounded-lg border border-border-subtle">
                  <span className="text-xs text-text-muted block mb-1">Último mensaje</span>
                  <span className="text-sm text-text-muted">{activeThread.preview}</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-brand-500/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Nueva Conversación
              </h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-text-muted hover:text-text-main transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre o número..."
                className="w-full bg-surface border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm italic">
                  No se encontraron contactos en tu WhatsApp.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => startNewChat(contact)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-500/10 hover:border-brand-500/20 border border-transparent transition-all group text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-text-main group-hover:border-brand-500 transition-all font-bold">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-main group-hover:text-brand-600 dark:text-brand-400 transition-colors">{contact.name}</div>
                        <div className="text-xs text-text-muted">+{contact.number}</div>
                      </div>
                      <Plus className="w-4 h-4 text-gray-600 group-hover:text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-dark-border text-center">
              <p className="text-[10px] text-gray-600">
                Solo se muestran contactos sincronizados con tu cuenta de WhatsApp corporativa.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Agent Identity Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-sm p-8 shadow-2xl border-brand-500/30 bg-[#14161b] relative overflow-hidden">
             {/* Decorative Background */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl opacity-50" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-6 border border-brand-500/20 shadow-lg shadow-brand-500/5">
                <User className="w-8 h-8 text-brand-500" />
              </div>
              
              <h3 className="text-xl font-black text-text-main mb-2 tracking-tight">Identificación de Agente</h3>
              <p className="text-xs text-text-muted mb-8 leading-relaxed max-w-[240px]">
                Ingresa tu nombre para registrar tu gestión en esta conversación y silenciar al bot.
              </p>

              <div className="w-full space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Tu nombre o usuario..."
                    className="w-full bg-surface border border-border-subtle rounded-xl py-4 pl-12 pr-4 text-sm text-text-main focus:border-brand-500 outline-none transition-all shadow-inner shadow-black/20"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && agentName.trim()) {
                        localStorage.setItem('agent_name', agentName);
                        setShowAgentModal(false);
                        if (activeThread?.number) {
                           const startHandover = async () => {
                             await fetch(WA_API_URL + '/config/handover/start', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ number: activeThread.number, agentName: agentName })
                             });
                             fetchSilenced();
                           };
                           startHandover();
                        }
                      }
                    }}
                    autoFocus
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!agentName.trim()) return;
                    localStorage.setItem('agent_name', agentName);
                    setShowAgentModal(false);
                    if (activeThread?.number) {
                        try {
                          await fetch(WA_API_URL + '/config/handover/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ number: activeThread.number, agentName: agentName })
                          });
                          fetchSilenced();
                        } catch {}
                    }
                  }}
                  disabled={!agentName.trim()}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-text-muted text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-500/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  Confirmar Gestión <ArrowRight className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={() => setShowAgentModal(false)}
                  className="w-full text-xs text-text-muted hover:text-text-main transition-colors py-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Agreement Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-6 shadow-2xl border-emerald-500/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Registrar Acuerdo
              </h3>
              <button 
                onClick={() => setShowAgreementModal(false)}
                className="p-1 text-text-muted hover:text-text-main transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Monto a Pagar ($)</label>
                <input
                  type="number"
                  placeholder="Ej. 1500"
                  className="w-full bg-surface border border-border-subtle rounded-xl py-2 px-3 text-sm text-text-main focus:border-emerald-500 outline-none"
                  value={agreementForm.amount}
                  onChange={e => setAgreementForm({...agreementForm, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Fecha de Compromiso</label>
                <input
                  type="date"
                  className="w-full bg-surface border border-border-subtle rounded-xl py-2 px-3 text-sm text-text-main focus:border-emerald-500 outline-none"
                  value={agreementForm.date}
                  onChange={e => setAgreementForm({...agreementForm, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Observaciones</label>
                <textarea
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full bg-surface border border-border-subtle rounded-xl py-2 px-3 text-sm text-text-main focus:border-emerald-500 outline-none resize-none"
                  value={agreementForm.observations}
                  onChange={e => setAgreementForm({...agreementForm, observations: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => {
                  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const newMsg: Message = { 
                    id: Date.now(), 
                    text: `He generado el acuerdo por $${agreementForm.amount} con fecha ${agreementForm.date}. Se te notificará cuando esté próximo el vencimiento. ${agreementForm.observations}`, 
                    sender: 'user', 
                    time: now,
                    action: 'Registrar Acuerdo'
                  };
                  setThreads(prev => prev.map(t =>
                    t.id === activeThreadId ? { ...t, messages: [...t.messages, newMsg], preview: `Acuerdo: $${agreementForm.amount}`, time: now } : t
                  ));
                  // Aqui iria POST a /api/v1/agreements
                  setShowAgreementModal(false);
                  setAgreementForm({amount: '', date: '', observations: ''});
                }}
                disabled={!agreementForm.amount || !agreementForm.date}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-text-muted text-text-main font-medium py-2 rounded-xl transition-colors"
              >
                Confirmar Acuerdo
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
