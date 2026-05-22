import React, { useState } from 'react';
import { Network, Mail, Lock, Eye, EyeOff, ArrowRight, User, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onSignIn: (sessionUser?: { id: string | null; email: string; name: string }) => void;
  onBackToLanding?: () => void;
}

export default function LoginScreen({ onSignIn, onBackToLanding }: LoginScreenProps) {
  // Navigation states
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [name, setName] = useState('');
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
      if (isSignUp) {
        // Real register linked with Supabase Auth
        if (!name.trim()) {
          throw new Error('Please enter username / name.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: name.trim()
            }
          }
        });

        if (error) throw error;

        // If active user is returned but session is null, it means verification email was sent
        if (data.user && !data.session) {
          setSuccessMsg('¡Registro exitoso! Por favor verifica tu casilla de correo electrónico para confirmar tu cuenta y poder iniciar sesión.');
          // Reset form to Login view
          setIsSignUp(false);
        } else if (data.session) {
          setSuccessMsg('¡Registro exitoso! Iniciando sesión...');
          // Trigger callbacks after a brief delay
          setTimeout(() => {
            onSignIn({
              id: data.user?.id || '',
              email: data.user?.email || email,
              name: name.trim()
            });
          }, 1500);
        } else {
          setSuccessMsg('¡Usuario registrado correctamente! Ya puedes iniciar sesión.');
          setIsSignUp(false);
        }
      } else {
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
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden font-sans p-4">
      
      {/* Background Elements to match mood board layout */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] right-[15%] w-[30%] h-[30%] bg-indigo-500/20 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-4 py-8">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mb-4 shadow-2xl shadow-blue-500/5 backdrop-blur-md">
            <Network className="text-blue-400 w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">AgencyFlow</h1>
          <p className="text-slate-400 text-sm mt-1 font-sans">Portal de Alta Costura v2.0</p>
        </div>

        {/* Central Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1 tracking-tight">
              {isSignUp ? 'Crear una cuenta' : 'Welcome Back'}
            </h2>
            <p className="text-slate-400 text-xs">
              {isSignUp 
                ? 'Regístrate para almacenar eventos, CRM y notas en tu propio Supabase.' 
                : 'Please enter your credentials to access the portal.'}
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs text-left">
              <AlertCircle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Error de Autenticación</p>
                <p className="leading-relaxed mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-400/20 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs text-left animate-pulse">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Procesando</p>
                <p className="leading-relaxed mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Full Name field (Only during Sign Up) */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider ml-1">
                  Your Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100 placeholder:text-slate-600"
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100 placeholder:text-slate-600"
                  placeholder="name@agency.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#060e20]/60 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100 placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help Links */}
            {!isSignUp && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="rounded border-white/10 bg-[#060e20] text-blue-500 focus:ring-0 focus:ring-offset-0 transition cursor-pointer"
                  />
                  <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
                    Remember me
                  </span>
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert("Por favor contacta al administrador del sistema para restablecer tu contraseña."); }} 
                  className="text-blue-400 hover:underline transition-all"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Action Trigger Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 disabled:cursor-not-allowed active:scale-95 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer mt-6 duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                  <span>Procesando...</span>
                </div>
              ) : (
                <>
                  <span>{isSignUp ? 'Crear mi cuenta' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Separation divider */}
          <div className="mt-6 border-t border-white/5 pt-5 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-sans tracking-wide hover:underline cursor-pointer"
            >
              {isSignUp 
                ? '¿Ya tienes una cuenta? Iniciar Sesión' 
                : '¿No tienes cuenta? Registrate en Supabase'}
            </button>
          </div>

          {/* Back to landing option */}
          {onBackToLanding && (
            <div className="mt-5 border-t border-white/5 pt-4 text-center">
              <button 
                type="button"
                onClick={onBackToLanding}
                className="text-xs text-slate-500 hover:text-slate-300 font-sans tracking-wide hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <span>← Volver a la página principal</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer info banner */}
        <p className="mt-8 text-center text-xs text-slate-500 font-sans leading-relaxed">
          Las credenciales ingresadas son gestionadas íntegramente por tu servidor de base de datos Supabase en la nube.
        </p>

      </main>

    </div>
  );
}
