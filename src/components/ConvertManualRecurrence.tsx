import React,{useState,useRef} from 'react';
import {db} from '../supabaseClient';
import {convertManualRecurrence} from '../utils/convertManualRecurrence';
import {toFinanceDateKey} from '../utils/financeRecurrence';
import type {ScheduledPayment} from '../utils/paymentSchedule';
export default function ConvertManualRecurrence({payment,onSaved,onClose}:{payment:ScheduledPayment;onSaved:()=>void;onClose:()=>void}){
 const [date,setDate]=useState(toFinanceDateKey(new Date())),[limited,setLimited]=useState(false),[count,setCount]=useState('12'),[error,setError]=useState(''),[busy,setBusy]=useState(false);const running=useRef(false);
 async function submit(e:React.FormEvent){e.preventDefault();if(running.current)return;running.current=true;setBusy(true);setError('');try{
 const all=await db.getFinanceTransactions();const source=all.find(t=>t.id===payment.transactionId);if(!source)throw Error('No se encuentra el cobro original.');
 const next=convertManualRecurrence(source,date,limited?count:'');
 if(next.id===source.id)await db.updateFinanceTransaction(next);else if(!all.some(t=>t.id===next.id))await db.insertFinanceTransaction(next);else throw Error('Este cobro ya tiene una recurrencia creada.');
 window.dispatchEvent(new Event('althera:forecast-changed'));onSaved();onClose();
 }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{running.current=false;setBusy(false);}}
 return <form className="pay-create" onSubmit={submit}><h3>Hacer recurrente</h3><p>{payment.customer} · {payment.description}</p><fieldset disabled={busy}><label>Primer vencimiento · se repetirá ese día cada mes<input required type="date" min={toFinanceDateKey(new Date())} value={date} onChange={e=>setDate(e.target.value)}/></label><p>Día {Number(date.slice(-2))} de cada mes. Si el mes es más corto, se usará su último día.</p><label>Duración<select value={limited?'limited':'unlimited'} onChange={e=>setLimited(e.target.value==='limited')}><option value="unlimited">Sin límite</option><option value="limited">Número de meses</option></select></label>{limited&&<label>Meses, incluido el primer vencimiento<input required type="number" min="1" max="120" value={count} onChange={e=>setCount(e.target.value)}/></label>}<p>{payment.state==='paid'?'El cobro recibido se conserva. Se crea una nueva recurrencia pendiente.':'Este cobro se convertirá en el primer vencimiento de la recurrencia.'} No se realizan cargos automáticos.</p></fieldset>{error&&<p role="alert">{error}</p>}<div className="pay-toolbar"><button disabled={busy} type="submit">{busy?'Guardando…':'Crear recurrencia mensual'}</button><button type="button" disabled={busy} onClick={onClose}>Volver</button></div></form>;
}
