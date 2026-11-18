import React from 'react';
export const CHARGE_CONCEPTS = ['Desarrollo web (Web)','Posicionamiento SEO','Growth Mail Marketing','Gestión de redes sociales','Campañas Meta Ads','Campañas Google Ads','Mantenimiento web','Automatización e inteligencia artificial','Bites · Carta digital','InstaRemoveAI · Suscripción','Diseño e identidad de marca','Consultoría digital'];
export default function ChargeConceptPicker({onSelect}:{onSelect:(value:string)=>void}){
 return <select aria-label="Elegir concepto de servicio" value="" onChange={e=>{if(e.target.value)onSelect(e.target.value);}} className="charge-concept-picker"><option value="">Elegir servicio…</option>{CHARGE_CONCEPTS.map(c=><option key={c} value={c}>{c}</option>)}</select>;
}
