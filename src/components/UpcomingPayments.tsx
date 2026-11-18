import {authenticatedFetch} from '../utils/authenticatedFetch';
import MarkScheduledPaymentPaid from './MarkScheduledPaymentPaid';
import CalendarMobile from './CalendarMobile';
import RenewPaymentLink from './RenewPaymentLink';
import NewScheduledPayment from './NewScheduledPayment';
import type {ClientContact} from '../types';
import React,{useState,useEffect,useRef} from 'react';
import {CalendarDays,ChevronRight,RefreshCw,X,Plus,Copy,Check,CreditCard,Landmark,Banknote,Trash2,Undo2} from 'lucide-react';
import {paymentMoney,paymentKey,paymentCanBeExcluded,groupPayments,buildPaymentMaster,type ScheduledPayment} from '../utils/paymentSchedule';
import {toFinanceDateKey} from '../utils/financeRecurrence';
import './upcomingPayments.css';
export function PaymentRows({payments,onEdit,onRenew,onMarkPaid,onExclude}:{onExclude?:(p:ScheduledPayment)=>void;onMarkPaid?:(p:ScheduledPayment)=>void;onRenew?:(p:ScheduledPayment)=>void;payments:ScheduledPayment[];onEdit?:(p:ScheduledPayment)=>void}){
 const [copied,setCopied]=useState('');const [copyError,setCopyError]=useState('');
 async function copyLink(p:ScheduledPayment){try{await navigator.clipboard.writeText(p.url!);setCopied(p.id);setCopyError('');}catch{setCopyError('No se pudo copiar. Mantén pulsado el enlace para copiarlo.');}}
 return <div className="pay-rows">{copyError&&<p role="alert">{copyError}</p>}{payments.map(p=><article key={p.id} className={`pay-row state-${p.excluded?'excluded':p.processing?'processing':p.state|| (p.overdue?'overdue':'scheduled')} ${p.overdue?'pay-overdue':''}`}>
  <time dateTime={p.date}>{new Date(`${p.date}T12:00:00`).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}<small className={`pay-state ${p.state||''}`}>{p.excluded?'Eliminado de previsión':p.processing?'Pago iniciado · pendiente de confirmación':p.state==='paid'?'Pagado':p.state==='failed'?'Fallido':p.awaitingActivation?'Pendiente de activar':p.overdue?'Vencido · pendiente':p.state==='pending'?'Pendiente':p.date===toFinanceDateKey(new Date())?'Hoy':'Programado'}</small></time>
  <div className="pay-business"><span className="pay-logo"><span>{p.customer.split(/\s+/).slice(0,2).map(w=>w[0]).join('')}</span>{p.logo&&<img src={p.logo} alt={`Logo de ${p.customer}`} onError={e=>{e.currentTarget.style.display='none';}}/>}</span><div><strong>{p.customer}</strong>{p.person&&p.person!==p.customer&&<small className="pay-person">{p.person}</small>}<p>{p.description}</p><span className={`pay-source ${p.source}`}>{p.source==='stripe'&&<img className="pay-stripe-icon" src="/stripe-mark.png" alt="Stripe"/>}{/tarjeta|card|pay/i.test(p.method)?<CreditCard size={14}/>: /sepa|transfer|banc/i.test(p.method)?<Landmark size={14}/>:p.method==='Efectivo'?<Banknote size={14}/>:null}{p.method}</span>{p.estimated&&<small>Previsión estimada</small>}</div></div>
  <b>{paymentMoney(p)}</b>{!p.excluded&&onMarkPaid&&p.source==='manual'&&p.state!=='paid'&&p.transactionId&&<button type="button" onClick={()=>onMarkPaid(p)}>Marcar como pagado</button>}{!p.excluded&&onRenew&&p.renewable&&<button type="button" onClick={()=>onRenew(p)}>Renovar enlace</button>}{!p.excluded&&onEdit&&!p.historical&&<button type="button" onClick={()=>onEdit(p)}>Editar</button>}{p.url&&p.awaitingActivation&&<button type="button" aria-label={`Copiar enlace de pago de ${p.customer}`} onClick={()=>void copyLink(p)}>{copied===p.id?<Check size={15}/>:<Copy size={15}/>} {copied===p.id?'Copiado':'Copiar enlace'}</button>}{onExclude&&paymentCanBeExcluded(p)&&<button className="pay-remove" type="button" onClick={()=>onExclude(p)}>{p.excluded?<Undo2 size={14}/>:<Trash2 size={14}/>} {p.excluded?'Restaurar':'Eliminar de previsión'}</button>}{p.url&&<a href={p.url} target="_blank" rel="noreferrer">{p.awaitingActivation?'Enlace ↗':'Stripe ↗'}</a>}
 </article>)}{!payments.length&&<p className="pay-empty">No hay cobros en esta vista.</p>}</div>;
}
export default function UpcomingPayments({inline=false,payments,activity=[],master,error,loading,updated,onRefresh,onCalendar,contacts}:{inline?:boolean;master?:ScheduledPayment[];activity?:ScheduledPayment[];contacts:ClientContact[];payments:ScheduledPayment[];error:string;loading:boolean;updated:string;onRefresh:()=>void;onCalendar:()=>void}){
 const [markingPaid,setMarkingPaid]=useState<ScheduledPayment>();
 const [renewing,setRenewing]=useState<ScheduledPayment>();
 const [open,setOpen]=useState(new URLSearchParams(window.location.search).get('cobros')==='1');
 const [creating,setCreating]=useState(false),[editing,setEditing]=useState<ScheduledPayment>();
 const [filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[period,setPeriod]=useState('all');
 const [removing,setRemoving]=useState<ScheduledPayment>(),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState('');
 const confirmationRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(removing){confirmationRef.current?.scrollIntoView({block:'center',behavior:'smooth'});confirmationRef.current?.focus({preventScroll:true});}},[removing]);
 const today=toFinanceDateKey(new Date());
 const rows=master||buildPaymentMaster(payments,activity);
 const next=rows.find(p=>!p.excluded&&p.state!=='paid'&&!p.awaitingActivation&&p.date>=today);
 const visible=rows.filter(p=>{
  if(filter==='excluded'?!p.excluded:p.excluded)return false;
  if(filter==='paid'&&p.state!=='paid'||filter==='failed'&&p.state!=='failed'||filter==='pending'&&(p.state==='paid'||p.state==='failed')||filter==='stripe'&&p.source!=='stripe'||filter==='manual'&&p.source!=='manual')return false;
  if(period==='month'&&p.date.slice(0,7)!==today.slice(0,7)||period==='future'&&p.date<today)return false;
  return `${p.customer} ${p.person||''} ${p.description} ${p.origin||''}`.toLowerCase().includes(search.toLowerCase());
 });
 const groups=groupPayments(visible);
 const totals=new Map<string,{paid:number,pending:number}>();
 for(const p of visible){if(p.excluded)continue;const t=totals.get(p.currency)||{paid:0,pending:0};if(p.state==='paid')t.paid+=p.amount;else t.pending+=p.amount;totals.set(p.currency,t);}
 async function exclude(){if(!removing||busy)return;setBusy(true);setSaveError('');try{
  const response=await authenticatedFetch('/api/finance/forecast-exclusions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:paymentKey(removing),excluded:!removing.excluded})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo guardar.');
  window.dispatchEvent(new Event('althera:forecast-changed'));
  onRefresh();setRemoving(undefined);
 }catch(e){setSaveError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}
 return <>
 {!inline&&<button className="pay-bar" onClick={()=>setOpen(true)}><CalendarDays size={19}/><strong>Próximos cobros</strong><span>{next?`${next.date} · ${next.origin||next.customer} · ${paymentMoney(next)}`:loading?'Actualizando…':'Ver agenda de cobros'}</span><ChevronRight size={18}/></button>}
 {(open||inline)&&<div className={inline?'pay-inline':'pay-backdrop'} onClick={()=>!inline&&setOpen(false)}><section className="pay-panel" role={inline?'region':'dialog'} aria-modal={inline?undefined:true} aria-label="Próximos cobros" onClick={e=>e.stopPropagation()}>
 <header><div><span className="pay-eyebrow">FINANZAS / AGENDA</span><h2>Todos tus cobros. Un solo lugar.</h2><p>Historial y previsión de los próximos 12 meses, por empresa.</p></div>{!inline&&<button aria-label="Cerrar próximos cobros" onClick={()=>setOpen(false)}><X/></button>}</header>
 <CalendarMobile mode="payments"/>
 <div className="pay-toolbar"><button onClick={()=>{setEditing(undefined);setCreating(true);}}><Plus size={17}/> Nuevo cobro</button><button disabled={loading} onClick={onRefresh}><RefreshCw size={16}/>{loading?'Actualizando…':'Actualizar'}</button><button onClick={()=>{setOpen(false);onCalendar();}}>Ver calendario</button><small>{updated&&`Actualizado ${updated}`}</small></div>
 {error&&<p role="alert" className="pay-warning">{error}</p>}
 {removing&&<section ref={confirmationRef} tabIndex={-1} className="pay-month-history" role="alertdialog" aria-label="Eliminar de previsión"><h3>{removing.excluded?'Restaurar cobro':'Eliminar de previsión'}</h3><p>{removing.customer} · {paymentMoney(removing)} · {removing.date}</p><p>Se retira solo esta cuota de la agenda y del cálculo de previsión. Podrás recuperarla en «Eliminados». No borra movimientos ni cancela suscripciones o enlaces de Stripe.</p>{saveError&&<p role="alert">{saveError}</p>}<div className="pay-toolbar"><button disabled={busy} onClick={()=>void exclude()}>{busy?'Guardando…':removing.excluded?'Restaurar':'Confirmar eliminación'}</button><button disabled={busy} onClick={()=>setRemoving(undefined)}>Cancelar</button></div></section>}
 {markingPaid?<MarkScheduledPaymentPaid payment={markingPaid} onSaved={onRefresh} onClose={()=>setMarkingPaid(undefined)}/>:renewing?<RenewPaymentLink payment={renewing} contacts={contacts} onSaved={onRefresh} onClose={()=>setRenewing(undefined)}/>:creating?<NewScheduledPayment key={editing?.id||'new'} editing={editing} contacts={contacts} onSaved={onRefresh} onClose={()=>setCreating(false)}/>:<>
 <div className="pay-filters"><input placeholder="Buscar empresa, cliente o servicio" aria-label="Buscar cobros" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrar cobros" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos los estados</option><option value="pending">Pendientes y próximos</option><option value="paid">Pagados</option><option value="failed">Fallidos / caducados</option><option value="stripe">Stripe</option><option value="manual">Fuera de Stripe</option><option value="excluded">Eliminados</option></select><select aria-label="Periodo de cobros" value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">Todo el historial y previsión</option><option value="month">Este mes</option><option value="future">Desde hoy</option></select></div>
 <div className="pay-summary">{[...totals].map(([currency,t])=><div key={currency}><small>{currency} · vista seleccionada</small><strong>{paymentMoney({amount:t.pending,currency})}</strong><span>por cobrar / previsto</span><small>{paymentMoney({amount:t.paid,currency})} recibidos</small></div>)}</div>
 <div className="pay-groups">{groups.map(group=><details key={group.id} className="pay-group" open><summary><div className="pay-group-brand">{group.origin==='instaremoveai'?<img className="pay-product-logo insta" src="/instaremove-logo-transparent.png" alt="InstaremoveAI"/>:group.origin==='bites'?<img className="pay-product-logo bites" src="/bites-logo.png" alt="Bites"/>:group.logo?<img className="pay-company-logo" src={group.logo} alt=""/>:null}<strong>{group.name}</strong></div><span>{group.payments.length} cobros <ChevronRight size={16}/></span></summary><PaymentRows payments={group.payments} onMarkPaid={setMarkingPaid} onRenew={setRenewing} onExclude={p=>{setSaveError('');setRemoving(p);}} onEdit={p=>{setEditing(p);setCreating(true);}}/></details>)}{!groups.length&&<p className="pay-empty">No hay cobros con estos filtros.</p>}</div>
 </>}
 <footer>Los importes futuros son previsiones. Las divisas se muestran separadas. Los pagos por domiciliación no se consideran cobrados hasta su confirmación.</footer>
 </section></div>}
 </>;
}
