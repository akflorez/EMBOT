import { Outlet, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  CalendarDays, 
  LifeBuoy, 
  Banknote, 
  Zap, 
  Settings,
  Bell,
  Search,
  FileText,
  Tag,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { io } from 'socket.io-client';
import botAvatar from '../assets/bot-avatar-final.png';
import callyLogoWhite from '../assets/logo-white-final.png';
import callyLogoBlack from '../assets/logo-black-final.png';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox (IA)', path: '/inbox', icon: MessageSquare },
  { name: 'Leads', path: '/leads', icon: Users },
  { name: 'Importar BD', path: '/contacts/import', icon: FileText },
  { name: 'Tipificaciones', path: '/typifications', icon: Tag },
  { name: 'Agenda', path: '/agenda', icon: CalendarDays },
  { name: 'Plantillas', path: '/templates', icon: FileText },
  { name: 'Soporte', path: '/support', icon: LifeBuoy },
  { name: 'Cobranza', path: '/collections', icon: Banknote },
  { name: 'Automatización', path: '/automation', icon: Zap },
  { name: 'Configuración', path: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const userName = localStorage.getItem('user_name') || 'Usuario';
  const userRole = localStorage.getItem('user_role') || 'Admin';
  const initials = (userName || 'U')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  const handleLogout = () => {
    localStorage.removeItem('emdecob_auth');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_portfolio');
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:3002/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Socket listener for alerts
    const socket = io('http://localhost:3002');
    socket.on('wa:stats_update', () => fetchAlerts());
    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="flex h-screen w-full bg-root text-text-main overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-border-subtle bg-card flex flex-col transition-all duration-300">
        <div className="h-20 flex items-center justify-center px-4 border-b border-border-subtle overflow-hidden">
           <img 
            src={isDark ? callyLogoWhite : callyLogoBlack} 
            alt="Cally" 
            className={`h-10 w-auto object-contain ${!isDark ? 'mix-blend-multiply' : ''}`} 
          />
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-text-muted hover:bg-hover hover:text-text-main'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}

          {/* Bot Profile */}
          <div className="mt-auto pt-2 pb-0 mx-1 flex flex-col items-center justify-end flex-grow text-center overflow-hidden">
            <div className="w-full h-56 flex justify-center items-center flex-shrink-0 drop-shadow-[0_12px_24px_rgba(34,197,94,0.3)]">
              <img src={botAvatar} alt="Bot" className="w-full h-full object-contain scale-125 drop-shadow-2xl translate-y-0 mix-blend-multiply dark:mix-blend-normal" />
            </div>
            <div className="z-10 pb-4">
              <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-[0.2em]">Asistente Virtual</p>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border-subtle mt-auto">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xs text-white border border-white/10 shadow-sm">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-text-main truncate">{userName}</span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{userRole}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-auto p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border-subtle bg-surface">
          <div className="flex items-center bg-card rounded-full px-4 py-1.5 border border-border-subtle w-96">
            <Search className="w-4 h-4 text-text-muted mr-2" />
            <input 
              type="text" 
              placeholder="Buscar leads, citas, tickets..." 
              className="bg-transparent border-none outline-none text-sm w-full text-text-main placeholder-gray-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDark(!isDark)}
              className={`relative p-2 rounded-full transition-colors ${isDark ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}
              title="Alternar Tema"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowAlerts(!showAlerts)}
                className={`relative p-2 transition-colors rounded-full ${showAlerts ? 'bg-brand-500/10 text-brand-500' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
                )}
              </button>

              {showAlerts && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface/50">
                    <h3 className="font-bold text-sm">Notificaciones Recientes</h3>
                    <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center text-text-muted text-xs">No hay alertas nuevas</div>
                    ) : (
                      alerts.map((alert: any) => (
                        <div key={alert.id} className="p-4 border-b border-border-subtle last:border-b-0 hover:bg-hover transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-text-main group-hover:text-brand-500 transition-colors">{alert.title}</p>
                            <span className="text-[10px] text-text-muted whitespace-nowrap">{alert.time}</span>
                          </div>
                          <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-surface/30 text-center border-t border-border-subtle">
                    <button onClick={() => setShowAlerts(false)} className="text-[10px] font-bold text-brand-500 hover:underline">Ver todas las actividades</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
