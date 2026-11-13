import type {SupplementGoal,SupplementTopic} from './supplement-discovery';

export type SupplementJourneyCard={id:string;title:string;body:string;illustration:string;showProducts?:boolean};
// Reuse the admin-managed topic copy: updating a topic updates its guide too.
export function supplementJourney(topic:SupplementTopic,goal:SupplementGoal,productCount:number):SupplementJourneyCard[]{
  return [
    {id:'goal',title:`Why ${topic.title.toLowerCase()}?`,body:topic.summary,illustration:goal.illustration},
    {id:'food',title:'Start with the everyday',body:topic.foodFirst,illustration:'nutrition'},
    {id:'fit',title:'When could it help?',body:topic.consider,illustration:'supplements'},
    {id:'next',title:productCount?'Find your fit':'Your next step',body:productCount?'Compare the label, the trade-offs and what fits your life. Buying something is optional.':'Explore the guide or a practical flow. You don’t need to buy a supplement to start.',illustration:goal.illustration,showProducts:productCount>0},
  ];
}
export function journeyPage(offset:number,width:number,count:number){
  if(!Number.isFinite(offset)||!Number.isFinite(width)||width<=0||count<=0)return 0;
  return Math.min(count-1,Math.max(0,Math.round(offset/width)));
}
