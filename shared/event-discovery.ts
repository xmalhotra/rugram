import type {CityEvent} from './mobile';
export const eventTopics=['Tech','AI','HYROX','Marathons','HYROX simulations','Reading groups','Food & Drink','Other'] as const;
export type EventTopic=typeof eventTopics[number];
export function eventWebsite(url:string):string|null {
  try {
    const parsed=new URL(url);
    if(parsed.protocol!=='https:' || parsed.username || parsed.password || (parsed.port&&parsed.port!=='443') || !parsed.hostname.includes('.') || parsed.hostname==='localhost' || parsed.hostname.endsWith('.localhost') || parsed.hostname.endsWith('.internal') || parsed.hostname.endsWith('.local') || parsed.hostname.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname))return null;
    return parsed.hostname;
  }catch{return null;}
}
export function eventProvider(url:string) {
  const host=eventWebsite(url);if(!host)return null;
  const matches=(domain:string)=>host===domain || host.endsWith(`.${domain}`);
  if(matches('luma.com') || matches('lu.ma'))return 'Luma';
  if(matches('meetup.com'))return 'Meetup';
  if(matches('hyrox.com') || matches('hyrox.co.in'))return 'HYROX';
  return 'Organiser';
}
export function discoverEvents(events:CityEvent[],city:string,topic:EventTopic|'All'='All',now=Date.now()) {
  return events.filter(event=>event.status==='published' && event.city.trim().toLowerCase()===city.trim().toLowerCase() && Boolean(event.topic && eventTopics.includes(event.topic)) && (topic==='All' || event.topic===topic) && Boolean(event.registrationUrl && eventWebsite(event.registrationUrl)) && new Date(event.endsAt??event.startsAt).getTime()>now).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
// These are directories, not imported event listings or registration confirmations.
export const eventDirectories:{id:string;topic:EventTopic;name:string;description:string;url:string}[]=[
  {id:'luma-tech',topic:'Tech',name:'Luma · Tech',description:'Explore tech events and choose a city on Luma.',url:'https://luma.com/tech'},
  {id:'meetup-tech',topic:'Tech',name:'Meetup · Tech',description:'Find technology communities and set your location on Meetup.',url:'https://www.meetup.com/find/?keywords=tech'},
  {id:'hyrox-races',topic:'HYROX',name:'HYROX · Find my race',description:'Browse official races and follow the organiser’s registration process.',url:'https://hyrox.com/find-my-race/'},
  {id:'road-race-calendar',topic:'Marathons',name:'World Athletics · Road races',description:'Browse the race calendar, then confirm entry details with the race organiser.',url:'https://worldathletics.org/competitions/world-athletics-label-road-races'},
];
