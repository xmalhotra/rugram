import type {CardBenefit,CreditCard} from './credit-cards';
export function cardReturn(card:CreditCard,category:CardBenefit['category'],spend:number,annualFee=card.annualFee,now=new Date()){
  const benefit=card.benefits.find(item=>item.category===category&&item.cashback);
  const age=now.getTime()-Date.parse(card.checkedAt);
  // Never convert points, lounge access or conditional discounts into cash.
  if(!benefit||benefit.kind!=='Cashback'||!benefit.cashback||benefit.tracker?.unit!=='INR'||benefit.tracker.period!=='billing-cycle'||!Number.isFinite(age)||age< -86400000||age>90*86400000||!Number.isFinite(spend)||spend<0||!Number.isFinite(annualFee)||annualFee<0)return null;
  const {rate,minimumTransaction}=benefit.cashback;
  if(!Number.isFinite(rate)||rate<0||rate>100||!Number.isFinite(benefit.tracker.limit)||benefit.tracker.limit<0||!Number.isFinite(minimumTransaction)||minimumTransaction<0)return null;
  const perCycle=Math.floor(Math.min(spend<minimumTransaction?0:spend*rate/100,benefit.tracker.limit)*100)/100;
  return {benefit,rate,perCycle,annualNet:Math.round((perCycle*12-annualFee)*100)/100};
}
export function compareCardReturns(cards:CreditCard[],category:CardBenefit['category'],spend:number,fees:Record<string,number>={},now=new Date()){
  const entries=cards.map(card=>({card,estimate:cardReturn(card,category,spend,fees[card.id]??card.annualFee,now)}));
  const known=entries.filter(entry=>entry.estimate!==null).sort((a,b)=>b.estimate!.annualNet-a.estimate!.annualNet);
  // Small fee differences and ties don't justify a recommendation. Unknowns aren't zero.
  const leader=known.length>=2&&known[0].estimate!.annualNet>0&&known[0].estimate!.annualNet-known[1].estimate!.annualNet>=100?known[0].card.id:null;
  return {entries,leader,comparable:known.length};
}
