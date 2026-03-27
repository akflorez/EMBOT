
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
      <aside className="w-64 border-r border-border-subtle bg-card flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold neo-glow">E</div>
            <span className="text-xl font-black tracking-tighter" style={{ fontFamily: 'Jost, sans-serif' }}>
              <span className="text-brand-600">EM</span>
              <span className="text-[#1e3a8a]">BOT</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xs">
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
              className="relative p-2 text-text-muted hover:bg-hover rounded-full transition-colors"
              title="Alternar Tema"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-600 dark:text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
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
