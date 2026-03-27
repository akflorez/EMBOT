import { useState } from 'react';
import { Send, Search, TrendingDown, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type DebtStatus = 'Pendiente' | 'Contactado' | 'Acuerdo' | 'Pagado';

type Debtor = {
  id: number;
  name: string;
  company: string;
  phone: string;
  amount: number;
  daysOverdue: number;
  status: DebtStatus;
  lastContact: string;
};

const statusConfig: Record<DebtStatus, { color: string; icon: React.ReactNode }> = {
  'Pendiente':  { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <AlertTriangle className="w-3 h-3" /> },
  'Contactado': { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20', icon: <Clock className="w-3 h-3" /> },
  'Acuerdo':    { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Pagado':     { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
};

const mockDebtors: Debtor[] = [
  { id: 1, name: 'Juan Pérez', company: 'Distribuidora JP', phone: '5215551234567', amount: 4500, daysOverdue: 45, status: 'Pendiente', lastContact: 'Nunca' },
  { id: 2, name: 'Constructora Norte', company: 'Constructora Norte SA', phone: '5217771234567', amount: 12000, daysOverdue: 30, status: 'Contactado', lastContact: 'Hace 3 días' },
  { id: 3, name: 'Retail Pro SA', company: 'Retail Pro', phone: '5216661234567', amount: 3200, daysOverdue: 15, status: 'Acuerdo', lastContact: 'Hoy' },
  { id: 4, name: 'Eduardo Gómez', company: 'Fotográfica EG', phone: '5213331234567', amount: 800, daysOverdue: 60, status: 'Pendiente', lastContact: 'Hace 1 semana' },
  { id: 5, name: 'Logística Central', company: 'Log MX', phone: '5219001234567', amount: 2100, daysOverdue: 5, status: 'Pagado', lastContact: 'Hoy' },
];

export default function Collections() {
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<number | null>(null);

  const filtered = mockDebtors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.company.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = mockDebtors.filter(d => d.status !== 'Pagado').reduce((s, d) => s + d.amount, 0);
  const totalRecovered = mockDebtors.filter(d => d.status === 'Pagado').reduce((s, d) => s + d.amount, 0);

  const handleSend = async (id: number) => {
    setSending(id);
    await new Promise(r => setTimeout(r, 1500));
    setSending(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-brand-500" />
          Gestión de Cobranza
        </h1>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Send className="w-4 h-4" /> Enviar masivo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Pendiente</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totalPending.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">{mockDebtors.filter(d => d.status !== 'Pagado').length} clientes</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Recuperado</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalRecovered.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">{mockDebtors.filter(d => d.status === 'Pagado').length} pagos</p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Tasa de Recuperación</p>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{Math.round(totalRecovered / (totalPending + totalRecovered) * 100)}%</p>
          <div className="h-1.5 bg-[#272a30] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round(totalRecovered / (totalPending + totalRecovered) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar por nombre o empresa..."
          className="w-full bg-surface border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs text-text-muted uppercase tracking-wider">
              <th className="text-left p-4 font-medium">Cliente</th>
              <th className="text-right p-4 font-medium">Monto</th>
              <th className="text-center p-4 font-medium">Días vencido</th>
              <th className="text-center p-4 font-medium">Estado</th>
              <th className="text-center p-4 font-medium">Último contacto</th>
              <th className="text-center p-4 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((debtor, i) => {
              const sc = statusConfig[debtor.status];
              return (
                <tr key={debtor.id} className={`border-b border-border-subtle/50 hover:bg-card transition-colors ${i % 2 === 0 ? '' : 'bg-surface/30'}`}>
                  <td className="p-4">
                    <p className="font-medium text-text-main">{debtor.name}</p>
                    <p className="text-xs text-text-muted">{debtor.company}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-text-main">${debtor.amount.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xs font-medium ${debtor.daysOverdue > 45 ? 'text-red-600 dark:text-red-400' : debtor.daysOverdue > 15 ? 'text-yellow-600 dark:text-yellow-500' : 'text-text-muted'}`}>
                      {debtor.daysOverdue}d
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                      {sc.icon} {debtor.status}
                    </span>
                  </td>
                  <td className="p-4 text-center text-xs text-text-muted">{debtor.lastContact}</td>
                  <td className="p-4 text-center">
                    {debtor.status !== 'Pagado' && (
                      <button
                        onClick={() => handleSend(debtor.id)}
                        disabled={sending === debtor.id}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {sending === debtor.id ? (
                          <><span className="animate-pulse">Enviando...</span></>
                        ) : (
                          <><Send className="w-3 h-3" /> Recordatorio</>
                        )}
                      </button>
                    )}
                    {debtor.status === 'Pagado' && (
                      <span className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
