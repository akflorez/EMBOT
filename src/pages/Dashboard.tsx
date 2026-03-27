
import { MessageSquare, Users, CalendarDays, LifeBuoy, Banknote, MoreHorizontal, ArrowRight, Activity, PieChart } from 'lucide-react';
import { StatWidget } from '../components/ui/StatWidget';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('Hoy');
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main mb-1">BOTemdecob Executive Overview</h1>
          <p className="text-text-muted text-sm">Monitoreo en tiempo real de operaciones y embudos de conversión.</p>
        </div>
        <div className="flex bg-card border border-border-subtle rounded-lg p-1">
          {['Hoy', '7d', '30d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeframe === tf
                  ? 'bg-[#272a30] text-text-main'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatWidget 
          title="Conversaciones Activas" 
          value="1,248" 
          trend={12.5} 
          icon={<MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />} 
          subtitle="IA resolviendo: 85%"
        />
        <StatWidget 
          title="Leads Capturados" 
          value="432" 
          trend={8.2} 
          icon={<Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} 
          subtitle="Tasa conv. 32%"
        />
        <StatWidget 
          title="Citas Agendadas" 
          value="89" 
          trend={-2.4} 
          icon={<CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />} 
          subtitle="Asistencia 91%"
        />
        <StatWidget 
          title="Tickets Resueltos" 
          value="210" 
          trend={15.3} 
          icon={<LifeBuoy className="w-5 h-5 text-blue-600 dark:text-blue-400" />} 
          subtitle="TMO 4m 12s"
        />
        <StatWidget 
          title="Gestión Cobranza" 
          value="$45.2K" 
          trend={4.1} 
          icon={<Banknote className="w-5 h-5 text-yellow-400" />} 
          subtitle="Recuperación 68%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              Volumen de Interacciones vs Resoluciones IA
            </h3>
            <button className="text-text-muted hover:text-text-main"><MoreHorizontal className="w-5 h-5" /></button>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 pt-8">
              {/* Fake bars for MVP vibe */}
              {[40, 70, 45, 90, 65, 85, 120, 95, 110, 80, 105, 130].map((h, i) => (
                <div key={i} className="w-full flex flex-col justify-end gap-1 relative group rounded-t-sm">
                  <div 
                    className="w-full bg-[#272a30] rounded-t-sm transition-all duration-300 group-hover:bg-[#32363e]" 
                    style={{ height: `${h}%` }}
                  >
                    <div 
                      className="w-full bg-brand-500/80 rounded-t-sm transition-all duration-300"
                      style={{ height: `${h * 0.75}%`, bottom: 0, position: 'absolute' }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-4">
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </CardContent>
        </Card>

        {/* Intention Distribution Placeholder */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <PieChart className="w-4 h-4 text-brand-500" />
              Intención de Usuario
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-48 h-48 rounded-full border-[16px] border-border-subtle relative flex items-center justify-center">
              <div className="absolute inset-0 border-[16px] border-emerald-500 rounded-full" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0)' }}></div>
              <div className="absolute inset-0 border-[16px] border-brand-500 rounded-full" style={{ clipPath: 'polygon(50% 50%, 0 0, 50% 0)' }}></div>
              <div className="absolute inset-0 border-[16px] border-purple-500 rounded-full" style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0)' }}></div>
              <div className="text-center">
                <span className="text-2xl font-bold text-text-main block">45%</span>
                <span className="text-xs text-text-muted">Ventas</span>
              </div>
            </div>
            
            <div className="w-full space-y-3 mt-8">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-text-muted">Soporte Tecnico</span></div>
                <span className="font-medium text-text-main">35%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-500"></div><span className="text-text-muted">Ventas y Leads</span></div>
                <span className="font-medium text-text-main">45%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-text-muted">Agendamiento</span></div>
                <span className="font-medium text-text-main">20%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Data Table Row */}
      <h2 className="text-xl font-semibold text-text-main mt-8 mb-4">Radar Operativo</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Leads pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-text-main">Leads Calificados Recientes</h3>
            <button 
              onClick={() => navigate('/leads')}
              className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:text-brand-300 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4"/>
            </button>
          </CardHeader>
          <div className="divide-y divide-border-subtle">
            {[
              { name: 'Carlos Mendoza', company: 'TechNova', status: 'Hot', time: 'Hace 5 min' },
              { name: 'Diana Rivas', company: 'Logistics SA', status: 'Warm', time: 'Hace 22 min' },
              { name: 'Roberto Albornoz', company: 'Independiente', status: 'Hot', time: 'Hace 1 hora' },
              { name: 'Fernanda Lazo', company: 'Consultores FL', status: 'Cold', time: 'Hace 2 horas' }
            ].map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card hover:bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-bold text-text-muted border border-border-subtle">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-main">{lead.name}</h4>
                    <span className="text-xs text-brand-600 dark:text-brand-400">{lead.company}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                    lead.status === 'Hot' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    lead.status === 'Warm' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {lead.status}
                  </span>
                  <span className="text-xs text-text-muted">{lead.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Escalated Support */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle">
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Escalados a Humano
            </h3>
            <button 
              onClick={() => navigate('/inbox')}
              className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:text-brand-300 flex items-center gap-1"
            >
              Inbox <ArrowRight className="w-4 h-4"/>
            </button>
          </CardHeader>
          <div className="divide-y divide-border-subtle">
            {[
              { code: 'TCK-8921', issue: 'Problema en pasarela de pago', by: 'Juan Pérez', priority: 'Alta', agent: 'Ana K.' },
              { code: 'TCK-8914', issue: 'Duda compleja sobre póliza', by: 'María Gómez', priority: 'Media', agent: 'Pendiente' },
              { code: 'TCK-8905', issue: 'Solicitud de devolución manual', by: 'Luis F.', priority: 'Alta', agent: 'Admin' }
            ].map((tck, i) => (
              <div key={i} className="flex items-start justify-between p-4 bg-card hover:bg-hover transition-colors cursor-pointer">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded">{tck.code}</span>
                    <h4 className="text-sm font-medium text-text-main">{tck.issue}</h4>
                  </div>
                  <span className="text-xs text-text-muted">Usuario: <span className="text-text-muted">{tck.by}</span></span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400">{tck.priority}</span>
                  <span className="text-xs text-text-muted">Asignado a: <span className={tck.agent === 'Pendiente' ? 'text-yellow-600 dark:text-yellow-500' : 'text-brand-600 dark:text-brand-400'}>{tck.agent}</span></span>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
