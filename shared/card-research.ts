export type CardIssuer={id:string;title:string;sourceUrl:string;coverage:'partial'|'blocked'|'needs-review'|'audited';checkedAt:string;note:string};
export type CardListing={id:string;title:string;issuerId:string;issuer:string;availability:'listed-unverified'|'open'|'invitation-only'|'paused'|'discontinued'|'legacy';annualFee:number|null;joiningFee:number|null;sourceUrl:string;checkedAt:string;note:string;reviewedCardId?:string};
export type CardPlatform={id:string;title:string;category:string;sourceUrl:string;coverage:'pending'|'partial'|'reviewed';note:string};
export type CardOffer={id:string;title:string;platformId:string;issuerId:string;benefitType:'discount'|'cashback'|'points';paymentRoute:'direct'|'emi'|'voucher'|'upi'|'portal';sharedCapKey?:string;eligibleCards:string[];excludedCards:string[];ratePercent:number|null;maxSaving:number|null;minSpend:number|null;startsAt:string|null;endsAt:string|null;frequency:string;stacking:'unknown'|'exclusive'|'permitted';termsStatus:'partial'|'reviewed';sourceUrl:string;checkedAt:string;conditions:string};
export type CardResearch={issuers:CardIssuer[];listings:CardListing[];platforms:CardPlatform[];offers:CardOffer[]};
export function cardOfferState(offer:CardOffer,now=Date.now()){
  const start=offer.startsAt?Date.parse(offer.startsAt):NaN,end=offer.endsAt?Date.parse(offer.endsAt):NaN;
  if(Number.isFinite(end)&&end<now)return 'expired';
  if(Number.isFinite(start)&&start>now)return 'upcoming';
  const checked=Date.parse(offer.checkedAt);if(!Number.isFinite(checked)||checked>now+300000||now-checked>7*86400000)return 'needs-review';
  if(offer.termsStatus!=='reviewed'||!Number.isFinite(start)||!Number.isFinite(end))return 'needs-review';
  return 'in-window'; // Still not proof that a particular card/account or checkout qualifies.
}
export function filterCardListings(items:CardListing[],issuer='All',search='',includeLegacy=false){
  const query=search.trim().toLowerCase();
  return items.filter(item=>(issuer==='All'||item.issuerId===issuer)&&(includeLegacy||!['legacy','discontinued','paused'].includes(item.availability))&&`${item.title} ${item.issuer}`.toLowerCase().includes(query)).sort((a,b)=>a.issuer.localeCompare(b.issuer)||a.title.localeCompare(b.title));
}
