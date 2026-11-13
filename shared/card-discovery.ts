import type {CardBenefit,CardWallet,CreditCard} from './credit-cards';
import {cardReturn} from './card-comparison';

export type CardValueEntry={card:CreditCard;rate:number;cap:number;fee:number;minimumTransaction:number};
// Public discovery is a transparent terms-based shortlist, not an invented spend scenario.
export function rankedCardOptions(cards:CreditCard[],category:CardBenefit['category'],wallet:CardWallet={},now=new Date()){
  const relevant=cards.filter(card=>card.benefits.some(benefit=>benefit.category===category));
  const ranked:CardValueEntry[]=relevant.flatMap(card=>{
    const fee=wallet[card.id]?.annualFeeOverride??card.annualFee;
    const model=cardReturn(card,category,0,fee,now);
    return model?[{card,rate:model.rate,cap:model.benefit.tracker!.limit,fee,minimumTransaction:model.benefit.cashback!.minimumTransaction}]:[];
  }).sort((a,b)=>b.rate-a.rate||b.cap-a.cap||a.fee-b.fee||a.card.id.localeCompare(b.card.id));
  const rankedIds=new Set(ranked.map(entry=>entry.card.id));
  return {ranked,other:relevant.filter(card=>!rankedIds.has(card.id))};
}
function noWorse(a:CardValueEntry,b:CardValueEntry){
  return a.rate>=b.rate&&a.cap>=b.cap&&a.fee<=b.fee&&a.minimumTransaction<=b.minimumTransaction;
}
function stronger(a:CardValueEntry,b:CardValueEntry){
  return noWorse(a,b)&&(a.rate>b.rate||a.cap-b.cap>=100||b.fee-a.fee>=100);
}
export function cardAlternatives(cards:CreditCard[],wallet:CardWallet,category:CardBenefit['category'],now=new Date()){
  const {ranked}=rankedCardOptions(cards,category,wallet,now);
  const existing=ranked.filter(entry=>Boolean(wallet[entry.card.id]));
  // Unknown rewards aren't zero; never recommend based only on owning an unmodelled card.
  return ranked.filter(candidate=>!wallet[candidate.card.id]&&!existing.some(current=>noWorse(current,candidate))).flatMap(candidate=>{
    const baseline=existing.find(current=>stronger(candidate,current));
    return baseline?[{candidate,baseline}]:[];
  }).slice(0,2);
}
export function reviewedCard(card:CreditCard,now=new Date()){
  const age=now.getTime()-Date.parse(card.checkedAt);return Number.isFinite(age)&&age>=-86400000&&age<=90*86400000;
}
export function cardTopics(cards:CreditCard[]){return [...new Set(cards.flatMap(card=>card.curation?.placements.map(item=>item.topic)??[]))];}
export function editorialCardShortlist(cards:CreditCard[],topic:string,now=new Date()){
  return cards.filter(card=>reviewedCard(card,now)).flatMap(card=>{const placement=card.curation?.placements.find(item=>item.topic===topic);return placement?[{card,...placement}]:[];}).sort((a,b)=>a.rank-b.rank||a.card.id.localeCompare(b.card.id)).slice(0,3);
}
export function newCreditCards(cards:CreditCard[],now=new Date()){
  return cards.filter(card=>{const age=now.getTime()-Date.parse(card.curation?.launchedAt??'');return reviewedCard(card,now)&&Number.isFinite(age)&&age>=0&&age<=90*86400000;}).sort((a,b)=>Date.parse(b.curation!.launchedAt!)-Date.parse(a.curation!.launchedAt!)).slice(0,2);
}
export function cardFeeBand(fee:number){return fee===0?'No annual fee':fee<=500?'Up to ₹500':fee<=1000?'₹501–₹1,000':fee<=2000?'₹1,001–₹2,000':'Above ₹2,000';}
export function similarFeeCards(card:CreditCard,cards:CreditCard[],now=new Date()){
  const topics=card.curation?.placements.map(item=>item.topic)??[];
  return cards.filter(other=>other.id!==card.id&&reviewedCard(other,now)&&cardFeeBand(other.annualFee)===cardFeeBand(card.annualFee)&&(other.curation?.placements.some(item=>topics.includes(item.topic))||other.benefits.some(benefit=>card.benefits.some(own=>own.category===benefit.category)))).sort((a,b)=>Math.abs(a.annualFee-card.annualFee)-Math.abs(b.annualFee-card.annualFee)||a.name.localeCompare(b.name)).slice(0,3);
}
