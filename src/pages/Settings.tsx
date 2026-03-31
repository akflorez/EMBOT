import { useState, useEffect, useRef } from 'react';
import { WA_API_URL, WA_SOCKET_URL, WA_SOCKET_PATH } from '../config';
import { io, Socket } from 'socket.io-client';
import { Smartphone, CheckCircle2, RefreshCw, AlertCircle, ShieldCheck, Key, Settings as SettingsIcon, Wifi, WifiOff, QrCode } from 'lucide-react';

// const STORAGE_KEY = 'wa_qr_settings';

type WAStatus = 'disconnected' | 'qr' | 'authenticated' | 'ready';

export default function Settings() {
  const [waStatus, setWaStatus] = useState<WAStatus>('disconnected');
  const [waQR, setWaQR] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState(false);
  const [statusAPI, setStatusAPI] = useState<'disconnected' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [settings, setSettings] = useState({
    companyId: '00000000-0000-0000-0000-000000000000',
    basePrompt: '',
    whatsAppPhoneId: '',
    whatsAppBusinessAccountId: '',
    whatsAppAccessToken: '',
    whatsAppVerifyToken: '',
    whatsAppMode: 'Redirect',
    whatsAppNumber: ''
  });
  const [coordinators, setCoordinators] = useState({
    efigas: '',
    ph: '',
    fna: '',
    crediorbe: '',
    cartera: '',
    contact_center: '',
    emdata: '',
    juridica: ''
  });

  const [schedules, setSchedules] = useState<{
    businessHours: Record<string, { start: string, end: string }[]>;
    customHolidays: string[];
    autoHolidaysEnabled: boolean;
  }>({
    businessHours: {
      "1": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
      "2": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
      "3": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
      "4": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
      "5": [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
      "6": [],
      "0": []
    },
    customHolidays: [],
    autoHolidaysEnabled: true
  });

  // Connect to whatsapp microservice via socket.io
  useEffect(() => {
    const socket = io(WA_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: WA_SOCKET_PATH,
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setServiceOnline(true);
    });

    socket.on('disconnect', () => {
      setServiceOnline(false);
    });

    socket.on('wa:status', (data: { status: WAStatus; qr?: string; number?: string }) => {
      setWaStatus(data.status);
      if (data.qr) setWaQR(data.qr);
      if (data.status === 'ready') {
        setWaQR(null);
        setWaNumber(data.number || null);
      }
      if (data.status === 'disconnected') {
        setWaNumber(null);
      }
    });

    fetchSettings();
    fetchCoordinators();
    fetchSchedules();
    return () => { socket.disconnect(); };
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch(WA_API_URL + '/config/schedules');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch {}
  };

  const fetchCoordinators = async () => {
    try {
      const response = await fetch(WA_API_URL + '/config/coordinators');
      if (response.ok) {
        const data = await response.json();
        setCoordinators(data);
      }
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/Settings/00000000-0000-0000-0000-000000000000');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
        if (data.whatsAppAccessToken && data.whatsAppPhoneId) setStatusAPI('connected');
      }
    } catch {}
  };

  const handleSave = async () => {
    setLoading(true);
    let crmSuccess = false;
    let waSuccess = false;

    // 1. Try Saving to CRM Backend
    try {
      const response = await fetch('/api/Settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        crmSuccess = true;
        if (settings.whatsAppMode === 'CloudAPI' && settings.whatsAppAccessToken) setStatusAPI('connected');
      }
    } catch (e) {
      console.error('CRM Save Error:', e);
    }

    // 2. Try Saving to WhatsApp Service (Coordinators)
    try {
      const waResp = await fetch(WA_API_URL + '/config/coordinators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coordinators),
      });
      if (waResp.ok) waSuccess = true;
    } catch (e) {
      console.error('WhatsApp Service Save Error:', e);
    }

    // 3. Try Saving to WhatsApp Service (Schedules)
    try {
      const schResp = await fetch(WA_API_URL + '/config/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: schedules.businessHours,
          holidays: schedules.customHolidays,
          autoHolidays: schedules.autoHolidaysEnabled
        }),
      });
      if (schResp.ok) { /* schedules saved */ }
    } catch (e) {
      console.error('WhatsApp Schedules Save Error:', e);
    }

    // 4. Final Feedback
    if (crmSuccess && waSuccess) {
      alert('¡Éxito! Toda la configuración ha sido guardada.');
    } else if (waSuccess && !crmSuccess) {
      alert('Configuración guardada correctamente.');
    } else {
      alert('Hubo un problema al guardar algunos cambios.');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar la sesión de WhatsApp?')) return;
    setLoading(true);
    try {
      const resp = await fetch(WA_API_URL + '/logout', { method: 'POST' });
      if (resp.ok) {
        setWaStatus('disconnected');
        setWaQR(null);
        setWaNumber(null);
      } else {
        throw new Error('Logout failed');
      }
    } catch {
      // If regular logout fails, offer force reset
      if (confirm('El cierre de sesión normal falló. ¿Deseas forzar el cierre y limpiar la caché?')) {
        await handleForceReset();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceReset = async () => {
    if (confirm('⚠️ ¿Estás seguro de realizar un Reset Total?\n\nEsto cerrará la sesión actual y ELIMINARÁ la caché de conexión. Úsalo si no se ven los chats o si el bot parece bloqueado. El sistema generará un nuevo QR.')) {
      setLoading(true);
      try {
        const resp = await fetch(WA_API_URL + '/logout/force', { method: 'POST' });
        if (resp.ok) {
          setWaStatus('disconnected');
          setWaQR(null);
          setWaNumber(null);
          alert('Caché eliminada. El sistema se reiniciará para generar un nuevo código QR.');
          window.location.reload();
        }
      } catch {
        alert('Error al intentar el reset forzado');
      } finally {
        setLoading(false);
      }
    }
  };

  const statusLabel: Record<WAStatus, string> = {
    disconnected: 'Desconectado',
    qr: 'Esperando escaneo...',
    authenticated: 'Autenticando...',
    ready: `Conectado ✓`,
  };

  const statusColor: Record<WAStatus, string> = {
    disconnected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    qr: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    authenticated: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    ready: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h1 className="text-2xl font-bold tracking-tight text-text-main mb-6 flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-brand-500" />
        Configuración del Sistema
      </h1>

      {/* Schedules & Holidays - MOVED TO TOP FOR VISIBILITY */}
      <div className="glass-panel rounded-xl p-6 mb-6 border-2 border-brand-500/20">
        <h2 className="text-xl text-text-main font-semibold mb-2 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          Horarios y Festivos
        </h2>
        <p className="text-xs text-text-muted mb-6">Define cuándo debe responder el bot inteligentemente y cuándo debe capturar datos fuera de horario.</p>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => {
              const dayIdx = (idx + 1) % 7;
              const hasHours = schedules.businessHours[dayIdx]?.length > 0;
              return (
                <div key={dayIdx} className="bg-surface border border-border-subtle rounded-xl p-4 transition-all hover:border-brand-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-text-main">{dayName}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={hasHours}
                        onChange={() => {
                          const newHours = { ...schedules.businessHours };
                          if (hasHours) newHours[dayIdx] = [];
                          else newHours[dayIdx] = [{ start: "08:00", end: "17:00" }];
                          setSchedules({ ...schedules, businessHours: newHours });
                        }}
                      />
                      <div className="w-9 h-5 bg-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                  {hasHours ? (
                    <div className="space-y-2">
                      {schedules.businessHours[dayIdx].map((range, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-2">
                          <input 
                            type="time" 
                            className="bg-transparent text-[11px] text-text-main w-full border-0 focus:ring-0 p-0"
                            value={range.start}
                            onChange={e => {
                              const newHours = { ...schedules.businessHours };
                              newHours[dayIdx][rIdx].start = e.target.value;
                              setSchedules({ ...schedules, businessHours: newHours });
                            }}
                          />
                          <span className="text-text-muted italic">-</span>
                          <input 
                            type="time" 
                            className="bg-transparent text-[11px] text-text-main w-full border-0 focus:ring-0 p-0"
                            value={range.end}
                            onChange={e => {
                              const newHours = { ...schedules.businessHours };
                              newHours[dayIdx][rIdx].end = e.target.value;
                              setSchedules({ ...schedules, businessHours: newHours });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle/50 pt-6">
            <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand-500" />
              Gestión de Festivos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={schedules.autoHolidaysEnabled}
                      onChange={e => setSchedules({ ...schedules, autoHolidaysEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-text-main group-hover:text-emerald-500 transition-colors">Festivos Automáticos (Colombia)</span>
                    <p className="text-[11px] text-text-muted">Incluye automáticamente Ley Emiliani y fechas religiosas.</p>
                  </div>
                </label>
              </div>
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Días No Laborales Adicionales</span>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    id="new-holiday"
                    className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:border-brand-500 outline-none"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('new-holiday') as HTMLInputElement;
                      if (input?.value && !schedules.customHolidays.includes(input.value)) {
                        setSchedules(prev => ({ ...prev, customHolidays: [...prev.customHolidays, input.value] }));
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-500 transition-all shadow-md active:scale-95"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {schedules.customHolidays.map((holiday, hIdx) => (
                    <span key={hIdx} className="bg-surface border border-border-subtle px-3 py-1.5 rounded-full text-[11px] text-text-main flex items-center gap-2 group hover:border-red-500/50 transition-all shadow-sm">
                      {holiday}
                      <button 
                        onClick={() => setSchedules(prev => ({ ...prev, customHolidays: prev.customHolidays.filter((_, i) => i !== hIdx) }))}
                        className="text-text-muted hover:text-red-500 font-bold px-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coordinators Management */}
      <div className="glass-panel rounded-xl p-6 mb-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Smartphone className="w-20 h-20" />
        </div>
        <h2 className="text-xl text-text-main font-semibold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          Gestión de Coordinadores (Cally)
        </h2>
        <p className="text-xs text-text-muted mb-6">Configura los números de WhatsApp que recibirán las alertas según el portafolio seleccionado por el cliente.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lado Izquierdo */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Manejo de Cartera</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.cartera}
                onChange={e => setCoordinators({ ...coordinators, cartera: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Contact Center</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.contact_center}
                onChange={e => setCoordinators({ ...coordinators, contact_center: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Efigas</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.efigas}
                onChange={e => setCoordinators({ ...coordinators, efigas: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Propiedad Horizontal</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.ph}
                onChange={e => setCoordinators({ ...coordinators, ph: e.target.value })}
                placeholder="57300..."
              />
            </div>
          </div>

          {/* Lado Derecho */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">EMDATA (Analítica)</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.emdata}
                onChange={e => setCoordinators({ ...coordinators, emdata: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Asesoría Jurídica</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.juridica}
                onChange={e => setCoordinators({ ...coordinators, juridica: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">FNA</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.fna}
                onChange={e => setCoordinators({ ...coordinators, fna: e.target.value })}
                placeholder="57300..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Crediorbe</label>
              <input
                type="text"
                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-sm text-text-main focus:border-brand-500 outline-none transition-all"
                value={coordinators.crediorbe}
                onChange={e => setCoordinators({ ...coordinators, crediorbe: e.target.value })}
                placeholder="57300..."
              />
            </div>
          </div>
        </div>
      </div>


      {/* System Prompt */}
      <div className="glass-panel rounded-xl p-6 mb-6">
        <h2 className="text-xl text-text-main font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          Prompt Base (IA)
        </h2>
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">System Prompt</label>
          <textarea
            className="w-full bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-muted h-64 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
            value={settings.basePrompt}
            onChange={e => setSettings({ ...settings, basePrompt: e.target.value })}
            placeholder="Define el comportamiento del bot aquí..."
          />
        </div>
      </div>

      {/* WhatsApp Integration */}
      <div className="glass-panel rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-text-main font-semibold flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#25D366]" />
            Integración WhatsApp
          </h2>
          <div className="flex items-center gap-2">
            {serviceOnline ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <Wifi className="w-3 h-3" /> Servicio activo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                <WifiOff className="w-3 h-3" /> Servicio offline
              </span>
            )}
          </div>
        </div>

        <div className="flex bg-surface p-1 rounded-lg border border-border-subtle mb-8 w-fit">
          <button
            onClick={() => setSettings({ ...settings, whatsAppMode: 'Redirect' })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.whatsAppMode === 'Redirect' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-text-main'}`}
          >
            Modo Bot (Celular)
          </button>
          <button
            onClick={() => setSettings({ ...settings, whatsAppMode: 'CloudAPI' })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${settings.whatsAppMode === 'CloudAPI' ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-text-main'}`}
          >
            Modo API (Meta Oficial)
          </button>
        </div>

        {settings.whatsAppMode === 'Redirect' ? (
          <div className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col md:flex-row gap-8 items-center">
            {/* Left: Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-text-main flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Vinculación con WhatsApp
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Escanea el QR de la derecha con tu celular para conectar el bot a tu número de WhatsApp.
                </p>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Estado:</span>
                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${statusColor[waStatus]}`}>
                  {waStatus === 'ready' && <CheckCircle2 className="w-3 h-3" />}
                  {waStatus === 'qr' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {waStatus === 'disconnected' && <AlertCircle className="w-3 h-3" />}
                  {statusLabel[waStatus]}
                </span>
              </div>

              {waNumber && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-xs text-text-muted">Número vinculado</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{waNumber}</p>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
                <div className="flex items-center gap-2 mb-1 font-bold">
                  <AlertCircle className="w-4 h-4" /> Instrucciones
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abre WhatsApp en tu celular</li>
                  <li>Ve a <strong>Dispositivos vinculados</strong></li>
                  <li>Toca <strong>Vincular dispositivo</strong></li>
                  <li>Escanea el QR de la derecha</li>
                </ol>
              </div>

              {!serviceOnline && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
                  <div className="flex items-center gap-2 font-bold mb-1"><WifiOff className="w-4 h-4" /> Servicio WhatsApp offline</div>
                  Ejecuta el servicio con:<br />
                  <code className="font-mono bg-surface px-1.5 py-0.5 rounded text-brand-300 block mt-1">cd whatsapp-service && node index.js</code>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleLogout} 
                  disabled={loading}
                  className="w-full py-2.5 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-red-600/20 transition-all text-sm font-semibold"
                >
                  Desconectar WhatsApp
                </button>
                <button 
                  onClick={handleForceReset} 
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600/10 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl border border-amber-600/20 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  Reset Total (Limpiar Caché y QR Nuevo)
                </button>
              </div>
            </div>

            {/* Right: QR */}
            <div className="relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-emerald-600 text-[10px] font-bold text-text-main px-3 py-0.5 rounded-full shadow-lg">
                {waStatus === 'ready' ? 'CONECTADO' : 'ESCANEA AQUÍ'}
              </div>
              <div className="w-64 h-64 bg-white rounded-xl p-4 flex items-center justify-center shadow-sm border-2 border-emerald-500/20 transition-all group-hover:shadow-emerald-500/10">
                {waStatus === 'ready' ? (
                  <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-500">
                    <CheckCircle2 className="w-20 h-20 mb-3" />
                    <p className="text-sm font-bold text-gray-800">¡Conectado!</p>
                    <p className="text-xs text-text-muted mt-1">+{waNumber}</p>
                  </div>
                ) : waQR ? (
                  <img src={waQR} alt="WhatsApp QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-center text-text-muted">
                    <QrCode className="w-14 h-14 mb-3 opacity-30" />
                    <p className="text-xs text-text-muted">
                      {serviceOnline ? 'Generando QR...' : 'Inicia el servicio WhatsApp para ver aquí el QR'}
                    </p>
                    {serviceOnline && <RefreshCw className="w-4 h-4 animate-spin mt-2 opacity-50" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Cloud API Mode */
          <div className="bg-surface border border-border-subtle rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-text-main flex items-center gap-2">
                  <Key className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  Configuración API Oficial (Meta)
                </h3>
                <p className="text-xs text-text-muted">Automatización masiva con la API oficial de WhatsApp Business.</p>
              </div>
              {statusAPI === 'connected' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Bot Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  <AlertCircle className="w-4 h-4" /> Bot Desconectado
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Phone Number ID</label>
                <input type="text" className="w-full bg-[#0d0f12] border border-border-subtle rounded-lg p-2.5 text-sm text-text-muted focus:border-brand-500 outline-none"
                  value={settings.whatsAppPhoneId} onChange={e => setSettings({ ...settings, whatsAppPhoneId: e.target.value })} placeholder="10654321..." />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Business Account ID</label>
                <input type="text" className="w-full bg-[#0d0f12] border border-border-subtle rounded-lg p-2.5 text-sm text-text-muted focus:border-brand-500 outline-none"
                  value={settings.whatsAppBusinessAccountId} onChange={e => setSettings({ ...settings, whatsAppBusinessAccountId: e.target.value })} placeholder="987654321..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Access Token</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="password" className="w-full bg-[#0d0f12] border border-border-subtle rounded-lg p-2.5 pl-10 text-sm text-text-muted focus:border-brand-500 outline-none"
                    value={settings.whatsAppAccessToken} onChange={e => setSettings({ ...settings, whatsAppAccessToken: e.target.value })} placeholder="EAAGz..." />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button onClick={handleSave} disabled={loading}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full shadow-2xl font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          Guardar Configuración
        </button>
      </div>
    </div>
  );
}
