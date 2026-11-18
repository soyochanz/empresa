export interface ForecastDiscount {percent?:number;amount?:number;end?:number;start?:number;once?:boolean}
export function discountedForecastAmount(base:number,discounts:ForecastDiscount[],date:string){
 let cents=Math.round(base*100);const at=Date.parse(date)/1000;
 for(const d of discounts){if(d.once||(d.end&&at>=d.end)||(d.start&&at<d.start))continue;
  if(d.percent!=null)cents=Math.round(cents*(1-d.percent/100));
  else if(d.amount!=null)cents-=Math.round(d.amount*100);
 }
 return Math.max(0,cents)/100;
}
