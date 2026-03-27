import { useState } from 'react';
import { Plus, Phone, Mail, Building2, TrendingUp, MoreVertical } from 'lucide-react';

const STAGES = ['Nuevo', 'Calificado', 'Propuesta', 'Agendado', 'Cerrado'];

const mockLeads = [
  { id: 1, name: 'Carlos Mendoza', company: 'TechSolutions MX', email: 'cmendoza@techsol.mx', phone: '5219991234567', channel: 'WhatsApp', stage: 'Nuevo', probability: 85, amount: '$12,000', tag: 'Ventas' },
  { id: 2, name: 'Sofía Ramírez', company: 'DataCorp SA', email: 'sofia.r@datacorp.com', phone: '5218881234567', channel: 'WhatsApp', stage: 'Calificado', probability: 72, amount: '$8,500', tag: 'Soporte' },
  { id: 3, name: 'Luis Torres', company: 'Constructora Norte', email: 'ltorres@norte.com', phone: '5217771234567', channel: 'Web', stage: 'Propuesta', probability: 60, amount: '$25,000', tag: 'Ventas' },
  { id: 4, name: 'Ana García', company: 'Retail Pro', email: 'agarcia@retailpro.mx', phone: '5216661234567', channel: 'WhatsApp', stage: 'Agendado', probability: 90, amount: '$5,200', tag: 'Ventas' },
  { id: 5, name: 'Roberto Silva', company: 'Logística Express', email: 'rsilva@logex.mx', phone: '5215551234567', channel: 'Email', stage: 'Nuevo', probability: 40, amount: '$18,000', tag: 'Cobranza' },
  { id: 6, name: 'Patricia Vega', company: 'Consultores Alfa', email: 'pvega@alfa.mx', phone: '5214441234567', channel: 'WhatsApp', stage: 'Cerrado', probability: 100, amount: '$9,000', tag: 'Ventas' },
];

const tagColors: Record<string, string> = {
  Ventas: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Soporte: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Cobranza: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
};

export default function Leads() {
  const [leads, setLeads] = useState(mockLeads);
  const [dragging, setDragging] = useState<number | null>(null);

  const getByStage = (stage: string) => leads.filter(l => l.stage === stage);

  const handleDragStart = (id: number) => setDragging(id);
  const handleDrop = (stage: string) => {
    if (dragging === null) return;
    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, stage } : l));
    setDragging(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-500" />
          Pipeline de Leads
        </h1>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Lead
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div
            key={stage}
            className="min-w-[280px] flex flex-col gap-3"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stage}</h3>
              <span className="text-xs bg-[#272a30] text-text-muted rounded-full px-2 py-0.5">{getByStage(stage).length}</span>
            </div>
            <div className="flex flex-col gap-3 min-h-[100px]">
              {getByStage(stage).map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead.id)}
                  className="glass-panel p-4 rounded-xl border border-border-subtle hover:border-brand-500/40 cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-brand-500/5 group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-text-main">{lead.name}</p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" /> {lead.company}
                      </p>
                    </div>
                    <button className="text-gray-600 hover:text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-500" /> {lead.phone}
                    </p>
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-brand-600 dark:text-brand-400" /> {lead.email}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${tagColors[lead.tag] || 'bg-gray-500/10 text-text-muted'}`}>{lead.tag}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[#272a30] rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${lead.probability}%` }} />
                      </div>
                      <span className="text-[10px] text-text-muted">{lead.probability}%</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border-subtle flex justify-between items-center">
                    <span className="text-xs text-text-muted">Valor</span>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{lead.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
