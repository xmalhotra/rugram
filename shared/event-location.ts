import type {CityEvent} from './mobile';
import {hyderabadTechEvents} from './hyderabad-tech';
export type EventScope={eventCities:string[];eventCountry:string;eventTopics:string[]};
const key=(value:string)=>value.trim().toLowerCase();
export function eventCities(scope?:EventScope){
  return [...new Map((scope?.eventCities??['Hyderabad']).map(city=>city.trim()).filter(Boolean).map(city=>[key(city),city])).values()];
}
export function eventCity(cities:string[],preferred?:string|null){return cities.find(city=>key(city)===key(preferred??''))??cities[0]??null;}
export function eventsInCity(events:CityEvent[],city:string|null,scope?:EventScope,now=Date.now()){
  if(!city||!eventCities(scope).some(allowed=>key(allowed)===key(city)))return [];
  return hyderabadTechEvents(events,now,scope).filter(event=>key(event.city)===key(city));
}
