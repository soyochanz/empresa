import React, { useState } from 'react';
import { User, Mail, Lock, Phone, Plus, Trash2, ArrowLeft, ShieldAlert, Check } from 'lucide-react';
import { ComercialAccount, ComercialLead } from '../types';

interface ComercialesAdminScreenProps {
  comercialesList: ComercialAccount[];
  leadsList: ComercialLead[];
  onAddComercial: (comercial: ComercialAccount) => void;
  onDeleteComercial: (id: string) => void;
}

export default function ComercialesAdminScreen({
  comercialesList,
  leadsList,
  onAddComercial,
  onDeleteComercial
}: ComercialesAdminScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);

    const emailTrim = email.trim().toLowerCase();
    
    // Validations
    if (!name.trim()) {
      setErrorMsg('El nombre es requerido.');
      return;
    }
    if (!emailTrim) {
      setErrorMsg('El email es requerido.');
      return;
    }
    if (password.length < 5) {
      setErrorMsg('La contraseña debe tener al menos 5 caracteres.');
      return;
    }
    const alreadyExists = comercialesList.some(c => c.email.toLowerCase() === emailTrim);
    if (alreadyExists) {
      setErrorMsg('Ya existe un comercial registrado con este correo electrónico.');
      return;
    }

    const newComercial: ComercialAccount = {
      id: 'com_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      email: emailTrim,
      password: password,
      phone: phone.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddComercial(newComercial);
    setSuccess(true);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');

    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  // Compute metrics per commercial
  const getLeadsSummary = (comercialId: string) => {
    const comLeads = leadsList.filter(l => l.comercialId === comercialId);
    const wonLeads = comLeads.filter(l => l.status === 'Ganado');
    const totalValue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    return {
      totalLeads: comLeads.length,
      conversionRate: comLeads.length ? Math.round((wonLeads.length / comLeads.length) * 100) : 0,
      wonVolume: totalValue
    };
  };

  return (
    <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-transparent text-slate-100 relative min-h-screen">
      
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-[25%] h-[25%] bg-amber-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">
            Gestión de Comerciales
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-light">
            Crea, administra y supervisa las carteras de clientes y conversión de tu equipo de representantes de ventas.
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] text-amber-500 font-mono uppercase font-bold tracking-wider leading-none">Total Representantes</p>
            <p className="text-lg font-bold text-white mt-1 leading-none">{comercialesList.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Create form */}
        <div className="lg:col-span-4 bg-white/[0.03] border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
            <User className="text-amber-500 w-4 h-4" />
            <span>Crear Nueva Cuenta</span>
          </h3>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs mb-4 text-left">
              {errorMsg}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs mb-4 text-left flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>¡Cuenta de comercial creada correctamente!</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 text-left">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="Ej. José Manuel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="email"
                  required
                  placeholder="comercial@althera.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Contraseña de Acceso</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="Contraseña inicial del comercial"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Teléfono (Opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="+34 600 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/5 mt-6"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Registrar Comercial</span>
            </button>
          </form>
        </div>

        {/* Right Side: List of commercials */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="font-bold text-sm text-white mb-4 text-left">Representantes Autorizados</h3>

            {comercialesList.length === 0 ? (
              <div className="text-center py-14 bg-black/20 border border-white/5 rounded-2xl p-6">
                <ShieldAlert className="w-10 h-10 text-amber-500/40 mx-auto mb-3" />
                <p className="text-slate-400 text-xs font-semibold">No hay comerciales registrados.</p>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
                  Utiliza el panel lateral izquierdo para registrar una cuenta con email y contraseña para tus agentes comerciales.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-350">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase font-mono font-bold tracking-wider text-[10px]">
                      <th className="pb-3.5 pl-2">Comercial</th>
                      <th className="pb-3.5">Contacto / Teléfono</th>
                      <th className="pb-3.5 text-center">Leads Totales</th>
                      <th className="pb-3.5 text-center">Tasa Conversión</th>
                      <th className="pb-3.5 text-right">Volumen Cerrado</th>
                      <th className="pb-3.5 pr-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {comercialesList.map(c => {
                      const summary = getLeadsSummary(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center font-bold text-amber-400 text-[11px]">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs">{c.name}</p>
                                <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                                  Contraseña: <strong className="text-slate-450">{c.password}</strong>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <p className="font-medium text-slate-300">{c.email}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{c.phone || 'Sin número'}</p>
                          </td>
                          <td className="py-4 text-center">
                            <span className="font-mono font-bold text-slate-200">{summary.totalLeads}</span>
                          </td>
                          <td className="py-4 text-center">
                            <span className="font-mono font-bold text-emerald-400">{summary.conversionRate}%</span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="font-mono font-bold text-amber-400">
                              {summary.wonVolume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de que deseas revocar el acceso y eliminar la cuenta de ${c.name}?`)) {
                                  onDeleteComercial(c.id);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all group-hover:scale-105 cursor-pointer"
                              title="Revocar acceso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
