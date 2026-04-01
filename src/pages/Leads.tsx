import { useState, useEffect } from 'react';
import { Plus, Phone, Building2, TrendingUp, Clock, RefreshCcw } from 'lucide-react';
import { io } from 'socket.io-client';
import { WA_API_URL } from '../config';

const STAGES = ['Nuevo', 'Calificado', 'Propuesta', 'Agendado', 'Cerrado'];

const tagColors: Record<string, string> = {
  interesado_servicios: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  servicio_al_cliente: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  otros: 'bg-gray-500/10 text-text-muted border-border-subtle',
};

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeads = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${WA_API_URL}/leads`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      
      // Mapear data real a formato Kanban
      const mappedLeads = data.map((l: any, index: number) => ({
        id: index,
        name: l.name,
        company: l.portfolio || 'General',
        email: 'vía WhatsApp',
        phone: l.phoneNumber,
        channel: 'WhatsApp',
        stage: l.category === 'interesado_servicios' ? 'Calificado' : 'Nuevo',
        probability: l.category === 'interesado_servicios' ? 80 : 30,
        amount: l.service || 'Interés General',
        tag: l.category || 'otros',
        content: l.content
      }));
      setLeads(mappedLeads);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error fetching leads:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchLeads();

    const socket = io(WA_API_URL, { transports: ['websocket', 'polling'] });
    socket.on('wa:stats_update', () => {
      // Re-fetch leads when stats update (new lead arrived)
      fetchLeads();
    });

    return () => { socket.disconnect(); };
  }, []);

  const getByStage = (stage: string) => leads.filter(l => l.stage === stage);

  const handleDragStart = (id: number) => setDragging(id);
  const handleDrop = (stage: string) => {
    if (dragging === null) return;
    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, stage } : l));
    setDragging(null);
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-500" />
              Pipeline de Leads Real
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Live Sync</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-text-muted text-sm mt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>Última actualización: <span className="font-bold text-text-main">{lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></span>
            </div>
            <button 
              onClick={fetchLeads}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1 bg-surface border border-border-subtle rounded-lg text-xs font-bold hover:bg-hover transition-all active:scale-95 shadow-sm group ${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <RefreshCcw className={`w-3 h-3 text-brand-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              Actualizar
            </button>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start xl:self-auto">
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
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-500" /> {lead.phone}
                    </p>
                    {lead.content && (
                      <div className="mt-2 p-2 bg-surface/50 rounded border border-border-subtle/30 italic text-[10px] text-text-muted">
                        "{lead.content.length > 60 ? lead.content.substring(0, 60) + '...' : lead.content}"
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${tagColors[lead.tag] || 'bg-gray-500/10 text-text-muted'}`}>{lead.tag}</span>
                    <span className="text-[10px] text-text-muted">{lead.channel}</span>
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
