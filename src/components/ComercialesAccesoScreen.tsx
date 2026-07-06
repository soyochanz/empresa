import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
        setErrorMsg('Credenciales inválidas. Por favor, asegúrate de escribir correctamente tu email y contraseña, o contacta con el Administrador para que cree tu cuenta.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden font-sans p-4">
      {/* Dynamic atmospheric ambient glows matching Althera identity */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] -right-[10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[130px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[130px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-4 py-8">
        
        {/* Header branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-black border border-[#D4AF37]/25 flex items-center justify-center rounded-2xl mb-4 shadow-2xl p-1">
            <img 
              src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
              alt="Althera Logo" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans uppercase bg-gradient-to-r from-amber-200 via-amber-450 to-amber-100 bg-clip-text text-transparent">ALTHERA</h1>
          <p className="text-amber-500 text-xs mt-1.5 font-mono uppercase tracking-widest font-bold">PORTAL DE COMERCIALES</p>
        </div>

        {/* Form Container */}
        <div className="bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-8 rounded-3xl shadow-2xl shadow-black/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1 tracking-tight">Acceso Representantes</h2>
            <p className="text-slate-400 text-xs text-left leading-relaxed">
              Introduce tus credenciales autorizadas administrativamente para acceder a tu panel de leads y estadísticas de ventas.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl text-left leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-amber-500/80 uppercase tracking-wider ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#060e20]/65 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-slate-100 placeholder:text-slate-650"
                  placeholder="ejemplo@althera.io"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-amber-500/80 uppercase tracking-wider ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="com_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#060e20]/65 border border-white/10 rounded-xl py-3 pl-11 pr-12 text-xs focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-slate-100 placeholder:text-slate-650"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/5 transition-all cursor-pointer mt-6 active:scale-98"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-slate-950 animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar al Panel de Ventas</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Back link */}
          <div className="mt-5 border-t border-white/5 pt-4 text-center">
            <button 
              type="button"
              onClick={onBackToLanding}
              className="text-xs text-slate-400 hover:text-white font-sans tracking-wide hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <span>← Volver a Althera Solutions</span>
            </button>
          </div>

        </div>

        {/* Technical help footer */}
        <p className="mt-8 text-center text-[10px] text-slate-500 leading-normal">
          Para crear accesos de comerciales, solicítalo al Administrador de Althera desde su portal central de control.
        </p>

      </main>
    </div>
  );
}
