import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, Phone } from 'lucide-react';

type Appointment = {
  id: number;
  title: string;
  client: string;
  phone: string;
  day: number; // 0=Mon, 6=Sun
  hour: number;
  duration: number; // in hours
  type: 'Soporte' | 'Ventas' | 'Cobranza' | 'Consulta';
};

const typeColors: Record<string, string> = {
  Soporte: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  Ventas: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  Cobranza: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  Consulta: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const mockAppointments: Appointment[] = [
  { id: 1, title: 'Acuerdo de pago $4,500', client: 'Carlos Mendoza', phone: '5219991234567', day: 0, hour: 10, duration: 1, type: 'Cobranza' },
  { id: 2, title: 'Llamada de seguimiento', client: 'Sofía Ramírez', phone: '5218881234567', day: 1, hour: 11, duration: 1, type: 'Soporte' },
  { id: 3, title: 'Promesa de pago $2,000', client: 'Juan Pérez', phone: '5215551234567', day: 2, hour: 14, duration: 1, type: 'Cobranza' },
  { id: 4, title: 'Revisión deuda acumulada', client: 'Ana García', phone: '5216661234567', day: 3, hour: 9, duration: 1, type: 'Consulta' },
  { id: 5, title: 'Acuerdo liquidación $12k', client: 'Luis Torres', phone: '5217771234567', day: 4, hour: 16, duration: 1, type: 'Cobranza' },
  { id: 6, title: 'Seguimiento legal', client: 'Patricia Vega', phone: '5214441234567', day: 0, hour: 15, duration: 2, type: 'Ventas' },
];

export default function Agenda() {
  const [selected, setSelected] = useState<Appointment | null>(null);
  const today = new Date();
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(today);
    const day = today.getDay() === 0 ? 6 : today.getDay() - 1;
    d.setDate(today.getDate() - day + i);
    return d;
  });

  const getAppt = (day: number, hour: number) =>
    mockAppointments.find(a => a.day === day && a.hour === hour);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-500" />
          Agenda y Vencimientos
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-[#272a30] rounded-lg text-text-muted hover:text-text-main transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-text-muted font-medium px-2">
              {weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – {weekDates[4].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button className="p-2 hover:bg-[#272a30] rounded-lg text-text-muted hover:text-text-main transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nueva Cita
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 glass-panel rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border-subtle">
            <div className="p-3" />
            {DAYS.map((day, i) => {
              const date = weekDates[i];
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div key={day} className={`p-3 text-center border-l border-border-subtle ${isToday ? 'bg-brand-600/10' : ''}`}>
                  <p className="text-xs text-text-muted uppercase tracking-wider">{day}</p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-text-main'}`}>{date.getDate()}</p>
                </div>
              );
            })}
          </div>
          {/* Grid */}
          <div className="overflow-y-auto max-h-[500px]">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border-subtle/50 min-h-[64px]">
                <div className="p-2 text-right pr-3">
                  <span className="text-xs text-gray-600">{hour}:00</span>
                </div>
                {DAYS.map((_, di) => {
                  const appt = getAppt(di, hour);
                  const isToday = weekDates[di].toDateString() === today.toDateString();
                  return (
                    <div
                      key={di}
                      className={`border-l border-border-subtle/50 p-1 ${isToday ? 'bg-brand-600/5' : ''}`}
                    >
                      {appt && (
                        <button
                          onClick={() => setSelected(appt)}
                          className={`w-full text-left p-2 rounded-lg border text-xs font-medium transition-all hover:scale-[1.02] ${typeColors[appt.type]}`}
                        >
                          <p className="font-semibold truncate">{appt.title}</p>
                          <p className="opacity-70 truncate flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5" />{appt.client}
                          </p>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-64 flex-shrink-0">
          {selected ? (
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${typeColors[selected.type]}`}>{selected.type}</div>
              <h3 className="text-text-main font-semibold">{selected.title}</h3>
              <div className="space-y-3 text-sm">
                <p className="text-text-muted flex items-center gap-2"><User className="w-4 h-4 text-brand-600 dark:text-brand-400" />{selected.client}</p>
                <p className="text-text-muted flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />{selected.phone}</p>
                <p className="text-text-muted flex items-center gap-2"><Clock className="w-4 h-4 text-text-muted" />{selected.hour}:00 – {selected.hour + selected.duration}:00</p>
              </div>
              <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
                <button className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">Enviar recordatorio</button>
                <button onClick={() => setSelected(null)} className="w-full text-text-muted hover:text-text-main py-1.5 text-sm transition-colors">Cerrar</button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-5 text-center text-text-muted">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona una cita para ver el detalle</p>
            </div>
          )}

          {/* Legend */}
          <div className="glass-panel rounded-xl p-4 mt-4 space-y-2">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-3">Leyenda</p>
            {Object.entries(typeColors).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded border ${cls}`} />
                <span className="text-xs text-text-muted">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
