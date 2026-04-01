import { 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Activity, 
  PieChart, 
  Instagram, 
  Smartphone,
  TrendingUp,
  BarChart3,
  ChevronDown,
  Briefcase,
  Headphones,
  Database,
  Scale,
  RefreshCcw
} from 'lucide-react';
import { StatWidget } from '../components/ui/StatWidget';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { WA_API_URL } from '../config';

import logoCrediorbe from '../assets/logo-crediorbe.webp';
import logoEfigas from '../assets/logo-efigas.png';
import logoFNA from '../assets/logo-fna.png';
import logoPH from '../assets/logo-ph.png';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('Hoy');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedService, setSelectedService] = useState('Todos');
  const [selectedPortfolio, setSelectedPortfolio] = useState('Todos');
  const navigate = useNavigate();

  // RBAC: Check user info
  const userRole = localStorage.getItem('user_role') || 'admin';
  const userPortfolio = localStorage.getItem('user_portfolio') || '';
  const userName = localStorage.getItem('user_name') || 'Admin';
  const isAdmin = userRole === 'admin';

  const [stats, setStats] = useState<{
    totalLeads: number,
    categories: Record<string, number>,
    services: Record<string, number>,
    portfolios: Record<string, number>
  }>({
    totalLeads: 0,
    categories: { interesado_servicios: 0, servicio_al_cliente: 0 },
    services: { gestion_cartera: 0, contact_center: 0, emdata: 0, asesoria_juridica: 0 },
    portfolios: { Crediorbe: 0, Efigas: 0, FNA: 0, "Propiedad horizontal": 0 }
  });

  const [agents, setAgents] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${WA_API_URL}/agents`);
      if (res.ok) setAgents(await res.json());
    } catch (e) { console.error('Error fetching agents:', e); }
  };

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${WA_API_URL}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
      await fetchAgents();
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error fetching real-time stats:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchStats();

    // Socket for live updates
    const socket = io(WA_API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    socket.on('wa:stats_update', (newStats) => {
      console.log('Live stats update received:', newStats);
      setStats(newStats);
      setLastUpdate(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Mock data with Logos
  const allPortfolioStats = [
    { name: 'Crediorbe', active: 342, avgResponse: '1m 12s', trend: '+5%', logo: logoCrediorbe },
    { name: 'Efigas', active: 215, avgResponse: '2m 45s', trend: '-2%', logo: logoEfigas },
    { name: 'FNA', active: 456, avgResponse: '1m 30s', trend: '+12%', logo: logoFNA },
    { name: 'Propiedad Horizontal', active: 128, avgResponse: '3m 10s', trend: '+1%', logo: logoPH },
  ];

  // Filter based on role + selected portfolio
  const portfolioStats = allPortfolioStats.map(p => ({
    ...p,
    active: stats.portfolios[p.name] || 0
  })).filter(p => isAdmin 
    ? (selectedPortfolio === 'Todos' ? true : p.name === selectedPortfolio)
    : (!userPortfolio || p.name === userPortfolio)
  );

  const services = ['Todos', 'Gestión de Cartera', 'Contact Center', 'EMDATA (Power BI)', 'Asesoría Jurídica'];
  const portfolios = ['Todos', 'Crediorbe', 'Efigas', 'FNA', 'Propiedad Horizontal'];

  const sourceData = [
    { label: 'WhatsApp Directo', value: stats.totalLeads || 0, icon: <Smartphone className="w-4 h-4 text-emerald-500" /> },
    { label: 'Instagram Ads/Posts', value: 0, icon: <Instagram className="w-4 h-4 text-pink-500" /> },
  ];

  const serviceInterest = [
    { name: 'Gestión de Cartera', value: stats.services.gestion_cartera || 0, color: 'bg-red-500', icon: <Briefcase className="w-4 h-4 text-red-500" /> },
    { name: 'Contact Center', value: stats.services.contact_center || 0, color: 'bg-emerald-500', icon: <Headphones className="w-4 h-4 text-emerald-500" /> },
    { name: 'EMDATA (Power BI)', value: stats.services.emdata || 0, color: 'bg-purple-500', icon: <Database className="w-4 h-4 text-purple-500" /> },
    { name: 'Asesoría Jurídica', value: stats.services.asesoria_juridica || 0, color: 'bg-blue-500', icon: <Scale className="w-4 h-4 text-blue-500" /> },
  ].filter(s => selectedService === 'Todos' || s.name === selectedService)
   .map(s => {
     const total = Object.values(stats.services).reduce((a, b) => a + (b as number), 0) || 1;
     return { ...s, value: Math.round(((s.value as number) / total) * 100) };
   });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded inline-block">
              {isAdmin ? 'Panel de Control Principal' : `Reporte de Portafolio: ${userPortfolio || 'General'}`}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Live Sync</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main mb-1">
            Bienvenido, {userName}
          </h1>
          <div className="flex items-center gap-4 text-text-muted text-sm mt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>Última actualización: <span className="font-bold text-text-main">{lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></span>
            </div>
            <button 
              onClick={fetchStats}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1 bg-surface border border-border-subtle rounded-lg text-xs font-bold hover:bg-hover transition-all active:scale-95 shadow-sm group ${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <RefreshCcw className={`w-3 h-3 text-brand-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-2xl border border-border-subtle shadow-sm">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Tiempo</label>
            <div className="flex bg-surface border border-border-subtle rounded-xl p-1 shadow-inner h-10 items-center">
              {['Hoy', '7d', '30d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    timeframe === tf
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Rango Personalizado</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-brand-500 h-10 w-32 shadow-sm"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-text-muted opacity-50 font-bold">-</span>
              <input 
                type="date" 
                className="bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-brand-500 h-10 w-32 shadow-sm"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Servicio</label>
              <div className="relative">
                <select 
                  className="bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-brand-500 h-10 min-w-[170px] appearance-none cursor-pointer pr-8 shadow-sm"
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                >
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Portafolio</label>
              <div className="relative">
                <select 
                  className="bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-brand-500 h-10 min-w-[170px] appearance-none cursor-pointer pr-8 shadow-sm"
                  value={selectedPortfolio}
                  onChange={e => setSelectedPortfolio(e.target.value)}
                >
                  {portfolios.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget 
          title="Conversaciones Totales" 
          value={stats.totalLeads.toLocaleString()} 
          trend={12.5} 
          icon={<MessageSquare className="w-5 h-5 text-brand-500" />} 
          subtitle="Capturados en Neon"
        />
        <StatWidget 
          title="Tasa de Conversión" 
          value={`${Math.round((stats.totalLeads / (stats.totalLeads + 50)) * 100)}%`} 
          trend={2.1} 
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} 
          subtitle="Interesados -> Leads"
        />
        <StatWidget 
          title="TMO Promedio" 
          value="2m 15s" 
          trend={-15.3} 
          icon={<Clock className="w-5 h-5 text-blue-500" />} 
          subtitle="Tiempo medio de respuesta"
        />
        <StatWidget 
          title="Servicio más Solicitado" 
          value={Object.entries(stats.services).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Ninguno'} 
          icon={<BarChart3 className="w-5 h-5 text-purple-500" />} 
          subtitle="Mayor volumen de consultas"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Portfolio Performance Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border-subtle pb-4">
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              Rendimiento por Portafolio (Servicio al Cliente)
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface/50">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">Portafolio</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">Chats Activos</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">TMO (Respuesta)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {portfolioStats.length > 0 ? portfolioStats.map((p, i) => (
                    <tr key={i} className="hover:bg-hover transition-colors">
                      <td className="p-4 text-sm font-medium text-text-main">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-transparent p-1 flex items-center justify-center border border-border-subtle/30 overflow-hidden group-hover:scale-105 transition-transform">
                            <img src={p.logo} alt={p.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="font-extrabold text-lg text-text-main">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-center text-text-muted">{p.active}</td>
                      <td className="p-4 text-sm text-center font-mono text-brand-500">{p.avgResponse}</td>
                      <td className={`p-4 text-sm text-right font-medium ${p.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                        {p.trend}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-muted text-sm italic">
                        No hay datos para el portafolio seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* User Intent Distribution - RESTORED FOR ALL */}
        <Card>
          <CardHeader className="border-b border-border-subtle pb-4">
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <PieChart className="w-4 h-4 text-brand-500" />
              Distribución de Intención
            </h3>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-around items-center mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-main">{stats.categories.interesado_servicios || 0}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-tighter">Interesados</p>
              </div>
              <div className="w-px h-8 bg-border-subtle"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-main">{stats.categories.servicio_al_cliente || 0}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-tighter">Servicio Cliente</p>
              </div>
            </div>
              
              <div className="space-y-5">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Servicios más Consultados</p>
                {serviceInterest.map((s, i) => (
                  <div key={i} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 rounded p-1.5 bg-surface/50 border border-border-subtle/20 flex items-center justify-center">
                           {s.icon}
                         </div>
                        <span className="text-text-main font-semibold group-hover:text-brand-500 transition-colors">{s.name}</span>
                      </div>
                      <span className="text-text-muted">{s.value}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} transition-all duration-500`} style={{ width: `${s.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border-subtle">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Origen de Tráfico</p>
                <div className="grid grid-cols-2 gap-4">
                  {sourceData.map((s, i) => (
                    <div key={i} className="bg-surface p-3 rounded-xl border border-border-subtle/50 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {s.icon}
                        <span className="text-[11px] font-medium text-text-muted">{s.label.split(' ')[0]}</span>
                      </div>
                      <p className="text-lg font-bold text-text-main">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Qualified Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-text-main">Leads Calificados (Interesados)</h3>
            <button onClick={() => navigate('/leads')} className="text-brand-500 text-sm font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4"/>
            </button>
          </CardHeader>
          <div className="divide-y divide-border-subtle">
            {[
              { name: 'Carlos Mendoza', service: 'Gestión de Cartera', status: 'Hot', time: 'Hace 5 min', source: 'Instagram' },
              { name: 'Diana Rivas', service: 'EMDATA (Power BI)', status: 'Warm', time: 'Hace 22 min', source: 'WhatsApp' },
              { name: 'Roberto Albornoz', service: 'Asesoría Jurídica', status: 'Hot', time: 'Hace 1 hora', source: 'Instagram' }
            ].filter(lead => selectedService === 'Todos' || lead.service === selectedService).map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-sm shadow-sm">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-main">{lead.name}</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase">{lead.service}</span>
                       <span className="text-[10px] text-text-muted">•</span>
                       {lead.source === 'Instagram' ? <Instagram className="w-3 h-3 text-pink-500" /> : <Smartphone className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                    lead.status === 'Hot' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    {lead.status}
                  </span>
                  <span className="text-[10px] text-text-muted">{lead.time}</span>
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
              Atención Humana (Por Portafolio)
            </h3>
            <button onClick={() => navigate('/inbox')} className="text-brand-500 text-sm font-medium hover:underline flex items-center gap-1">
              Inbox <ArrowRight className="w-4 h-4"/>
            </button>
          </CardHeader>
          <div className="divide-y divide-border-subtle">
            {[
              { code: 'Crediorbe', issue: 'Problema en pasarela', by: 'Juan P.', wait: '12m', priority: 'Alta' },
              { code: 'Efigas', issue: 'Duda sobre póliza', by: 'María G.', wait: '5m', priority: 'Media' },
              { code: 'FNA', issue: 'Retiro de ahorro', by: 'Luis F.', wait: '22m', priority: 'Alta' }
            ].filter(tck => selectedPortfolio === 'Todos' || tck.code === selectedPortfolio).map((tck, i) => (
              <div key={i} className="flex items-start justify-between p-4 hover:bg-hover transition-colors cursor-pointer">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded shadow-sm">{tck.code}</span>
                    <h4 className="text-sm font-medium text-text-main">{tck.issue}</h4>
                  </div>
                  <p className="text-xs text-text-muted">Cliente: {tck.by}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-500 mb-1">Espera: {tck.wait}</p>
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{tck.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Team / Agents Section */}
      <Card className="mt-6">
        <CardHeader className="border-b border-border-subtle pb-4">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-brand-500" />
            Equipo de Agentes y Coordinadores
          </h3>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agents.length > 0 ? agents.map((agent, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border-subtle hover:border-brand-500/30 transition-all group">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-lg shadow-sm border border-brand-500/20">
                    {agent.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${agent.active ? 'bg-emerald-500' : 'bg-gray-300'} shadow-sm`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text-main truncate group-hover:text-brand-500 transition-colors">{agent.name}</h4>
                  <p className="text-[11px] text-text-muted flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-brand-400" />
                    {agent.portfolio || 'Sin portfolio asignado'}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${agent.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {agent.active ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-8 text-center text-text-muted text-sm italic">
                Cargando agentes activos...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
