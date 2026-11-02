import {useEffect,useMemo,useState} from 'react';
import {authenticatedFetch} from '../utils/authenticatedFetch';
import {buildPaymentSchedule,type PaymentPlan} from '../utils/paymentSchedule';
import type {FinanceTransaction,ClientContact} from '../types';
export function usePaymentSchedule(enabled:boolean,transactions:FinanceTransaction[],contacts:ClientContact[]){
 const [plans,setPlans]=useState<PaymentPlan[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [updated,setUpdated]=useState('');const [version,setVersion]=useState(0);
 useEffect(()=>{if(!enabled){setPlans([]);setUpdated('');return;}let active=true;let pending=false;
 const refresh=async()=>{if(pending)return;pending=true;setLoading(true);try{const response=await authenticatedFetch('/api/stripe/finance-overview',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.activeSubscriptions))throw Error();if(active){setPlans(data.activeSubscriptions);setUpdated(new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));setError('');}}catch{if(active)setError('No se pudo actualizar Stripe. Sus fechas pueden estar desactualizadas.');}finally{pending=false;if(active)setLoading(false);}};
 void refresh();const onFocus=()=>{void refresh();};const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},300000);window.addEventListener('focus',onFocus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',onFocus);};},[enabled,version]);
 const payments=useMemo(()=>buildPaymentSchedule(transactions,plans,contacts),[transactions,plans,contacts]);
 return {payments,error,loading,updated,refresh:()=>setVersion(v=>v+1)};
}
