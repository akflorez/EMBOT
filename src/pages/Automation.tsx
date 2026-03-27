import { useState } from 'react';
import { Zap, Plus, Play, Pause, Clock, MessageSquare, UserCheck, Bell, TrendingUp, ChevronRight } from 'lucide-react';

type AutomationStatus = 'Activo' | 'Pausado';

type Automation = {
  id: number;
  name: string;
  trigger: string;
  action: string;
  status: AutomationStatus;
  executions: number;
  lastRun: string;
  icon: React.ReactNode;
  category: string;
};

const mockAutomations: Automation[] = [
  {
    id: 1, name: 'Bienvenida a nuevos leads', category: 'Ventas',
    trigger: 'Nuevo mensaje entrante (primer contacto)',
    action: 'Enviar mensaje de bienvenida + menú de opciones',
    status: 'Activo', executions: 142, lastRun: 'Hace 5 min',
    icon: <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
  },
  {
    id: 2, name: 'Recordatorio de cita 24h antes', category: 'Agenda',
    trigger: 'Cita programada en 24 horas',
    action: 'Enviar WhatsApp de recordatorio al cliente',
    status: 'Activo', executions: 38, lastRun: 'Hace 1 hora',
    icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  },
  {
    id: 3, name: 'Notificar asesor: lead calificado', category: 'Ventas',
    trigger: 'IA detecta intención de compra alta (>75%)',
    action: 'Notificar al asesor de ventas asignado',
    status: 'Activo', executions: 23, lastRun: 'Hace 3 horas',
    icon: <UserCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
  },
  {
    id: 4, name: 'Cobro automático día 5', category: 'Cobranza',
    trigger: 'Día 5 del mes (pago pendiente)',
    action: 'Enviar recordatorio de pago vía WhatsApp',
    status: 'Activo', executions: 67, lastRun: 'Hace 11 días',
    icon: <Bell className="w-5 h-5 text-yellow-400" />
  },
  {
    id: 5, name: 'Escalamiento de ticket sin respuesta', category: 'Soporte',
    trigger: 'Ticket sin respuesta por más de 2 horas',
    action: 'Asignar a supervisor + notificar por email',
    status: 'Pausado', executions: 8, lastRun: 'Hace 2 días',
    icon: <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
  },
];

const categoryColors: Record<string, string> = {
  Ventas: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Soporte: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Cobranza: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
  Agenda: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
};

export default function Automation() {
  const [automations, setAutomations] = useState(mockAutomations);
  const [selected, setSelected] = useState<Automation | null>(null);

  const toggleStatus = (id: number) => {
    setAutomations(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === 'Activo' ? 'Pausado' : 'Activo' } : a
    ));
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: prev.status === 'Activo' ? 'Pausado' : 'Activo' } : null);
    }
  };

  const activeCount = automations.filter(a => a.status === 'Activo').length;
  const totalExecs = automations.reduce((s, a) => s + a.executions, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <Zap className="w-6 h-6 text-brand-500" />
          Motor de Automatización
        </h1>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva Regla
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Reglas Activas</p>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{activeCount}</p>
          <p className="text-xs text-gray-600 mt-1">de {automations.length} totales</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Ejecuciones Totales</p>
          <p className="text-2xl font-bold text-text-main">{totalExecs}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">+12% esta semana</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Tiempo Ahorrado</p>
          <p className="text-2xl font-bold text-text-main">{Math.round(totalExecs * 4 / 60)}h</p>
          <p className="text-xs text-gray-600 mt-1">~4 min por ejecución</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* List */}
        <div className="flex-1 space-y-3">
          {automations.map(auto => (
            <div
              key={auto.id}
              onClick={() => setSelected(auto)}
              className={`glass-panel p-4 rounded-xl cursor-pointer border transition-all hover:border-brand-500/30 ${selected?.id === auto.id ? 'border-brand-500/40 bg-brand-600/5' : 'border-border-subtle'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center flex-shrink-0">
                  {auto.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-text-main truncate">{auto.name}</p>
                    <span className={`hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded border ${categoryColors[auto.category]}`}>{auto.category}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate">
                    <span className="text-gray-600">Si:</span> {auto.trigger}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-text-muted">{auto.executions} ejecuciones</p>
                    <p className="text-[10px] text-gray-600">{auto.lastRun}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleStatus(auto.id); }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${auto.status === 'Activo' ? 'bg-brand-600' : 'bg-[#272a30]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${auto.status === 'Activo' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-72 flex-shrink-0 glass-panel rounded-xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center">
                {selected.icon}
              </div>
              <div>
                <p className="text-xs text-text-muted">{selected.category}</p>
                <h3 className="text-sm font-semibold text-text-main leading-tight">{selected.name}</h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-surface rounded-lg border border-border-subtle">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-medium">Disparador (Si...)</p>
                <p className="text-xs text-text-muted">{selected.trigger}</p>
              </div>
              <div className="flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Zap className="w-4 h-4" />
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border-subtle">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-medium">Acción (Entonces...)</p>
                <p className="text-xs text-text-muted">{selected.action}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface rounded-lg text-center">
                <p className="text-xs font-bold text-text-main">{selected.executions}</p>
                <p className="text-[10px] text-text-muted">Ejecuciones</p>
              </div>
              <div className="p-2 bg-surface rounded-lg text-center">
                <p className="text-xs font-bold text-text-main truncate">{selected.lastRun}</p>
                <p className="text-[10px] text-text-muted">Última vez</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
              <button
                onClick={() => toggleStatus(selected.id)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${selected.status === 'Activo' ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'}`}
              >
                {selected.status === 'Activo' ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Activar</>}
              </button>
              <button className="w-full border border-border-subtle text-text-muted hover:text-text-main py-2 rounded-lg text-sm transition-colors">
                Editar regla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
