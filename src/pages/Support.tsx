import { useState } from 'react';
import { Headphones, Search, Plus, ChevronRight, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';

type Status = 'Abierto' | 'En Proceso' | 'Resuelto' | 'Cerrado';
type Priority = 'Alta' | 'Media' | 'Baja';

type Ticket = {
  id: number;
  subject: string;
  client: string;
  company: string;
  channel: string;
  status: Status;
  priority: Priority;
  date: string;
  description: string;
};

const statusConfig: Record<Status, { color: string; icon: React.ReactNode }> = {
  'Abierto':    { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <AlertCircle className="w-3 h-3" /> },
  'En Proceso': { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20', icon: <Clock className="w-3 h-3" /> },
  'Resuelto':   { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Cerrado':    { color: 'bg-gray-500/10 text-text-muted border-gray-500/20', icon: <XCircle className="w-3 h-3" /> },
};

const priorityColors: Record<Priority, string> = {
  Alta: 'text-red-600 dark:text-red-400',
  Media: 'text-yellow-600 dark:text-yellow-500',
  Baja: 'text-text-muted',
};

const mockTickets: Ticket[] = [
  { id: 1001, subject: 'Error 500 al iniciar sesión', client: 'Alex Fernández', company: 'DataCorp', channel: 'WhatsApp', status: 'En Proceso', priority: 'Alta', date: '2026-03-16 10:02', description: 'El cliente reporta que al intentar iniciar sesión en la plataforma recibe el error 500. Se verificó que su cuenta está activa.' },
  { id: 1002, subject: 'Factura incorrecta del mes de febrero', client: 'María López', company: 'Empresa XYZ', channel: 'Email', status: 'Abierto', priority: 'Media', date: '2026-03-15 09:30', description: 'Cliente solicita corrección de factura enviada el 01/02/2026, indica que el monto no corresponde al plan contratado.' },
  { id: 1003, subject: 'Solicitud de capacitación', client: 'Roberto Silva', company: 'Logística Express', channel: 'Web', status: 'Resuelto', priority: 'Baja', date: '2026-03-14 14:15', description: 'Cliente solicita sesión de capacitación para su nuevo equipo de 5 personas. Se coordinó sesión para el 20/03.' },
  { id: 1004, subject: 'Conectividad intermitente del bot', client: 'Empresa Norte SA', company: 'Constructora Norte', channel: 'WhatsApp', status: 'Abierto', priority: 'Alta', date: '2026-03-16 08:00', description: 'El bot de WhatsApp presenta desconexiones intermitentes durante picos de tráfico. Se está analizando la causa.' },
  { id: 1005, subject: 'Exportación de reportes falla', client: 'Patricia Vega', company: 'Consultores Alfa', channel: 'Email', status: 'Cerrado', priority: 'Media', date: '2026-03-13 16:45', description: 'Cliente no podía exportar reportes PDF. Se identificó un problema de permisos y fue corregido.' },
];

const FILTERS: Status[] = ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado'];

export default function Support() {
  const [filter, setFilter] = useState<Status | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const filtered = mockTickets.filter(t => {
    const matchStatus = filter === 'Todos' || t.status === filter;
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || t.client.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <Headphones className="w-6 h-6 text-brand-500" />
          Soporte y Tickets
        </h1>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {FILTERS.map(s => (
          <div key={s} className={`glass-panel rounded-xl p-4 cursor-pointer border transition-all ${filter === s ? 'border-brand-500/40' : 'border-transparent hover:border-border-subtle'}`} onClick={() => setFilter(s)}>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{s}</p>
            <p className="text-2xl font-bold text-text-main">{mockTickets.filter(t => t.status === s).length}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* List */}
        <div className="flex-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por asunto o cliente..."
              className="w-full bg-surface border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {filtered.map(ticket => {
              const sc = statusConfig[ticket.status];
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`glass-panel p-4 rounded-xl cursor-pointer transition-all border hover:border-brand-500/30 ${selected?.id === ticket.id ? 'border-brand-500/40 bg-brand-600/5' : 'border-border-subtle'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-muted">#{ticket.id}</span>
                        <span className={`text-[10px] font-semibold ${priorityColors[ticket.priority]}`}>● {ticket.priority}</span>
                      </div>
                      <p className="text-sm font-semibold text-text-main truncate">{ticket.subject}</p>
                      <p className="text-xs text-text-muted mt-0.5">{ticket.client} · {ticket.company} · {ticket.channel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                        {sc.icon} {ticket.status}
                      </span>
                      <span className="text-[10px] text-gray-600">{ticket.date}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 self-center" />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                <Headphones className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron tickets</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <Card className="w-80 flex-shrink-0 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-text-muted">Ticket #{selected.id}</span>
                <h3 className="text-base font-semibold text-text-main mt-1 leading-tight">{selected.subject}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-text-muted"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusConfig[selected.status].color}`}>
                {statusConfig[selected.status].icon} {selected.status}
              </span>
              <span className={`text-[10px] font-bold ${priorityColors[selected.priority]}`}>Prioridad {selected.priority}</span>
            </div>
            <div className="space-y-2 text-sm text-text-muted">
              <p><span className="text-text-muted">Cliente:</span> {selected.client}</p>
              <p><span className="text-text-muted">Empresa:</span> {selected.company}</p>
              <p><span className="text-text-muted">Canal:</span> {selected.channel}</p>
              <p><span className="text-text-muted">Fecha:</span> {selected.date}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg border border-border-subtle">
              <p className="text-xs text-text-muted mb-1">Descripción</p>
              <p className="text-sm text-text-muted leading-relaxed">{selected.description}</p>
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
              <button className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">Responder</button>
              <button className="w-full border border-border-subtle text-text-muted hover:text-text-main py-2 rounded-lg text-sm transition-colors">Escalar / Asignar</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
