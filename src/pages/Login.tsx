import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Shield, Smartphone, Clock } from 'lucide-react';
import loginHero from '../assets/login-hero.png';
import colyLogo from '/assets/cally-logo.png';

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


  return (
    <div className="min-h-screen flex bg-[#fafbfc]">
      {/* =========================================== */}
      {/* LEFT PANEL — Login Form                     */}
      {/* =========================================== */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-8 relative bg-white overflow-y-auto">
        
        {/* Top: Logo — Centered & Prominent */}
        <div className="flex items-center justify-center w-full mb-6">
          <img src={colyLogo} alt="Cally" className="w-48 object-contain" />
        </div>

        {/* Center: Form */}
        <div className="w-full max-w-[380px]">
          <div className="mb-6">
            <h2 className="text-[28px] font-[800] text-gray-900 tracking-tight leading-tight">
              Bienvenido
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
            © {new Date().getFullYear()} Cally · Powered by <span className="font-semibold text-gray-400">EMDECOB</span>
          </p>
        </div>
      </div>

      {/* =========================================== */}
      {/* RIGHT PANEL — Hero / Product Showcase        */}
      {/* =========================================== */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0f111a]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[120px]"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-12 xl:px-20 overflow-hidden">
          
          {/* Headline - Floating Style */}
          <div className="text-center mb-0 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl rounded-full px-4 py-1.5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
              <span className="text-white/80 text-[11px] font-bold tracking-widest uppercase">Premium Enterprise AI</span>
            </div>
          </div>

          {/* Premium Laptop Mockup - Main Focus */}
          <div className="w-full max-w-[900px] scale-[1.15] xl:scale-[1.35] transition-all duration-700 hover:scale-[1.18] xl:hover:scale-[1.38] mt-8">
            <img 
              src={loginHero} 
              alt="Cally Premium Experience"
              className="w-full h-auto drop-shadow-[0_35px_60px_rgba(0,0,0,0.6)] object-contain"
            />
          </div>

          {/* Bottom Branding */}
          <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <p className="text-white/30 text-[11px] font-medium tracking-[0.2em] uppercase">
              La nueva era de la <span className="text-white/60">automatización inteligente</span>
            </p>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
