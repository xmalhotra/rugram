export const eventTimeZone='Asia/Kolkata';
type DateValue=Date|string|number;
function dateValue(value:DateValue){const date=value instanceof Date?value:new Date(value);return Number.isFinite(date.getTime())?date:null;}
export function formatInr(amount:number|null|undefined):string {
  return typeof amount==='number'&&Number.isFinite(amount)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(amount):'Price unknown';
}
export function formatEntryFee(amount:number|null|undefined){return amount==null?'Fee not confirmed':amount===0?'Free entry':formatInr(amount);}
export function formatDate(value:DateValue,options:Intl.DateTimeFormatOptions={day:'numeric',month:'short',year:'numeric'}){
 const date=dateValue(value);if(!date)return 'Date not confirmed';
 return new Intl.DateTimeFormat('en-IN',{...options,timeZone:eventTimeZone}).format(date);
}
export function formatEventTime(startsAt:DateValue,endsAt?:DateValue,dateOnly=false):string {
 const start=dateValue(startsAt);if(!start)return 'Date not confirmed';
 const end=endsAt===undefined?null:dateValue(endsAt);const validEnd=end&&end>=start?end:null;
 const options:Intl.DateTimeFormatOptions=dateOnly?{day:'numeric',month:'short',year:'numeric'}:{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'};
 return `${formatDate(start,options)}${validEnd&&validEnd.getTime()!==start.getTime()?` – ${formatDate(validEnd,options)}`:''} IST`;
}
export function habitDay(value:DateValue=new Date(),timeZone=eventTimeZone):string {
 const date=dateValue(value);if(!date)throw new RangeError('Invalid habit date.');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const part=(type:string)=>parts.find(item=>item.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function weekKey(value:DateValue=new Date(),timeZone=eventTimeZone):string {
 const date=new Date(`${habitDay(value,timeZone)}T12:00:00Z`);
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);return date.toISOString().slice(0,10);
}
export function checkedAgo(value:string|null|undefined,now:DateValue=new Date()):string {
 const date=value?dateValue(value):null;const today=dateValue(now);
 if(!date||!today||date>today)return 'Source check not confirmed';
 const days=Math.floor((today.getTime()-date.getTime())/86400000);
 return days===0?'Checked today':`Checked ${days} day${days===1?'':'s'} ago`;
}
