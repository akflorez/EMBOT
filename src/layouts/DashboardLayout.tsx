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
import botAvatar from '../assets/bot-avatar-clean.png';
import callyLogoWhite from '../assets/logo-white-clean.png';
import callyLogoBlack from '../assets/logo-black-clean.png';

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

  const handleLogout = () => {
    localStorage.removeItem('emdecob_auth');
    localStorage.removeItem('agent_name');
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

  return (
    <div className="flex h-screen w-full bg-root text-text-main overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-border-subtle bg-card flex flex-col transition-all duration-300">
        <div className="h-28 flex items-center justify-center px-4 border-b border-border-subtle overflow-hidden">
           <img 
            src={isDark ? callyLogoWhite : callyLogoBlack} 
            alt="Cally" 
            className="h-18 w-auto object-contain" 
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
          <div className="mt-auto pt-8 pb-4 mx-1 flex flex-col items-center justify-end flex-grow text-center">
            <div className="w-full h-56 flex justify-center items-end flex-shrink-0 drop-shadow-[0_12px_24px_rgba(34,197,94,0.3)]">
              <img src={botAvatar} alt="Bot" className="w-[185%] h-[185%] max-w-none object-contain scale-110 drop-shadow-2xl translate-y-2 mix-blend-multiply dark:mix-blend-normal" />
            </div>
            <div className="z-10 bg-card/80 backdrop-blur-sm -mt-6 px-6 py-2.5 rounded-full shadow-lg border border-border-subtle/50">
              <p className="text-[22px] font-[900] text-text-main tracking-tight leading-none">Cally</p>
              <p className="text-[12px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest mt-1">Asistente Virtual</p>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border-subtle mt-auto">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xs text-white">
              AK
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-main">Ana Karina</span>
              <span className="text-xs text-text-muted">Admin</span>
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
            <button className="relative p-2 text-text-muted hover:text-text-main transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
            </button>
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
