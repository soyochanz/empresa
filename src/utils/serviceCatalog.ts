import type {ClientContact} from '../types';
export const SERVICE_CATALOG = [
 {value:'Web',label:'Web',description:'Diseño y desarrollo'},
 {value:'SEO',label:'SEO',description:'Posicionamiento en buscadores'},
 {value:'RRSS',label:'Redes sociales',description:'Contenido y gestión de redes'},
 {value:'Email marketing',label:'Email marketing',description:'Campañas y automatizaciones de correo'},
 {value:'Meta Ads',label:'Meta Ads',description:'Publicidad en Instagram y Facebook'},
 {value:'Google Ads',label:'Google Ads',description:'Publicidad en buscadores'},
 {value:'IA',label:'IA',description:'Automatización inteligente'},
 {value:'Bitesmenus',label:'Bitesmenus',description:'Carta digital'},
 {value:'Mantenimiento',label:'Mantenimiento',description:'Soporte y actualizaciones web'},
] as const;
export type ServiceProduct = typeof SERVICE_CATALOG[number]['value'];
const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const aliases: Record<string,string[]> = {SEO:['seo','posicionamiento seo','posicionamiento web'],RRSS:['rrss','redes sociales','gestion de redes','social media'],Web:['web','website'], 'Email marketing':['email marketing','mail marketing'],Bitesmenus:['bites','bitesmenus','menu inteligente']};
export function hasService(contact:ClientContact, service:string) {
 return contact.status === 'Client' && !contact.archived && (contact.requestedProducts||[]).some(value => (aliases[service]||[service]).some(alias=>normalize(alias)===normalize(value)));
}
