import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ComercialAccount } from '../types';

interface ComercialesAccesoScreenProps {
 comercialesList: ComercialAccount[];
 onSignInComercial: (comercial: ComercialAccount) => void;
 onBackToLanding: () => void;
}

export default function ComercialesAccesoScreen({ onBackToLanding }: ComercialesAccesoScreenProps) {
 return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
  <section className="max-w-lg rounded-3xl border border-slate-700 p-8 text-center">
   <ShieldCheck className="mx-auto mb-5 text-emerald-400" size={40} />
   <h1 className="text-2xl font-semibold">Estamos mejorando la seguridad del acceso</h1>
   <p className="mt-4 text-slate-300">El portal de comerciales está temporalmente pausado. Contacta con administración para continuar tu gestión.</p>
   <button className="mt-6 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950" onClick={onBackToLanding}>Volver a Althera</button>
  </section>
 </main>;
}
