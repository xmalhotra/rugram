export type CardBenefit={cashback?:{rate:number;minimumTransaction:number};id:string;title:string;category:'Groceries'|'Food & Instamart'|'Online shopping'|'Movies'|'Travel'|'Fuel'|'Bills & recharges';kind:'Instant discount'|'Cashback'|'Reward points'|'Lounge access'|'Surcharge waiver';summary:string;conditions:string;sourceUrl:string;tracker?:{limit:number;unit:'uses'|'INR'|'points';period:'month'|'quarter'|'billing-cycle'}};
export type CardCuration={badge:'Go-to'|'Worth watching';summary:string;launchedAt?:string;placements:{topic:string;rank:number;reason:string}[]};
export type CreditCard={imageUrl?:string;curation?:CardCuration;comparison?:{bestFor:string;watchOut:string};id:string;name:string;issuer:string;annualFee:number;joiningFee:number|null;feeNote:string;waiver:string;checkedAt:string;revision:string;sourceUrl:string;reviewNote?:string;benefits:CardBenefit[]};
export type BenefitUsage={used:number;eligible:boolean;start:string;end:string;termsVersion:string;checkedAt:string};
export type CardWallet=Record<string,{annualFeeOverride?:number;usage:Record<string,BenefitUsage>}>;
import {cardArtwork} from './card-art';
const axis='https://application.axis.bank.in/app_redirect/redirect.aspx?id=select';
const hdfc='https://www.hdfc.bank.in/credit-cards/swiggy-blck-hdfc-bank-credit-card';
const hdfcTerms='https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/swiggy-blck-hdfc-bank-credit-card/pdf/combined-tncs-ornge-and-blck.pdf';
const rbl='https://webassets.rbl.bank.in/document/credit-cards/indianoil-rbl-bank-credit-card-faqs.pdf';
const version={checkedAt:'2026-10-15',revision:'2026-10-15-v1'};
import {everydayCreditCards,legacyCardCuration} from './everyday-credit-cards';
const baseCreditCards:CreditCard[]=[
  {...version,id:'axis-select',name:'Axis Bank SELECT',issuer:'Axis Bank',annualFee:3000,joiningFee:3000,feeNote:'Standard fees before applicable taxes. Burgundy / lifetime-free terms can differ.',waiver:'Issuer lists an ₹8 lakh card-anniversary-year spend waiver; exclusions apply.',sourceUrl:axis,reviewNote:'Issuer listing checked via search; its updated-terms PDF could not be read. Recheck current eligibility, particularly movies and lounges. Counters are personal notes, not confirmation of issuer entitlement.',benefits:[
    {id:'bigbasket',title:'BigBasket monthly offer',category:'Groceries',kind:'Instant discount',summary:'₹500 off an eligible order of ₹2,500 or more, once a month.',conditions:'Listed code AXISSELECTCC. Check eligible basket, checkout and current terms; do not assume stacking.',sourceUrl:axis,tracker:{limit:1,unit:'uses',period:'month'}},
    {id:'movies',title:'District movie offer',category:'Movies',kind:'Instant discount',summary:'Issuer advertises a second-ticket offer, up to ₹250, twice monthly.',conditions:'Updated spend/eligibility conditions require rechecking. Not two unconditional free tickets.',sourceUrl:axis},
    {id:'domestic-lounge',title:'Domestic lounge visits',category:'Travel',kind:'Lounge access',summary:'Issuer lists 2 visits per quarter, subject to ₹50,000 spend in the preceding 3 months.',conditions:'Confirm current eligible lounges, spend qualification, guest charges and access method with Axis. Remaining visits are unknown until you enter usage and confirm eligibility.',sourceUrl:axis,tracker:{limit:2,unit:'uses',period:'quarter'}},
  ]},
  {...version,id:'hdfc-swiggy-blck',name:'Swiggy BLCK HDFC Bank',issuer:'HDFC Bank',annualFee:1000,joiningFee:1000,feeNote:'Before applicable taxes / charges. BLCK is not Ornge or the older Swiggy variant; check your issued card.',waiver:'Issuer lists renewal waiver at ₹2 lakh eligible yearly spend; first-year joining-fee waiver has separate terms.',sourceUrl:hdfc,comparison:{bestFor:'Regular eligible Swiggy, Instamart and Dineout use.',watchOut:'5% online applies to selected merchants / MCCs, not every website. Per-transaction minimums and separate caps apply.'},benefits:[
    {id:'swiggy',title:'Swiggy, Instamart & Dineout',category:'Food & Instamart',kind:'Cashback',cashback:{rate:10,minimumTransaction:249},summary:'10% on eligible Swiggy transactions; ₹1,500 cap per billing cycle.',conditions:'Minimum eligible transaction ₹249. Wallet / liquor and other exclusions apply; cashback is not an instant checkout discount.',sourceUrl:hdfcTerms,tracker:{limit:1500,unit:'INR',period:'billing-cycle'}},
    {id:'online',title:'Selected online merchants',category:'Online shopping',kind:'Cashback',cashback:{rate:5,minimumTransaction:100},summary:'5% on eligible merchants / MCCs; a separate ₹1,500 cap per billing cycle.',conditions:'Not all online spending qualifies. Each transaction must be at least ₹100. Only listed merchants / MCCs qualify; standard exclusions apply. Refunds reverse cashback.',sourceUrl:hdfcTerms,tracker:{limit:1500,unit:'INR',period:'billing-cycle'}},
  ]},
  {...version,id:'rbl-indianoil-xtra',name:'IndianOil RBL Bank XTRA',issuer:'RBL Bank',annualFee:1500,joiningFee:null,feeNote:'Annual membership fee before GST; joining charges not confirmed in this review.',waiver:'Issuer FAQ lists annual waiver at ₹2.75 lakh eligible spend.',sourceUrl:rbl,benefits:[
    {id:'fuel-points',title:'IndianOil fuel points',category:'Fuel',kind:'Reward points',summary:'15 Fuel Points per ₹100 at IndianOil, capped at 2,000 points monthly.',conditions:'Points—not 8% cash cashback. FAQ states ₹0.50 per Fuel Point for XTRA conversion versus ₹0.10 for other redemptions. Check redemption fees and terms.',sourceUrl:rbl,tracker:{limit:2000,unit:'points',period:'month'}},
    {id:'surcharge',title:'Fuel surcharge waiver',category:'Fuel',kind:'Surcharge waiver',summary:'Up to ₹200 monthly surcharge waiver on eligible ₹500–₹4,000 fuel transactions.',conditions:'A surcharge waiver is distinct from reward points and cashback. Confirm actual waiver posting with the issuer.',sourceUrl:rbl,tracker:{limit:200,unit:'INR',period:'month'}},
  ]},
  {checkedAt:'2026-10-15',revision:'2026-10-16-v1',id:'sbi-cashback',name:'CASHBACK SBI Card',issuer:'SBI Card',annualFee:999,joiningFee:999,feeNote:'Standard fees before applicable taxes.',waiver:'Renewal waiver at ₹2 lakh eligible annual spend; issuer exclusions apply.',sourceUrl:'https://www.sbicard.com/en/most-important-terms-and-conditions.page',comparison:{bestFor:'Eligible online shopping across merchants, rather than one app.',watchOut:'Online cap is ₹2,000 per statement cycle, not the older ₹5,000 figure. Excluded transactions earn no cashback.'},benefits:[
    {id:'online',title:'Eligible online purchases',category:'Online shopping',kind:'Cashback',cashback:{rate:5,minimumTransaction:0},summary:'5% on eligible online transactions; ₹2,000 online cap per statement cycle.',conditions:'Exclusions apply, including fuel, utilities, insurance, rent, wallets and other issuer-listed categories. Gaming, tolls and government transactions were additionally excluded from April 2026. Refunds reverse cashback; check merchant coding.',sourceUrl:'https://www.sbicard.com/en/faq/cashback-sbi-card-faq.page',tracker:{limit:2000,unit:'INR',period:'billing-cycle'}},
  ]},
  ...everydayCreditCards,
];
export const creditCards:CreditCard[]=baseCreditCards.map(card=>({...card,imageUrl:card.imageUrl??cardArtwork[card.id],curation:card.curation??legacyCardCuration[card.id]}));
export function indiaDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function benefitPeriod(period:'month'|'quarter'|'billing-cycle',now=new Date(),cycle?:{start:string;end:string}){
  const today=indiaDay(now);
  if(period==='billing-cycle'){
    if(!cycle||![cycle.start,cycle.end].every(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value))return null;
    const days=(Date.parse(cycle.end)-Date.parse(cycle.start))/86400000;
    return days>=0&&days<=45&&cycle.start<=today&&cycle.end>=today?cycle:null;
  }
  const [year,month]=today.split('-').map(Number);const first=period==='quarter'?Math.floor((month-1)/3)*3+1:month;const last=first+(period==='quarter'?3:1);
  return {start:`${year}-${String(first).padStart(2,'0')}-01`,end:new Date(Date.UTC(year,last-1,0)).toISOString().slice(0,10)};
}
export function benefitRemaining(card:CreditCard,benefit:CardBenefit,usage?:BenefitUsage,now=new Date()){
  if(!benefit.tracker||!usage||!usage.eligible||usage.termsVersion!==card.revision||!Number.isFinite(usage.used)||usage.used<0||usage.used>benefit.tracker.limit||(benefit.tracker.unit==='uses'&&!Number.isInteger(usage.used)))return null;
  const period=benefitPeriod(benefit.tracker.period,now,usage);
  return period&&period.start===usage.start&&period.end===usage.end?benefit.tracker.limit-usage.used:null;
}
