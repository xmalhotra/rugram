export const defaultMonthlyEventLimit=2;
export function eventMonth(now=Date.now()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(part=>part.type==='year')!.value);const month=Number(parts.find(part=>part.type==='month')!.value);
  return {key:`${year}-${String(month).padStart(2,'0')}`,start:new Date(Date.UTC(year,month-1,1)-19800000).toISOString(),end:new Date(Date.UTC(year,month,1)-19800000).toISOString()};
}
export type CreatorEventQuota={month:string;limit:number;used:number;remaining:number;resetsAt:string};
export function creatorEventQuota(limit:number|undefined,used:number,now=Date.now()):CreatorEventQuota{const period=eventMonth(now);const maximum=limit??defaultMonthlyEventLimit;return {month:period.key,limit:maximum,used,remaining:Math.max(0,maximum-used),resetsAt:period.end};}
