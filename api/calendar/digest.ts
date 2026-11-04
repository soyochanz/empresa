export function localClock(date:Date,timezone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||'';
 return {date:`${get('year')}-${get('month')}-${get('day')}`,minutes:Number(get('hour'))*60+Number(get('minute'))};
}
export function eventVisible(event:any,userId:string,email:string){
 const meta:Record<string,string>={};
 for(const line of String(event.description||'').split('---METADATA---')[1]?.split('\n')||[]){const index=line.indexOf(':');if(index>0)meta[line.slice(0,index).trim()]=line.slice(index+1).trim();}
 if(['done','archived','postponed'].includes(meta.status)||meta.isPrivate==='true')return false;
 let emails:string[]=[];try{emails=(meta.assignedUserEmails||'').split(',').map(decodeURIComponent);}catch{return false;}
 emails.push(meta.assignedUserEmail||'');emails=emails.filter(Boolean).map(e=>e.toLowerCase());
 return (!emails.length&&!meta.assignedUserId)||meta.assignedUserId===userId||emails.includes(email.toLowerCase())||emails.some(e=>['todos-admins','todos-comerciales'].includes(e));
}
export function validPushEndpoint(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname.endsWith('.push.apple.com')||url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com');}catch{return false;}
}
