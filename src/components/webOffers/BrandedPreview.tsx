import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

/** Edge-to-edge presentation for independently generated links. */
export default function BrandedPreview({url,name}:{url:string;name:string}) {
  const [mobile,setMobile]=useState(false);
  const target=new URL(url);
  const localLanding=target.origin===location.origin&&/^\/(es|en)?\/?$/.test(target.pathname)&&!target.search;
  useEffect(()=>{
    const overflow=document.body.style.overflow;
    const title=document.title;
    document.body.style.overflow='hidden';
    document.title=`${name} | Althera`;
    return()=>{document.body.style.overflow=overflow;document.title=title;};
  },[name]);
  return <main className={`wo-branded-preview${mobile?' is-mobile':''}`} aria-label={name}>
    <div className="wo-branded-device"><iframe title={name} src={url} sandbox={`allow-scripts allow-forms${localLanding||target.origin!==location.origin?' allow-same-origin':''}`} referrerPolicy="no-referrer"/></div>
    <button className="wo-branded-toggle" type="button" aria-pressed={mobile} onClick={()=>setMobile(!mobile)} aria-label={mobile?'Ver vista normal':'Ver mockup móvil'}>{mobile?<Monitor size={19}/>:<Smartphone size={19}/>}<span>{mobile?'Vista normal':'Vista móvil'}</span></button>
  </main>;
}
