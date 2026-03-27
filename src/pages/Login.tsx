import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, MessageCircle, Smartphone, Users, Zap, Shield, Clock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (username.toUpperCase() === 'EMDECOB' && password === '270227') {
      setTimeout(() => {
        localStorage.setItem('emdecob_auth', 'true');
        navigate('/dashboard');
      }, 1200);
    } else {
      setTimeout(() => {
        setError('Credenciales incorrectas. Verifica e intenta nuevamente.');
        setIsLoading(false);
      }, 600);
    }
  };

  const features = [
    { icon: MessageCircle, label: 'Multicanal', desc: 'WhatsApp, Instagram, Messenger' },
    { icon: Users, label: 'Multiagente', desc: 'Asigna equipos en tiempo real' },
    { icon: Zap, label: 'Chatbots', desc: 'Automatiza respuestas 24/7' },
  ];

  return (
    <div className="min-h-screen flex bg-[#fafbfc]">
      {/* =========================================== */}
      {/* LEFT PANEL — Login Form                     */}
      {/* =========================================== */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col items-center justify-start px-6 sm:px-12 lg:px-16 xl:px-20 pt-8 pb-6 relative bg-white overflow-y-auto">
        
        {/* Top: Logo — Centered & Prominent */}
        <div className="flex items-center justify-center w-full mb-6">
          <img src="/assets/coly-logo.png" alt="EMBOT" className="w-72 object-contain" />
        </div>

        {/* Center: Form */}
        <div className="w-full max-w-[380px]">
          <div className="mb-6">
            <h2 className="text-[28px] font-[800] text-gray-900 tracking-tight leading-tight">
              Bienvenido de vuelta
            </h2>
            <p className="text-gray-500 text-[15px] mt-2">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-gray-700 text-[13px] font-semibold mb-1.5 block">
                Usuario
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-[15px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white hover:border-gray-300"
                placeholder="Tu usuario corporativo"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-700 text-[13px] font-semibold mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 pr-12 text-gray-900 text-[15px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white hover:border-gray-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2.5">
                <div className="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                <p className="text-red-600 text-[13px] font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold text-[15px] py-4 rounded-xl transition-all duration-200 shadow-lg shadow-brand-600/20 hover:shadow-xl hover:shadow-brand-600/30 active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
              <Shield className="w-3.5 h-3.5" /> Acceso seguro
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
              <Clock className="w-3.5 h-3.5" /> Soporte 24/7
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
              <Smartphone className="w-3.5 h-3.5" /> Multidispositivo
            </div>
          </div>
        </div>

        {/* Bottom: Footer */}
        <div className="text-center">
          <p className="text-gray-300 text-[11px]">
            © {new Date().getFullYear()} EMBOT · Powered by <span className="font-semibold text-gray-400">EMDECOB</span>
          </p>
        </div>
      </div>

      {/* =========================================== */}
      {/* RIGHT PANEL — Hero / Product Showcase        */}
      {/* =========================================== */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Base Gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #064e3b 0%, #047857 35%, #059669 60%, #10b981 100%)' }}></div>
        
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>

        {/* Glow Orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-200/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-brand-300/15 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px]"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 xl:px-20">
          
          {/* Headline */}
          <div className="text-center mb-12 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 mb-6">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-white/90 text-xs font-semibold">Plataforma activa 24/7</span>
            </div>
            <h2 className="text-white text-4xl xl:text-[2.8rem] font-[900] tracking-tight leading-[1.15] mb-5">
              Gestiona todas tus<br/>
              <span className="bg-gradient-to-r from-emerald-200 to-green-100 bg-clip-text text-transparent">conversaciones</span><br/>
              en un solo lugar
            </h2>
            <p className="text-emerald-100/60 text-base leading-relaxed">
              Centraliza WhatsApp, Instagram y más canales con chatbots inteligentes y soporte multiagente.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-12">
            {features.map((f, i) => (
              <div 
                key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center hover:bg-white/15 hover:border-white/20 transition-all duration-300 group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="text-white text-[13px] font-bold mb-0.5">{f.label}</span>
                <span className="text-emerald-100/50 text-[10px] font-medium leading-tight">{f.desc}</span>
              </div>
            ))}
          </div>

          {/* Dashboard Preview */}
          <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-4 bg-white/5 rounded-[28px] blur-xl group-hover:bg-white/10 transition-all duration-500"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/15 transition-transform duration-500 group-hover:scale-[1.02]">
              <img 
                src="/assets/dashboard-preview.png" 
                alt="EMBOT Dashboard"
                className="w-full h-auto block"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5"></div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-8 flex items-center gap-6">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-emerald-700 flex items-center justify-center text-white text-[9px] font-bold backdrop-blur-sm">
                  {['AK','JR','ML','CP'][i-1]}
                </div>
              ))}
            </div>
            <span className="text-emerald-100/50 text-xs font-medium">+ 500 empresas confían en EMBOT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
