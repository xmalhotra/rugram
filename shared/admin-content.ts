import type {HabitFlow,Product,CityEvent} from './mobile';
import type {Exercise} from './exercises';
import type {CreditCard} from './credit-cards';
import type {SupplementDiscoveryLibrary} from './supplement-discovery';
import type {EventInterest} from './event-interests';
import type {FlowCategoryGroup} from './flow-categories';
export const contentKinds=['flow','exercise','card','cardIssuer','cardListing','cardPlatform','cardOffer','focus','nutrition','guide','settings','product','event'] as const;
export type ContentKind=typeof contentKinds[number];
export type FocusContent={id:string;title:string;description:string;flowIds:string[]};
export type NutritionPath={id:string;title:string;description:string;options:{id:string;title:string;description:string;flowIds:string[]}[]};
export type AppSettings={flowCategoryGroups?:FlowCategoryGroup[];featuredProductIds?:string[];eventInterests?:EventInterest[];supplementDiscovery?:SupplementDiscoveryLibrary;id:string;title:string;eventCities:string[];eventCountry:string;eventTopics:import('./event-discovery').EventTopic[];defaultCreatorMonthlyEvents:number;productCategories:{id:string;title:string;subcategories:string[]}[];tiers:string[]};
export type LearningGuide={id:string;title:string;description:string;references?:{title:string;url:string;note:string;reviewStatus:'unreviewed'|'reviewed'}[];creatorReferences?:{name:string;profileUrl:string;note:string}[];sections:{id:string;title:string;body:string;sourceUrl:string}[]};
export type ManagedLibrary={cardResearch?:import('./card-research').CardResearch;flows:HabitFlow[];exercises:Exercise[];cards:CreditCard[];focus:FocusContent[];nutrition:NutritionPath[];guides:LearningGuide[];settings:AppSettings;comparisons:Record<string,unknown>};
export type ContentDocument={kind:ContentKind;id:string;title:string;version:number;status:'published'|'archived'|'draft';hasDraft:boolean;data:Record<string,unknown>;publishedData:Record<string,unknown>|null;updatedAt:string|null;pending?:boolean;submittedBy?:string|null;submittedByName?:string|null;submittedAt?:string|null};
export type ContentAudit={id:string;kind:ContentKind;itemId:string;action:string;actor:string;actorName?:string|null;at:string;version:number;data:Record<string,unknown>|null};
export type AccountSnapshot={name:string;handle:string;role:'member'|'creator'|'admin';disabled:boolean};
export type AccountAudit={id:string;actor:string|null;actorName:string|null;target:string;before:AccountSnapshot;after:AccountSnapshot;reason:string|null;sessionsRevoked:number;at:string};
export function accountChangeNeedsReason(before:AccountSnapshot,after:AccountSnapshot){return before.role!==after.role||before.disabled!==after.disabled;}
export function accountChangeSummary({before,after}:Pick<AccountAudit,'before'|'after'>){
  const parts=[before.role!==after.role?`role ${before.role} → ${after.role}`:'',before.disabled!==after.disabled?(after.disabled?'suspended':'unsuspended'):'',before.handle!==after.handle?`@${before.handle} → @${after.handle}`:'',before.name!==after.name?'name changed':''].filter(Boolean);
  return parts.join(' · ')||'profile details updated';
}
export function reviewWaiting(submittedAt:string,now=Date.now()){
  const days=Math.floor((now-Date.parse(submittedAt))/86400000);
  if(!Number.isFinite(days))return 'submission date unknown';
  return days<=0?'submitted today':`waiting ${days} day${days===1?'':'s'}`;
}
/** Creator submissions awaiting review first (oldest first), then everything else in catalogue order. */
export function reviewQueueOrder(items:ContentDocument[]){
  const age=(item:ContentDocument)=>{const time=Date.parse(item.submittedAt??'');return Number.isFinite(time)?time:Number.MAX_SAFE_INTEGER;};
  return items.map((item,index)=>({item,index})).sort((a,b)=>Number(Boolean(b.item.pending))-Number(Boolean(a.item.pending))||(a.item.pending?age(a.item)-age(b.item):0)||a.index-b.index).map(entry=>entry.item);
}
export type ItemAnalytics={days:number;actions:number;uniqueUsers:number;byAction:Record<string,number>;daily:{date:string;count:number}[];note:string};
export type ManagedValue=HabitFlow|Exercise|CreditCard|FocusContent|LearningGuide|AppSettings|Product|CityEvent;
