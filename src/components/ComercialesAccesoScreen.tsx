import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ComercialAccount } from '../types';

interface ComercialesAccesoScreenProps {
  comercialesList: ComercialAccount[];
  onSignInComercial: (comercial: ComercialAccount) => void;
  onBackToLanding: () => void;
}

export default function ComercialesAccesoScreen({ 
  comercialesList, 
  onSignInComercial, 
  onBackToLanding 
}: ComercialesAccesoScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    setTimeout(() => {
      // Find matching commercial account
      const found = comercialesList.find(
        (c) => c.email.toLowerCase().trim() === email.toLowerCase().trim() && c.password === password
      );

      if (found) {
        onSignInComercial(found);
      } else {
        setErrorMsg('Credenciales incorrectas. Verifica tu correo y contraseña, o solicita un acceso al Administrador de Althera.');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-150 flex items-center justify-center overflow-hidden font-sans p-6">
      
      {/* Background cinematic mesh & luxury gold-tinted glow grids */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-[140px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <main className="relative z-10 w-full max-w-[460px]">
        
        {/* Floating cards & brand entrance animation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Header Branding Panel */}
          <div className="flex flex-col items-center text-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="relative w-20 h-20 bg-black border border-amber-500/30 flex items-center justify-center rounded-2xl mb-5 shadow-[0_0_30px_rgba(212,175,55,0.1)] p-1 cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img 
                src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
                alt="Althera Logo" 
                className="w-14 h-14 object-contain filter brightness-[1.05]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            <h1 className="text-3xl font-extrabold tracking-[0.15em] text-white font-sans uppercase bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 bg-clip-text text-transparent drop-shadow-sm">
              ALTHERA
            </h1>
            <div className="flex items-center gap-1.5 mt-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/15">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-[9.5px] text-amber-400 font-mono uppercase tracking-widest font-black">
                Portal de Representantes
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            
            {/* Fine design accent lines */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            
            <div className="mb-6 space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Accede de forma segura a tu cartera de clientes, leads comerciales y estadísticas de comisiones.
              </p>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl text-left leading-normal flex items-start gap-2"
              >
                <span className="text-rose-400 mt-0.5">⚠️</span>
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-wider ml-1">
                  Dirección de Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/70 border border-white/10 focus:border-amber-500/50 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all text-slate-100 placeholder:text-slate-600 font-sans"
                    placeholder="ejemplo@althera.io"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-wider ml-1">
                  Contraseña Autorizada
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-white/10 focus:border-amber-500/50 rounded-xl py-3 pl-11 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all text-slate-100 placeholder:text-slate-600 font-sans"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Action Trigger */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all cursor-pointer mt-6"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-slate-950 animate-spin" />
                    <span>Autenticando Acceso...</span>
                  </div>
                ) : (
                  <>
                    <span>Acceder al Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

            </form>

            {/* Back action */}
            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <button 
                type="button"
                onClick={onBackToLanding}
                className="text-xs text-slate-400 hover:text-white font-medium tracking-wide hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <span>← Volver a la Landing de Althera</span>
              </button>
            </div>

          </div>

          {/* Secure system badge */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 bg-slate-950/40 py-2.5 px-4 rounded-2xl border border-white/5 max-w-fit mx-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encriptación SSL activa & Base de Datos Autorizada RLS</span>
          </div>

        </motion.div>

        {/* Informational warning */}
        <p className="mt-8 text-center text-[10px] text-slate-600 leading-relaxed font-light px-4">
          Si eres representante autorizado pero no dispones de credenciales de acceso, por favor solicita la creación de tu cuenta al Administrador de Ventas de Althera.
        </p>

      </main>
    </div>
  );
}
