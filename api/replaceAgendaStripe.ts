import type Stripe from 'stripe';
/** Retire a previous agreement only after its replacement Checkout is ready.
 * No refunds, prorations or immediate invoices. Retry uses the same replacement.
 */
export async function retireAgendaStripe(stripe:Stripe,input:{clientId:string;newSessionId:string;subscriptionId?:string;sessionId?:string}){
 const {clientId,newSessionId,subscriptionId,sessionId}=input;
 if(!clientId||!/^cs_/.test(newSessionId)||(!subscriptionId&&!sessionId)||subscriptionId&&sessionId)throw Error('Selecciona un único enlace o suscripción anterior.');
 const next=await stripe.checkout.sessions.retrieve(newSessionId);
 if(next.metadata?.clientId!==clientId||!next.metadata?.pendingTxId?.startsWith('agenda_')||next.status!=='open'||next.mode!=='subscription')throw Error('El enlace sustituto no está preparado para este cliente.');
 const old:any=subscriptionId?await stripe.subscriptions.retrieve(subscriptionId):await stripe.checkout.sessions.retrieve(sessionId!);
 if(old.id===newSessionId)throw Error('El enlace anterior y el nuevo deben ser distintos.');
 if(old.metadata?.clientId!==clientId)throw Error('La recurrencia anterior no está vinculada a este cliente. Revísala en Stripe.');
 if(old.metadata?.agenda_replacement&&old.metadata.agenda_replacement!==newSessionId)throw Error('Esta recurrencia ya tiene otro enlace sustituto. Actualiza la agenda.');
 if(!subscriptionId&&old.status==='complete')throw Error('Este enlace ya se completó. Edita la suscripción activa desde la agenda.');
 if(subscriptionId){
  await stripe.subscriptions.update(old.id,{metadata:{agenda_replacement:newSessionId}});
  if(old.status!=='canceled')await stripe.subscriptions.cancel(old.id,{invoice_now:false,prorate:false});
 }else{
  await stripe.checkout.sessions.update(old.id,{metadata:{agenda_replacement:newSessionId,althera_replaced:'true',replaced_by_session_id:newSessionId}});
  if(old.status==='open')await stripe.checkout.sessions.expire(old.id);
 }
 return {retiredId:old.id,newSessionId};
}
