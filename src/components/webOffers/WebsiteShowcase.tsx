import React from 'react';
import {ArrowUpRight, Check, Monitor, Smartphone, Sparkles} from 'lucide-react';

export default function WebsiteShowcase(){
 return <div className="wo-site-showcase" role="img" aria-label="Ejemplo ilustrativo de una web personalizada, adaptada a ordenador y móvil">
  <div className="wo-showcase-browser"><div className="wo-showcase-chrome"><span><i/><i/><i/></span><small>tu próxima web</small><Monitor size={13}/></div><div className="wo-showcase-page"><div className="wo-showcase-nav"><b>oliva<span>®</span></b><span>ESTUDIO &nbsp; · &nbsp; PROYECTOS</span><ArrowUpRight size={17}/></div><div className="wo-showcase-content"><div><small>HECHO CON INTENCIÓN</small><h3>Lo simple.<br/><em>Lo esencial.</em></h3><p>Un espacio para contar<br/>lo que te hace diferente.</p><span className="wo-showcase-cta">Descubre el estudio <ArrowUpRight size={12}/></span></div><div className="wo-showcase-sculpture"><div/><span>Diseño que<br/>deja huella.</span></div></div><div className="wo-showcase-bottom"><span>IDENTIDAD PROPIA</span><span>DISEÑADA PARA TI <Check size={11}/></span></div></div></div>
  <div className="wo-showcase-phone"><div className="wo-showcase-notch"/><small>oliva®</small><strong>Tu marca.<br/><em>En todas<br/>partes.</em></strong><div className="wo-phone-art"/><span><Smartphone size={11}/> Lista para móvil</span></div>
  <div className="wo-showcase-caption"><Sparkles size={14}/><span>Tu negocio, convertido en una web única.</span></div>
 </div>;
}
