import React, { useRef, useState } from 'react';
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react';

export type OfferLead = { name: string; email: string; phone: string; businessName: string };

export default function LeadGate({ onComplete }: { onComplete: (lead: OfferLead) => void }) {
  const [lead, setLead] = useState<OfferLead>({ name: '', email: '', phone: '', businessName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const sending = useRef(false);
  const inquiryId = useRef(`inq_${crypto.randomUUID()}`);
  const field = (key: keyof OfferLead) => ({ value: lead[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setLead({ ...lead, [key]: e.target.value }) });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !consent || trap) return;
    const clean = Object.fromEntries(Object.entries(lead).map(([key, value]) => [key, String(value).trim()])) as OfferLead;
    clean.email = clean.email.toLowerCase();
    if (!clean.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) || !/^\+?[\d\s()-]{7,24}$/.test(clean.phone) || clean.phone.replace(/\D/g, '').length < 7) {
      setError('Indica tu nombre, un email válido y tu teléfono con prefijo.'); return;
    }
    sending.current = true; setBusy(true); setError('');
    try {
      const { db } = await import('../../supabaseClient');
      await db.insertInquiry({ id: inquiryId.current, name: clean.name, email: clean.email,
        message: `[Web desde 49 USD · contacto previo a elegir plan]\nTeléfono / WhatsApp: ${clean.phone}\nNegocio: ${clean.businessName || 'No indicado'}\nOrigen: /webs\n\nConsentimiento para recibir la propuesta y política de privacidad aceptados: ${new Date().toISOString()}`,
        archived: false, created_at: new Date().toISOString() });
      onComplete(clean);
      requestAnimationFrame(() => document.getElementById('planes')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    } catch {
      setError('No hemos podido guardar tus datos. Inténtalo de nuevo; no se ha realizado ningún cobro.');
    } finally { sending.current = false; setBusy(false); }
  }

  return <main className="wo-lead-gate wo-wrap">
    <section className="wo-lead-pitch">
      <span className="wo-kicker">TU NEGOCIO MERECE UNA GRAN WEB</span>
      <h1>Que te vean.<br/><em>Que te elijan.</em></h1>
      <p>Tu web profesional, personalizada para ti.<br/>Primero la ves. Solo pagas si te gusta.</p>
      <div className="wo-lead-price"><span>ANTES <s>58,80 USD/mes</s></span><div><small>DESDE</small><strong>49</strong><b>USD/mes</b></div><mark>Ahorras 9,80 USD cada mes</mark></div>
      <div className="wo-lead-benefits"><span><Check size={17}/> Diseño a tu medida</span><span><Check size={17}/> Sin tarjeta para solicitar</span></div>
      <img className="wo-lead-art" src="/landing/digital-solutions-hero.png" alt="Diseño web Althera en negro y dorado" width="1672" height="941"/>
    </section>
    <section className="wo-lead-card">
      <span className="wo-kicker">01 / TU PRIMER PASO</span>
      <h2>Tu próxima web<br/>empieza contigo.</h2>
      <p>Déjanos tus datos y descubre los tres planes con su nuevo precio.</p>
      <form onSubmit={submit} className="wo-form wo-lead-form">
        <label>Tu nombre *<input {...field('name')} required maxLength={150} autoComplete="name" placeholder="¿Cómo te llamas?"/></label>
        <label>Email *<input {...field('email')} required type="email" maxLength={254} autoComplete="email" placeholder="tu@email.com"/></label>
        <label>Teléfono / WhatsApp *<input {...field('phone')} required type="tel" maxLength={24} autoComplete="tel" pattern="[+0-9 ()\-]{7,24}" placeholder="+34 600 000 000"/><small>Incluye el prefijo de tu país.</small></label>
        <label>Nombre del negocio <span className="wo-optional">Opcional</span><input {...field('businessName')} maxLength={200} autoComplete="organization" placeholder="Tu negocio o futura marca"/></label>
        <input className="wo-trap" value={trap} onChange={e=>setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"/>
        <label className="wo-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Acepto la <a href="/es/privacy" target="_blank" rel="noreferrer">política de privacidad</a> y que Althera me contacte sobre mi web.</span></label>
        {error && <p role="alert" className="wo-error">{error}</p>}
        <button className="wo-btn" disabled={busy} type="submit">{busy ? 'Guardando tus datos…' : 'Ver planes y mi descuento'}<ArrowUpRight size={21}/></button>
        <div className="wo-lead-safe"><ShieldCheck size={18}/><span>Ahora no pagas nada.<br/>12 meses de permanencia solo al contratar.</span></div>
      </form>
    </section>
  </main>;
}
