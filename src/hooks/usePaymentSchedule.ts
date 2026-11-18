import {useEffect,useMemo,useState,useRef} from 'react';
import {authenticatedFetch} from '../utils/authenticatedFetch';
import {buildPaymentSchedule,buildMonthlyPaymentActivity,buildPaymentMaster,type AgendaInvoice,type PaymentPlan} from '../utils/paymentSchedule';
import {adaptBitesPayments} from '../utils/bitesPayments';
import type {FinanceTransaction,ClientContact} from '../types';
export function usePaymentSchedule(enabled:boolean,transactions:FinanceTransaction[],contacts:ClientContact[]){
 const [invoices,setInvoices]=useState<AgendaInvoice[]>([]),[plans,setPlans]=useState<PaymentPlan[]>([]),[excluded,setExcluded]=useState<string[]>([]);
 const lastBites=useRef<any>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[updated,setUpdated]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{if(!enabled)return;let active=true,pending=false;
 const read=async(url:string)=>{const response=await authenticatedFetch(url,{cache:'no-store'});if(!response.ok)throw Error(url);return response.json();};
 const refresh=async()=>{if(pending)return;pending=true;setLoading(true);
  const [stripe,bites,hidden]=await Promise.allSettled([read('/api/stripe/finance-overview'),read('/api/bites/overview'),read('/api/finance/forecast-exclusions')]);
  if(active){
   const warnings:string[]=[];
   if(hidden.status==='fulfilled')setExcluded(hidden.value.keys||[]);else warnings.push('No se pudieron actualizar las exclusiones.');
   if(bites.status==='fulfilled')lastBites.current=bites.value;
   if(stripe.status==='fulfilled'&&Array.isArray(stripe.value.activeSubscriptions)){
    const sp:PaymentPlan[]=stripe.value.activeSubscriptions;
    const si:AgendaInvoice[]=[...(stripe.value.agendaInvoices||[]),...(stripe.value.standaloneActivity||[])];
    if(lastBites.current){
     const b=adaptBitesPayments(lastBites.current,sp);
     for(const invoice of b.invoices){const original=si.find(i=>i.id===invoice.id);if(original)original.origin='bites';else si.push(invoice);}
     sp.push(...b.plans);
     if(b.unpriced)warnings.push(`Bites: ${b.unpriced} suscripciones sin importe o periodo confirmado para proyectar.`);
    }
    if(bites.status==='rejected')warnings.push('Bites no se pudo actualizar. Se conserva su última información disponible.');
    setPlans(sp);setInvoices(si);setUpdated(new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
   }else warnings.push('Stripe no se pudo actualizar. Se conserva la última información disponible.');
   setError(warnings.join(' '));setLoading(false);
  }pending=false;
 };
 void refresh();const onFocus=()=>void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},300000);window.addEventListener('focus',onFocus);window.addEventListener('althera:forecast-changed',onFocus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('althera:forecast-changed',onFocus);};},[enabled,version]);
 const projected=useMemo(()=>buildPaymentSchedule(transactions,plans,contacts),[transactions,plans,contacts]);
 const history=useMemo(()=>buildMonthlyPaymentActivity(transactions,invoices,contacts,plans,new Date(),true),[transactions,invoices,contacts,plans]);
 const master=useMemo(()=>buildPaymentMaster(projected,history,excluded),[projected,history,excluded]);
 const payments=master.filter(p=>!p.excluded&&p.state!=='paid'&&!p.historical);
 const activity=master.filter(p=>!p.excluded&&p.historical);
 return {payments,activity,master,error,loading,updated,refresh:()=>setVersion(v=>v+1)};
}
