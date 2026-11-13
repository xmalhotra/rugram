import type {CityEvent} from './mobile';
import type {EventTopic} from './event-discovery';
export type EventInterest={id:string;title:string;illustration:string;topics:EventTopic[];keywords:string[]};
/** A category page's live numbers for the viewer. */
export type EventCategorySummary={id:string;subscribers:number;subscribed:boolean};
export const eventInterests:EventInterest[]=[
  // The five Luma-style categories; Running covers races and HYROX, Books covers reading groups.
  {id:'tech',title:'Tech',illustration:'coding',topics:['Tech'],keywords:[]},
  {id:'ai',title:'AI',illustration:'ai',topics:['AI'],keywords:[]},
  {id:'marathons',title:'Running',illustration:'running',topics:['Marathons','HYROX','HYROX simulations'],keywords:[]},
  {id:'food-drink',title:'Food & Drink',illustration:'morning-drinks',topics:['Food & Drink'],keywords:[]},
  {id:'reading-groups',title:'Books',illustration:'reading',topics:['Reading groups'],keywords:[]},
];
// 'Other' carries a host's own topic label and appears under All, not a category.
export const defaultEventTopics:EventTopic[]=['Tech','AI','Marathons','HYROX','HYROX simulations','Reading groups','Food & Drink','Other'];
export function enabledEventInterests(interests:EventInterest[],topics:readonly string[]){return interests.filter(interest=>interest.topics.some(topic=>topics.includes(topic)));}
export function eventMatchesInterest(event:CityEvent,interest:EventInterest){
  if(!event.topic||!interest.topics.includes(event.topic))return false;
  const text=` ${[event.title,event.description,event.audience??''].join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')} `;
  return interest.keywords.length===0||interest.keywords.some(keyword=>text.includes(` ${keyword.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')} `));
}
