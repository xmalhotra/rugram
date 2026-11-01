import 'server-only';
import {database} from './database';
import {isDemoMode,userNames} from './store';
import {flows,type HabitFlow,type Product,type CityEvent} from '../../shared/mobile';
import {exercises,type Exercise} from '../../shared/exercises';
import {creditCards} from '../../shared/credit-cards';
import {focusOptions} from '../../shared/focus';
import {magnesiumForms,magnesiumSources} from '../../shared/magnesium';
import {gymSupports,supportSources} from '../../shared/gym-supports';
import type {AppSettings,ContentKind,ContentDocument,ContentAudit,ManagedLibrary,LearningGuide} from '../../shared/admin-content';
import type {PublicUser} from './types';
import {validateContent} from './content-validation';
import {isHyderabadTech} from '../../shared/hyderabad-tech';
import {defaultNutritionPaths} from '../../shared/flow-sections';
import {workoutSteps} from '../../shared/workouts';
import {defaultSupplementDiscovery} from '../../shared/supplement-discovery';
import {eventInterests,defaultEventTopics} from '../../shared/event-interests';
import {assertDemoHostedEventEdit} from './mobile-store';
import {electronicsCategories} from '../../shared/electronics-discovery';
import {cardResearchSeeds} from '../../shared/card-research-seeds';
import {defaultFeaturedProductIds} from '../../shared/pick-catalog';
import {defaultFlowCategoryGroups} from '../../shared/flow-categories';
import {reviewReason,type ReviewCode} from '../../shared/moderation';
type Row={kind:ContentKind;id:string;version:number;status:'published'|'draft'|'archived';draft:Record<string,unknown>|null;published:Record<string,unknown>|null;updatedAt:string};
type State={rows:Record<string,Row>;audit:ContentAudit[]};
declare global{var betterHabitsContent:State|undefined;}
const state=globalThis.betterHabitsContent??={rows:{},audit:[]};
export const initialSettings:AppSettings={flowCategoryGroups:defaultFlowCategoryGroups,featuredProductIds:defaultFeaturedProductIds,eventInterests,supplementDiscovery:defaultSupplementDiscovery,id:'app',title:'Qram',eventCities:['Hyderabad'],eventCountry:'IN',eventTopics:defaultEventTopics,defaultCreatorMonthlyEvents:2,productCategories:[{id:'Food',title:'Food',subcategories:[]},{id:'Supplements',title:'Supplements',subcategories:[]},{id:'Tech',title:'Electronics',subcategories:[...electronicsCategories,'Electronics','Computers','Audio','Wearables','Accessories']},{id:'Equipment',title:'Equipment',subcategories:[]}],tiers:['Essential','Upgrade','Premium']};
const guides:LearningGuide[]=[
  {id:'magnesium',title:'Understand magnesium',references:[{title:'User-supplied YouTube Short',url:'https://www.youtube.com/shorts/7Ndfb-1ehnw',note:'Saved for editorial review. The transcript and authorship have not been retrieved or verified; no claims or endorsements are inferred from this video.',reviewStatus:'unreviewed'}],description:'Compare forms and read elemental magnesium labels. Education, not a prescription or a universal best-product ranking.',creatorReferences:[{name:'Food Pharmer · Revant Himatsingka',profileUrl:'https://www.youtube.com/@Foodpharmer',note:'User-named inspiration only. No specific magnesium video or claim has been verified. This is not a creator endorsement of this app or its content.'}],sections:magnesiumForms.map(form=>({id:form.id,title:form.name,body:`${form.absorption}\n\n${form.interpretation}`,sourceUrl:magnesiumSources[form.sourceIds[0]??'nih'].url}))},
  {id:'gym-supports',title:'Understand gym equipment',description:'Equipment has no gender. These tools are optional, not proof of toughness or guaranteed protection from injury.',sections:gymSupports.map(item=>({id:item.id,title:item.title,body:[item.purpose,item.context,item.notFor,...item.compare].join('\n\n'),sourceUrl:supportSources[item.sourceIds[0]].url}))},
];
const nutrition=defaultNutritionPaths(flows);
function title(value:Record<string,unknown>){return String(value.title??value.name??value.id);}
export async function contentRows():Promise<Row[]>{
  if(isDemoMode())return structuredClone(Object.values(state.rows));
  return (await database()`SELECT * FROM mobile_content ORDER BY kind,id LIMIT 5000`).map(row=>({kind:row.kind as ContentKind,id:String(row.id),version:Number(row.version),status:row.status as Row['status'],draft:row.draft as Row['draft'],published:row.published as Row['published'],updatedAt:String(row.updated_at)}));
}
export async function managedLibrary(baseFlows:HabitFlow[]=flows,baseExercises:Exercise[]=exercises):Promise<ManagedLibrary>{
  const rows=await contentRows();
  function apply<T extends {id:string}>(kind:ContentKind,base:T[]):T[]{const items=new Map(base.map(item=>[item.id,item]));for(const row of rows.filter(row=>row.kind===kind)){if(row.status==='archived')items.delete(row.id);else if(row.published)items.set(row.id,row.published as unknown as T);}return [...items.values()];}
  return {cardResearch:{issuers:apply('cardIssuer',cardResearchSeeds.issuers),listings:apply('cardListing',cardResearchSeeds.listings),platforms:apply('cardPlatform',cardResearchSeeds.platforms),offers:apply('cardOffer',cardResearchSeeds.offers)},flows:apply('flow',baseFlows),exercises:apply('exercise',baseExercises),cards:apply('card',creditCards),focus:apply('focus',focusOptions.map(item=>({...item,flowIds:[...item.flowIds]}))),nutrition:apply('nutrition',nutrition),guides:apply('guide',guides),settings:apply('settings',[initialSettings])[0]??initialSettings,comparisons:{}};
}
export async function adminDocuments(user:PublicUser,catalog:(Product|CityEvent)[],baseFlows:HabitFlow[],baseExercises:Exercise[]){
  if(user.role!=='admin')throw new Error('Admin access required.');
  const rows=await contentRows();const base:Record<string,{kind:ContentKind;data:Record<string,unknown>}>={};
  const entries:[ContentKind,readonly unknown[]][]=[['cardIssuer',cardResearchSeeds.issuers],['cardListing',cardResearchSeeds.listings],['cardPlatform',cardResearchSeeds.platforms],['cardOffer',cardResearchSeeds.offers],['flow',baseFlows],['exercise',baseExercises],['card',creditCards],['focus',focusOptions],['nutrition',nutrition],['guide',guides],['settings',[initialSettings]],['product',catalog.filter(item=>'category'in item)],['event',catalog.filter(item=>'city'in item)]];
  for(const [kind,items]of entries)for(const value of items){const data=value as Record<string,unknown>;base[`${kind}:${data.id}`]={kind,data};}
  for(const row of rows){const key=`${row.kind}:${row.id}`;base[key]??={kind:row.kind,data:row.published??row.draft??{id:row.id}};}
  const documents=Object.values(base).map(({kind,data}):ContentDocument=>{const row=rows.find(item=>item.kind===kind&&item.id===data.id);const published=kind==='product'||kind==='event'?data:row?.published??data;const pending=(kind==='product'||kind==='event')&&published.status==='pending'&&!published.withdrawnAt;return {kind,id:String(data.id),title:title(row?.draft??published),version:row?.version??0,status:row?.status??(data.status==='archived'?'archived':data.status==='pending'?'draft':'published'),hasDraft:Boolean(row?.draft),data:row?.draft??published,publishedData:row?.status==='draft'&&!row.published?null:published,updatedAt:row?.updatedAt??null,...(pending?{pending,submittedBy:published.createdBy?String(published.createdBy):null,submittedAt:String(published.listedAt??published.checkedAt??'')||null}:{})};});
  const names=await userNames(documents.filter(item=>item.pending).map(item=>item.submittedBy));
  return documents.map(item=>item.pending?{...item,submittedByName:item.submittedBy?names[item.submittedBy]??null:null}:item);
}
export async function mutateContent(user:PublicUser,input:{kind:ContentKind;id:string;version:number;action:'draft'|'publish'|'archive';data?:Record<string,unknown>;reviewNote?:string;reviewCode?:ReviewCode},source:ContentDocument|undefined){
  if(user.role!=='admin')throw new Error('Admin access required.');
  if(input.kind==='settings'&&input.action==='archive')throw new Error('Content settings cannot be archived.');
  const reason=input.action==='archive'?reviewReason(input.reviewNote,input.reviewCode):undefined;
  const rows=await contentRows();const before=rows.find(row=>row.kind===input.kind&&row.id===input.id);
  if((before?.version??0)!==input.version)throw new Error('Content changed since you opened it. Refresh before saving.');
  const previous=input.kind==='event'?(source?.publishedData??before?.published??null):(before?.published??source?.publishedData??null);
  if(input.action==='publish'&&previous?.withdrawnAt)throw new Error('Content withdrawn submissions cannot be published.');
  let data=input.data??before?.draft??previous;
  if(input.action!=='archive'&&!data)throw new Error('Content draft is missing.');
  if(data&&String(data.id)!==input.id)throw new Error('Content identifiers cannot be changed.');
  if(input.action==='publish'){
    data=validateContent(input.kind,data);
    if(input.kind==='card')data.revision=`cms-${input.version+1}`;
    if(input.kind==='product'||input.kind==='event')data={...data,...(input.kind==='event'?{simulation:previous?.simulation===true}:{}),id:input.id,createdBy:previous?.createdBy??user.id,status:'published',...('listedAt'in(data??{})?{listedAt:previous?.listedAt??new Date().toISOString()}:{})};
    const library=await managedLibrary();
    if(input.kind==='cardListing'&&!library.cardResearch?.issuers.some(issuer=>issuer.id===data!.issuerId))throw new Error('Content card listing needs a published issuer reference.');
    if(input.kind==='cardOffer'&&(!library.cardResearch?.issuers.some(issuer=>issuer.id===data!.issuerId)||!library.cardResearch.platforms.some(platform=>platform.id===data!.platformId)))throw new Error('Content card offer needs published issuer and platform references.');
    if(input.kind==='product'){
      if(!library.settings.productCategories.some(category=>category.id===data!.category)||!library.settings.tiers.includes(String(data.tier)))throw new Error('Content pick category or tier is not enabled in App settings.');
      if(data.category==='Tech'&&!library.settings.productCategories.find(category=>category.id==='Tech')?.subcategories.includes(String(data.subcategory)))throw new Error('Content Tech type is not enabled in App settings.');
    }
    if(input.kind==='event'&&!isHyderabadTech(data as unknown as CityEvent,library.settings))throw new Error('Content event is outside the enabled city and topic scope.');
    if(input.kind==='focus'&&(data.flowIds as string[]).some(id=>!library.flows.some(flow=>flow.id===id)))throw new Error('Content focus references an unavailable flow. Publish its flows first.');
    if(input.kind==='nutrition'&&(data.options as {flowIds:string[]}[]).some(option=>option.flowIds.some(id=>!library.flows.some(flow=>flow.id===id))))throw new Error('Content nutrition path references an unavailable flow. Publish it first.');
    if(input.kind==='flow'){
      const flow=data as unknown as HabitFlow;
      if(flow.workout?.blocks.some(block=>!library.exercises.some(exercise=>exercise.id===block.exerciseId)))throw new Error('Content workout references an unavailable exercise.');
      if(flow.workout?.blocks.some(block=>block.mode!==(['plank','side-plank'].includes(library.exercises.find(exercise=>exercise.id===block.exerciseId)!.icon)?'hold':'reps')))throw new Error('Content exercise measurement must match the exercise (holds versus repetitions).');
      if(flow.relatedFlowIds?.some(id=>id===flow.id||!library.flows.some(flow=>flow.id===id)))throw new Error('Content related flows must be published and cannot refer to themselves.');
      if(flow.workout)data.steps=workoutSteps(flow.workout,library.exercises);
      if(flow.guideId&&!['gym-supports'].includes(flow.guideId)&&!library.guides.some(guide=>guide.id===flow.guideId))throw new Error('Content flow references an unavailable learning guide.');
    }
    if(input.kind==='exercise'&&input.action==='publish'&&data.icon==null)throw new Error('Content exercise needs a visual.');
  }
  if(reason){data={...(previous??data),...reason,reviewedAt:new Date().toISOString(),reviewedBy:user.id};}
  const next:Row={kind:input.kind,id:input.id,version:input.version+1,status:input.action==='publish'?'published':input.action==='archive'?'archived':before?.status??(previous?'published':'draft'),draft:input.action==='draft'?data:null,published:input.action==='publish'||(input.action==='archive'&&previous)?data:previous,updatedAt:new Date().toISOString()};
  const audit:ContentAudit={id:crypto.randomUUID(),kind:input.kind,itemId:input.id,action:input.action,actor:user.id,version:next.version,data:data??previous,at:next.updatedAt};
  if(isDemoMode()){if(input.kind==='event'&&previous&&data)assertDemoHostedEventEdit(previous as unknown as CityEvent,data as unknown as CityEvent);if((state.rows[`${input.kind}:${input.id}`]?.version??0)!==input.version)throw new Error('Content changed since you opened it. Refresh before saving.');state.rows[`${input.kind}:${input.id}`]=next;state.audit.push(audit);}
  else{
    const sql=database();const result=await sql`WITH changed AS (
      INSERT INTO mobile_content(kind,id,version,status,draft,published) VALUES(${next.kind},${next.id},${next.version},${next.status},NULLIF(${JSON.stringify(next.draft)}::jsonb,'null'::jsonb),NULLIF(${JSON.stringify(next.published)}::jsonb,'null'::jsonb))
      ON CONFLICT(kind,id) DO UPDATE SET version=EXCLUDED.version,status=EXCLUDED.status,draft=EXCLUDED.draft,published=EXCLUDED.published,updated_at=now() WHERE mobile_content.version=${input.version} RETURNING *
    ), logged AS (INSERT INTO mobile_content_audit(id,kind,item_id,action,actor_id,version,data) SELECT ${audit.id},kind,id,${audit.action},${user.id},version,${JSON.stringify(audit.data)}::jsonb FROM changed), projected AS (
      INSERT INTO mobile_catalog(id,kind,data) SELECT id,kind,CASE WHEN ${input.action}='archive' THEN jsonb_set(published,'{status}','"archived"'::jsonb) ELSE published END FROM changed WHERE kind IN ('product','event') AND ${input.action}<>'draft' AND published IS NOT NULL ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data
    ) SELECT id FROM changed`;
    if(!result.length)throw new Error('Content changed since you opened it. Refresh before saving.');
  }
  return {next,audit};
}
export async function contentHistory(user:PublicUser,kind:ContentKind,id:string):Promise<ContentAudit[]>{
  if(user.role!=='admin')throw new Error('Admin access required.');
  const history:ContentAudit[]=isDemoMode()?structuredClone(state.audit.filter(item=>item.kind===kind&&item.itemId===id).slice(-20).reverse())
    :(await database()`SELECT * FROM mobile_content_audit WHERE kind=${kind} AND item_id=${id} ORDER BY at DESC LIMIT 20`).map(row=>({id:String(row.id),kind:row.kind as ContentKind,itemId:String(row.item_id),action:String(row.action),actor:String(row.actor_id),version:Number(row.version),data:row.data as ContentAudit['data'],at:String(row.at)}));
  const names=await userNames(history.map(item=>item.actor));
  return history.map(item=>({...item,actorName:names[item.actor]??null}));
}
