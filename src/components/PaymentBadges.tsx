import React from 'react';
import {RefreshCw,CreditCard,Landmark,Banknote,Smartphone,Wallet} from 'lucide-react';
import type {ScheduledPayment} from '../utils/paymentSchedule';
export default function PaymentBadges({payment:p}:{payment:ScheduledPayment}){
 const method=p.method.replace(/^Stripe\s*[·:]?\s*/i,'').trim();
 const wallet=/apple pay|google pay/i.test(method),bank=/sepa|domiciliaci|transfer|banc/i.test(method),cash=/efectivo|cash/i.test(method),card=/tarjeta|card/i.test(method);
 const Icon=wallet?Smartphone:bank?Landmark:cash?Banknote:card?CreditCard:Wallet;
 const label=method==='automático'?'Automático':method||'Método no disponible';
 return <div className="pay-badges">{p.recurring&&<span className="pay-badge recurrence"><RefreshCw size={13}/><span>{p.period==='yearly'?'Anual':p.period==='weekly'?'Semanal':'Mensual'}</span><span className="pay-badge-hint">Recurrente</span></span>}
 <span className={`pay-badge method ${p.source}`}>
 {p.source==='stripe'&&<><img src="/stripe-mark.png" alt=""/><span className="pay-processor">Stripe</span><i/></>}
 <Icon size={15}/><span>{label}</span></span>
 {p.discountApplied&&<span className="pay-badge discount">{p.amount===0?'Sin cargo · descuento':'Descuento aplicado'}</span>}</div>;
}
