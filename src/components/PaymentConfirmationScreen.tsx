import { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';

type ConfirmationState = 'checking' | 'confirmed' | 'scheduled' | 'error';

export default function PaymentConfirmationScreen() {
 const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
 const sessionId = initialParams.get('stripe_session_id') || '';
 const amount = initialParams.get('amount') || '';
 const [state, setState] = useState<ConfirmationState>('checking');
 const [error, setError] = useState('');

 useEffect(() => {
  let cancelled = false;

  const verifyPayment = async () => {
   if (!sessionId) {
    setState('error');
    setError('No se ha recibido una referencia de pago válida.');
    return;
   }

   try {
    const response = await fetch(`/api/stripe/retrieve-session?sessionId=${encodeURIComponent(sessionId)}`, {
     headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo verificar el pago.');
    if (cancelled) return;

    if (data.paymentStatus === 'paid') {
     setState('confirmed');
    } else if (data.paymentStatus === 'no_payment_required' && data.firstPaymentDate) {
     setState('scheduled');
    } else {
     throw new Error('Stripe todavía no ha confirmado el pago.');
    }
   } catch (verificationError: any) {
    if (cancelled) return;
    setError(verificationError?.message || 'No se pudo verificar el pago.');
    setState('error');
   }
  };

  void verifyPayment();
  return () => { cancelled = true; };
 }, [sessionId]);

 const isChecking = state === 'checking';
 const isConfirmed = state === 'confirmed';
 const isScheduled = state === 'scheduled';

 return (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060708] px-5 py-12 font-sans text-white">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(213,184,112,0.13),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(72,143,137,0.08),transparent_30%)]" />
   <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:52px_52px]" />

   <section className="relative w-full max-w-xl overflow-hidden rounded-[34px] border border-[#d8bd78]/20 bg-[#0b0d0f]/95 px-6 py-9 text-center shadow-[0_35px_120px_rgba(0,0,0,.72)] backdrop-blur-2xl sm:px-12 sm:py-12">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8bd78]/25 bg-[#d8bd78]/[0.07] text-xl font-semibold tracking-[-.08em] text-[#e3cb8e] shadow-[0_12px_35px_rgba(216,189,120,.08)]">
     A<span className="text-white/70">↗</span>
    </div>
    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.32em] text-[#d8bd78]">Althera Solutions</p>

    <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.035]">
     {isChecking && <LoaderCircle className="h-9 w-9 animate-spin text-[#d8bd78]" />}
     {(isConfirmed || isScheduled) && <Check className="h-9 w-9 text-emerald-300" strokeWidth={2.2} />}
     {state === 'error' && <TriangleAlert className="h-9 w-9 text-amber-300" />}
    </div>

    <h1 className="mt-7 text-3xl font-light tracking-[-.035em] text-white sm:text-[2.55rem]">
     {isChecking && 'Confirmando tu pago'}
     {isConfirmed && 'Tu pago se ha registrado'}
     {isScheduled && 'Tu método de pago se ha registrado'}
     {state === 'error' && 'Estamos verificando el pago'}
    </h1>

    <p className="mx-auto mt-4 max-w-md text-sm font-light leading-7 text-white/55 sm:text-base">
     {isChecking && 'Estamos comprobando la confirmación directamente con Stripe. Solo tardará un momento.'}
     {isConfirmed && 'Gracias por formar parte de Althera.'}
     {isScheduled && 'El primer cobro se realizará en la fecha acordada. Gracias por formar parte de Althera.'}
     {state === 'error' && error}
    </p>

    {isConfirmed && amount && (
     <div className="mx-auto mt-7 flex max-w-xs items-center justify-between rounded-2xl border border-white/[0.07] bg-black/20 px-5 py-4 text-left">
      <span className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/35">Pago confirmado</span>
      <span className="text-base font-semibold text-emerald-300">{amount} €</span>
     </div>
    )}

    {(isConfirmed || isScheduled) && (
     <div className="mt-7 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[.16em] text-white/30">
      <ShieldCheck className="h-4 w-4 text-emerald-300/70" /> Verificado de forma segura con Stripe
     </div>
    )}

    {!isChecking && (
     <button
      type="button"
      onClick={() => window.location.assign('/')}
      className="mt-9 w-full rounded-full bg-[#dfc580] px-6 py-3.5 text-xs font-semibold text-[#15130e] transition hover:bg-[#ecd799] focus:outline-none focus:ring-2 focus:ring-[#dfc580]/50 focus:ring-offset-2 focus:ring-offset-[#0b0d0f]"
     >
      Volver a Althera
     </button>
    )}
   </section>
  </main>
 );
}
