import type {CityEvent,HabitFlow,PickUseCase,Product} from './mobile';
import {eventWebsite} from './event-discovery';
import {supportKindIds} from './gym-supports';
export function picksForHabit(products:Product[],useCase:PickUseCase,maxBudget=Infinity){
  return products.filter(product=>product.status==='published' && product.useCases?.includes(useCase) && (!supportKindIds.some(kind=>kind===useCase)||(product.category==='Equipment'&&product.equipmentType===useCase)) && product.price<=maxBudget).sort((a,b)=>a.price-b.price || a.id.localeCompare(b.id));
}
export function eventsForFlow(events:CityEvent[],flow:HabitFlow,now=Date.now()){
  if(!flow.eventContext)return [];
  return events.filter(event=>event.status==='published' && event.topic===flow.eventContext!.topic && (!flow.eventContext!.country || event.country===flow.eventContext!.country) && Boolean(event.registrationMode==='approval'||event.registrationUrl && eventWebsite(event.registrationUrl)) && new Date(event.endsAt??event.startsAt).getTime()>now).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
}
export function eventCost(event:CityEvent){
  return event.entryFee==null?'Price not publicly verified':event.entryFee===0?'Free entry':`From ₹${event.entryFee.toLocaleString('en-IN')}`;
}
export function eventDates(event:CityEvent){
  const date=(value:string)=>new Date(value).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return event.endsAt?`${date(event.startsAt)} – ${date(event.endsAt)}`:date(event.startsAt);
}
