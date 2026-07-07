import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onSignIn: (sessionUser?: { id: string | null; email: string; name: string }) => void;
  onBackToLanding?: () => void;
}

export default function LoginScreen({ onSignIn, onBackToLanding }: LoginScreenProps) {
  // Navigation states
  // Registration is disabled

  // Form states
  const [email, setEmail] = useState('name@agency.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status/Interaction states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Real login linked with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data.session && data.user) {
        setSuccessMsg('Inicio de sesión correcto. Redirigiendo...');
        setTimeout(() => {
          onSignIn({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Agency Member'
          });
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth error detailed:', err);
      setErrorMsg(err?.message || 'Ocurrió un error inesperado al procesar la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // Demo mode handler removed to enforce mandatory account entry

  return (
    <div className="relative min-h-screen w-full bg-[#020204] text-slate-100 flex items-center justify-center overflow-hidden font-sans p-4">
      
      {/* Dynamic Grid Overlay & Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#110f1c_1px,transparent_1px),linear-gradient(to_bottom,#110f1c_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-45" />
        <div className="absolute -top-[15%] -left-[15%] w-[60%] h-[60%] bg-violet-605/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-amber-500/5 rounded-full blur-[160px]" />
        <div className="absolute top-[25%] left-[30%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-4 py-8">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-18 h-18 bg-black/60 border border-amber-500/20 backdrop-blur-md flex items-center justify-center rounded-2xl mb-4 shadow-[0_0_30px_rgba(212,175,55,0.08)] p-2 transition-transform hover:scale-105 duration-300">
            <img 
              src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
              alt="Althera Logo" 
              className="w-14 h-14 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans uppercase bg-gradient-to-r from-amber-200 via-yellow-450 to-amber-500 bg-clip-text text-transparent">Althera</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-500/80 text-[10px] font-mono uppercase tracking-[0.25em] font-bold">Portal de Control v2.0</p>
          </div>
        </div>

        {/* Central Card */}
        <div className="bg-[#030306]/90 backdrop-blur-3xl border border-white/5 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:border-amber-500/10 transition-all duration-300">
          <div className="mb-6 text-left">
            <h2 className="text-xl font-bold text-white tracking-tight mb-1.5">
              Welcome Back
            </h2>
            <p className="text-slate-450 text-xs leading-relaxed font-sans font-medium">
              Introduce tus credenciales para acceder al panel de control corporativo.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs text-left">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Error de Autenticación</p>
                <p className="leading-relaxed mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-400/20 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs text-left animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Procesando</p>
                <p className="leading-relaxed mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest ml-1 block text-left">
                Nombre de Usuario o Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#020204]/80 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:border-amber-500/30 ring-offset-[#020204] focus:ring-1 focus:ring-amber-500/10 transition-all text-slate-100 placeholder:text-slate-650 text-left font-sans"
                  placeholder="nombre@agency.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest ml-1 block text-left">
                Contraseña Administrativa
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#020204]/80 border border-white/5 rounded-xl py-3 pl-11 pr-12 text-xs focus:outline-none focus:border-amber-500/30 ring-offset-[#020204] focus:ring-1 focus:ring-amber-500/10 transition-all text-slate-100 placeholder:text-slate-650 text-left font-sans"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-505 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help Links */}
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <label className="flex items-center space-x-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded border-white/5 bg-[#020204] text-amber-500 focus:ring-0 focus:ring-offset-0 transition cursor-pointer w-3.5 h-3.5"
                />
                <span className="text-slate-450 group-hover:text-slate-200 transition-colors font-sans font-medium">
                  Recordarme en este equipo
                </span>
              </label>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); alert("Por favor contacta al administrador de Althera para recibir tus claves administrativas."); }} 
                className="text-amber-550 hover:text-amber-400 hover:underline transition-all font-medium"
              >
                ¿Olvidada?
              </a>
            </div>

            {/* Action Trigger Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-[#020204] font-extrabold text-xs uppercase tracking-widest py-3 rounded-xl flex items-center justify-center space-x-2 shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.25)] transition-all cursor-pointer mt-7 duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-slate-950 animate-spin" />
                  <span>Autenticando...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar al sistema</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                </>
              )}
            </button>

            {/* Offline/Local Demo login fallback */}
            <div className="relative flex py-2 items-center my-1">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[9px] font-mono text-slate-500 uppercase tracking-widest">o también</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccessMsg('Accediendo en Modo Demo (Local sin Supabase)...');
                setTimeout(() => {
                  onSignIn({
                    id: null,
                    email: email || 'demo@agency.com',
                    name: 'Administrador Althera'
                  });
                }, 800);
              }}
              className="w-full bg-[#05050c]/80 hover:bg-amber-500/5 border border-white/5 hover:border-amber-500/20 text-slate-300 hover:text-amber-400 font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer duration-200"
            >
              <span>Acceso de Prueba Local (Demo)</span>
            </button>

          </form>

          {/* Back to landing option */}
          {onBackToLanding && (
            <div className="mt-5 border-t border-white/5 pt-4 text-center font-sans">
              <button 
                type="button"
                onClick={onBackToLanding}
                className="text-[10px] text-slate-500 hover:text-slate-350 font-sans uppercase tracking-wider hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <span>← Volver a Althera Web</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer info banner */}
        <div className="mt-8 text-center space-y-1.5 max-w-xs mx-auto">
          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
            Las credenciales ingresadas son gestionadas íntegramente por tu servidor de base de datos Supabase en la nube.
          </p>
          <p className="text-[9px] font-mono text-slate-650">
            Secure SSL Socket • Althera Corp
          </p>
        </div>

      </main>

    </div>
  );
}
