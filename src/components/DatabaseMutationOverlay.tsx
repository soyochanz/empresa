import { useEffect, useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { DatabaseMutationState, subscribeToDatabaseMutations } from '../supabaseClient';

const IDLE_STATE: DatabaseMutationState = { active: false, pending: 0 };

export default function DatabaseMutationOverlay() {
 const [state, setState] = useState<DatabaseMutationState>(IDLE_STATE);

 useEffect(() => {
  const lockedForms = new Map<HTMLFormElement, { sawMutation: boolean; timeout: number }>();
  const unlockForm = (form: HTMLFormElement) => {
   const locked = lockedForms.get(form);
   if (!locked) return;
   window.clearTimeout(locked.timeout);
   form.removeAttribute('aria-busy');
   lockedForms.delete(form);
  };
  const handleSubmit = (event: SubmitEvent) => {
   const form = event.target instanceof HTMLFormElement ? event.target : null;
   if (!form) return;
   if (lockedForms.has(form)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
   }

   form.setAttribute('aria-busy', 'true');
   const timeout = window.setTimeout(() => {
    const locked = lockedForms.get(form);
    if (locked && !locked.sawMutation) unlockForm(form);
   }, 1_500);
   lockedForms.set(form, { sawMutation: false, timeout });
  };

  document.addEventListener('submit', handleSubmit, true);
  const unsubscribe = subscribeToDatabaseMutations(nextState => {
   setState(nextState);
   if (nextState.active) {
    lockedForms.forEach(locked => { locked.sawMutation = true; });
   } else {
    [...lockedForms.entries()]
     .filter(([, locked]) => locked.sawMutation)
     .forEach(([form]) => unlockForm(form));
   }
  });

  return () => {
   unsubscribe();
   document.removeEventListener('submit', handleSubmit, true);
   [...lockedForms.keys()].forEach(unlockForm);
  };
 }, []);

 if (!state.active) return null;

 return (
  <div
   className="fixed inset-0 z-[20000] flex cursor-wait items-center justify-center bg-[#030407]/80 p-4 backdrop-blur-md"
   role="status"
   aria-live="assertive"
   aria-busy="true"
   aria-label="Guardando cambios"
  >
   <div className="w-full max-w-sm rounded-[28px] border border-[#d6b96f]/25 bg-[#090b10]/95 px-7 py-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.75)]">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d6b96f]/25 bg-[#d6b96f]/10 text-[#e8cf91]">
     <Loader2 className="h-8 w-8 animate-spin" />
    </div>
    <h2 className="mt-5 text-lg font-black tracking-tight text-white">Guardando cambios…</h2>
    <p className="mt-2 text-xs leading-5 text-slate-400">
     Espera a que Supabase confirme la operación. La pantalla está bloqueada para evitar registros duplicados.
    </p>
    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
     <LockKeyhole className="h-3.5 w-3.5 text-[#d6b96f]" /> Operación protegida
    </div>
   </div>
  </div>
 );
}
