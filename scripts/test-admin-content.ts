import assert from 'node:assert/strict';
import {GET as read,POST as write} from '../src/app/api/mobile/admin/route';
import {GET as bootstrap,POST as action} from '../src/app/api/mobile/route';
import {GET as cardResearch} from '../src/app/api/mobile/card-research/route';
import {createSession,mockPhoneUser} from '../src/lib/store';
import {tokenId} from '../src/lib/session';
import type {ContentDocument,ContentKind,ContentAudit} from '../shared/admin-content';
process.env.RUGRAM_DEMO_MODE='true';
async function main(){
  const tokens:Record<string,string>={};
  for(const [role,phone]of [['admin','+12025550103'],['creator','+12025550102'],['user','+12025550199']]){const user=await mockPhoneUser(phone);const token=crypto.randomUUID();await createSession(user.id,tokenId(token),new Date(Date.now()+600000));tokens[role]=token;}
  async function call(role:string,body?:unknown,query='',mobile=false){const request=new Request(`http://localhost/api/mobile${mobile?'':'/admin'}${query}`,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(tokens[role]?{authorization:`Bearer ${tokens[role]}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const response=await (mobile?(body?action(request):bootstrap(request)):(body?write(request):read(request)));return {status:response.status,data:await response.json()};}
  async function document(kind:ContentKind,id?:string){const result=await call('admin',undefined,`?kind=${kind}&search=${id??''}`);assert.equal(result.status,200,JSON.stringify(result.data));return (result.data.items as ContentDocument[]).find(item=>!id||item.id===id)!;}
  async function cardResearchCall(){const response=await cardResearch(new Request('http://localhost/api/mobile/card-research',{headers:{authorization:`Bearer ${tokens.user}`}}));return {status:response.status,data:await response.json()};}
  async function publish(doc:ContentDocument,data:Record<string,unknown>){const result=await call('admin',{action:'publish',kind:doc.kind,id:doc.id,version:doc.version,data});assert.equal(result.status,200,JSON.stringify(result.data));return result.data.version as number;}
  assert.equal((await call('missing')).status,401);for(const role of ['user','creator']){assert.equal((await call(role)).status,403);assert.equal((await call(role,{action:'draft',kind:'flow',id:'denied',version:0,data:{id:'denied'}})).status,403);}
  assert.equal((await call('user',undefined,'',true)).data.library.cardResearch,undefined,'Bootstrap does not ship the card-research directory');
  assert.ok((await cardResearchCall()).data.cardResearch.issuers.length>0);
  const morning=await document('flow','morning');const edited={...morning.data,title:'Edited through administration'};
  const draft=await call('admin',{action:'draft',kind:'flow',id:morning.id,version:0,data:edited});assert.equal(draft.status,200);
  assert.notEqual((await call('user',undefined,'',true)).data.flows.find((flow:{id:string})=>flow.id==='morning').title,edited.title);
  const version=await publish({...morning,version:draft.data.version},edited);
  assert.equal((await call('user',undefined,'',true)).data.flows.find((flow:{id:string})=>flow.id==='morning').title,edited.title);
  const conflicts=await Promise.all([1,2].map(n=>call('admin',{action:'draft',kind:'flow',id:morning.id,version,data:{...edited,title:`Concurrent draft ${n}`}})));assert.deepEqual(conflicts.map(result=>result.status).sort(),[200,409]);
  const history=(await call('admin',undefined,'?view=history&kind=flow&id=morning')).data.history as ContentAudit[];assert.ok(history.some(item=>item.action==='publish'));
  const current=await document('flow','morning');assert.equal((await call('admin',{action:'restore',kind:'flow',id:morning.id,version:current.version,auditId:history.find(item=>item.action==='publish')!.id})).status,200);
  const custom={...morning.data,id:'admin-created-flow',title:'Admin created flow',relatedFlowIds:['morning']};await publish({kind:'flow',id:custom.id,version:0} as ContentDocument,custom);
  const focus={id:'admin-created-focus',title:'An editable focus',description:'Managed without code.',flowIds:[custom.id]};await publish({kind:'focus',id:focus.id,version:0} as ContentDocument,focus);
  assert.equal((await call('user',{action:'focus',id:focus.id},'',true)).status,200);
  assert.equal((await call('user',{action:'flow',id:custom.id,enabled:true},'',true)).status,200);
  assert.equal((await call('user',{action:'complete',id:`${custom.id}:water`,enabled:true},'',true)).status,200);
  assert.equal((await call('user',{action:'content-view',kind:'flow',id:custom.id},'',true)).status,200);
  const stats=(await call('admin',undefined,`?view=analytics&kind=flow&id=${custom.id}&days=30`)).data;assert.equal(stats.byAction.flow_joined,1);assert.equal(stats.byAction.habit_completed,1);assert.equal(stats.byAction.content_viewed,1);
  const stepStats=(await call('admin',undefined,`?view=analytics&kind=flow&id=${custom.id}&days=7&activityId=water`)).data;assert.equal(stepStats.byAction.habit_completed,1);assert.equal(stepStats.byAction.flow_joined,undefined);
  for(const kind of ['exercise','card','guide','nutrition'] as const){const doc=await document(kind);const data={...doc.data,...(kind==='exercise'?{name:'Edited exercise'}:kind==='card'?{annualFee:17}:{title:'Edited content'})};await publish(doc,data);const payload=(await call('user',undefined,'',true)).data;const list=kind==='exercise'?payload.exercises:kind==='card'?payload.library.cards:kind==='guide'?payload.library.guides:payload.library.nutrition;assert.ok(list.some((item:{id:string})=>item.id===doc.id));}
  const product=await document('product','pick-reload-orange-20');await publish(product,{...product.data,title:'Edited pick'});assert.equal((await call('user',undefined,'',true)).data.products.find((item:{id:string})=>item.id===product.id).title,'Edited pick');
  for(const [kind,list]of [['cardIssuer','issuers'],['cardListing','listings'],['cardPlatform','platforms'],['cardOffer','offers']] as const){const doc=await document(kind);const title=`Admin edited ${kind}`;await publish(doc,{...doc.data,title});const payload=(await cardResearchCall()).data;assert.equal(payload.cardResearch[list].find((item:{id:string})=>item.id===doc.id).title,title);}
  assert.equal((await call('creator',{action:'publish',kind:'cardOffer',id:'denied-offer',version:0,data:{id:'denied-offer'}})).status,403);
  const event=await document('event','hyd-tech-devfest-2026');await publish(event,{...event.data,title:'Edited event'});assert.equal((await call('user',undefined,'',true)).data.events.find((item:{id:string})=>item.id===event.id).title,'Edited event');
  const settings=await document('settings','app');const supplementDiscovery=structuredClone(settings.data.supplementDiscovery) as {topics:{summary:string}[]};supplementDiscovery.topics[0].summary='Edited supplement topic from the admin workspace.';await publish(settings,{...settings.data,supplementDiscovery,eventCities:['Hyderabad','Bengaluru'],defaultCreatorMonthlyEvents:3});const creatorPayload=(await call('creator',undefined,'',true)).data;assert.equal(creatorPayload.creatorEventQuota.limit,3);assert.equal(creatorPayload.library.settings.supplementDiscovery.topics[0].summary,'Edited supplement topic from the admin workspace.');
  const people=await call('admin',undefined,'?view=people&search=creator');const creator=people.data.people.find((person:{handle:string})=>person.handle==='creator');const account={...creator,bio:creator.bio??'',instagramUrl:creator.instagramUrl??'',avatarUrl:creator.avatarUrl??''};
  assert.equal((await call('admin',{action:'person',...account,name:'Edited person',disabled:true})).status,400,'Suspension needs a reason');assert.equal((await call('creator',undefined,'',true)).status,200);
  assert.equal((await call('admin',{action:'person',...account,name:'Edited person',disabled:true,reason:'Integration suspension'})).status,200);assert.equal((await call('creator',undefined,'',true)).status,401);
  assert.equal((await call('admin',{action:'person',...account,disabled:false,reason:'Integration unsuspension'})).status,200);assert.equal((await call('creator',undefined,'',true)).status,401,'Unsuspension does not revive revoked sessions');
  const personHistory=(await call('admin',undefined,`?view=person-history&id=${creator.id}`)).data.history as {reason:string;after:{disabled:boolean}}[];assert.deepEqual(personHistory.slice(0,2).map(entry=>[entry.reason,entry.after.disabled]),[['Integration unsuspension',false],['Integration suspension',true]]);
  const admin=(await call('admin',undefined,'?view=people&search=admin')).data.people.find((person:{handle:string})=>person.handle==='admin');assert.equal((await call('admin',{action:'person',...admin,bio:'',instagramUrl:'',avatarUrl:'',role:'member'})).status,400);
  console.log('Admin CMS integration passed: authorization, drafts, publication, concurrent-edit conflicts, restore, dynamic flows/focus/cards/exercises/guides/nutrition/picks/events/settings, item/activity analytics, profile updates, suspension and protected admin access.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
