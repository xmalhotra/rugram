import type {CityEvent} from './mobile';
import type {EventTopic} from './event-discovery';
export type EventInterest={id:string;title:string;illustration:string;topics:EventTopic[];keywords:string[]};
export const eventInterests:EventInterest[]=[
  {id:'tech',title:'Tech',illustration:'coding',topics:['Tech'],keywords:[]},
  {id:'marathons',title:'Marathons',illustration:'running',topics:['Marathons'],keywords:[]},
  {id:'hyrox-simulations',title:'HYROX simulations',illustration:'hyrox',topics:['HYROX simulations'],keywords:[]},
  {id:'reading-groups',title:'Reading groups',illustration:'reading',topics:['Reading groups'],keywords:[]},
];
export const defaultEventTopics:EventTopic[]=['Tech','Marathons','HYROX simulations','Reading groups'];
export function enabledEventInterests(interests:EventInterest[],topics:readonly string[]){return interests.filter(interest=>interest.topics.some(topic=>topics.includes(topic)));}
export function eventMatchesInterest(event:CityEvent,interest:EventInterest){
  if(!event.topic||!interest.topics.includes(event.topic))return false;
  const text=` ${[event.title,event.description,event.audience??''].join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')} `;
  return interest.keywords.length===0||interest.keywords.some(keyword=>text.includes(` ${keyword.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')} `));
}
