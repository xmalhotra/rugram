import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {flows,type MobilePayload} from '../shared/mobile';
import {exercises} from '../shared/exercises';
import {curatedFlowEvents,curatedFlowProducts} from '../shared/curated-flow-resources';
import {addedFlows,buildStoryGroups,homeFlowSummary,resolveStoryTarget} from '../shared/home-feed';
import {recipeFlows} from '../shared/recipe-flows';
const now=new Date('2026-10-15').getTime();
function payload(ids:string[]=[]):MobilePayload{return {user:{id:'test',name:'Test',handle:'test',role:'user'},profile:{city:'Bengaluru',flowIds:ids,savedProductIds:[],completed:[],eventIds:[]},flows,exercises,products:curatedFlowProducts,events:[],flowResources:{products:curatedFlowProducts,events:curatedFlowEvents},attendance:{},analytics:null,demoMode:true,nextCursor:null};}
test('Home is populated only from added flows, newest addition first, without fake posts',()=>{
  assert.deepEqual(addedFlows(payload()),[]);assert.deepEqual(buildStoryGroups(payload()),[]);
  const data=payload(['fitness-hyrox-base',recipeFlows[0].id,'missing-id',recipeFlows[0].id]);
  assert.deepEqual(addedFlows(data).map(flow=>flow.id),[recipeFlows[0].id,'fitness-hyrox-base']);
  assert.equal(buildStoryGroups(data,now).length,2);
});
test('HYROX stories route to actual related flows, Picks and upcoming events',()=>{
  const data=payload(['fitness-hyrox-base']);const [group]=buildStoryGroups(data,now);
  assert.ok(group.cards.some(card=>card.target.kind==='flow' && card.target.id==='nutrition-pre-hyrox'));
  assert.ok(group.cards.some(card=>card.target.kind==='pick'));
  assert.ok(group.cards.some(card=>card.target.kind==='event'));
  for(const card of group.cards)assert.ok(resolveStoryTarget(data,card.target,now));
  assert.ok(!group.cards.some(card=>card.target.id==='tech-web-first-page'));
});
test('recipe stories stay in the selected preference and can lead to another relevant flow',()=>{
  const data=payload([recipeFlows[0].id]);const [group]=buildStoryGroups(data,now);
  assert.ok(group.cards.some(card=>card.target.id==='nutrition-protein-plant'));
  assert.ok(!group.cards.some(card=>card.target.kind==='event' || card.target.kind==='pick'));
  assert.ok(!group.cards.some(card=>card.target.id==='recipe-egg-chickpea-bowl'));
  assert.ok(recipeFlows.every(flow=>flow.recipe?.ingredients.length && flow.recipe.method.length && flow.steps.length));
});
test('already-added flows are not advertised as new suggestions, and stale targets fail closed',()=>{
  const data=payload(['fitness-hyrox-base','nutrition-pre-hyrox']);
  const group=buildStoryGroups(data,now).find(item=>item.id==='fitness-hyrox-base')!;
  assert.ok(!group.cards.some(card=>card.eyebrow==='RELATED FLOW' && card.target.id==='nutrition-pre-hyrox'));
  assert.equal(resolveStoryTarget(data,{kind:'flow',id:'missing'}),null);
  const product={...curatedFlowProducts[0],status:'archived' as const};
  const stale={...data,products:[product],flowResources:{products:[product],events:curatedFlowEvents}};
  assert.equal(resolveStoryTarget(stale,{kind:'pick',id:product.id}),null);
  assert.equal(resolveStoryTarget(data,{kind:'event',id:curatedFlowEvents[0].id},new Date('2030-01-01').getTime()),null);
});
test('equipment stories do not promote buying a type already available to the user',()=>{
  const data=payload(['fitness-gym-equipment']);
  data.profile.availableSupportIds=['lifting-belt','lifting-straps','wrist-wraps','knee-sleeves'];
  assert.equal(buildStoryGroups(data,now).length,0);
  data.profile.availableSupportIds=['lifting-belt'];
  const picks=buildStoryGroups(data,now)[0].cards.filter(card=>card.target.kind==='pick');
  assert.ok(picks.length>0);
  assert.ok(picks.every(card=>data.products.find(product=>product.id===card.target.id)?.equipmentType!=='lifting-belt'));
});
test('Home identifies saved guides with concise format metadata rather than generic instructions',()=>{
  for(const [id,summary] of [
    ['workout-cindy','20-minute AMRAP'],
    ['workout-animal-movements','10 movements'],
    ['running-styles','5 running styles'],
    ['hyrox-half','8 × 500 m + half-volume stations'],
  ])assert.equal(homeFlowSummary(flows.find(flow=>flow.id===id)!),summary);
  const simple={...flows[0],sessionGuide:undefined,workout:undefined,recipe:undefined,steps:[flows[0].steps[0]]};
  assert.equal(homeFlowSummary(simple),'1 step');
  assert.equal(homeFlowSummary(recipeFlows[0]),'Recipe guide');
});
test('Morning drinks stays one saved collection rather than promoting its drink pages as new flows',()=>{
  const data=payload(['lifestyle-morning-drinks']);
  assert.deepEqual(addedFlows(data).map(flow=>flow.title),['Morning drinks']);
  assert.deepEqual(buildStoryGroups(data,now),[]);
});
test('Home prioritises named added flows without the large Today panel or green instruction copy',()=>{
  const app=readFileSync('mobile/App.tsx','utf8');
  const home=readFileSync('mobile/src/HomeFeed.tsx','utf8');
  assert.doesNotMatch(app,/TodayChecklist/);
  assert.match(home,/Your flows/);
  assert.match(home,/latest first/);
  assert.match(home,/No flows added yet/);
  assert.match(home,/accessibilityLabel="Open Flows"/);
  assert.match(home,/onPress: \(\) => onFlow\(flow\)/);
  assert.match(home,/<FlowMindMap branches=\{branches\} \/>/);
  assert.match(home,/<FlowIllustration flow=\{flow\}/);
  assert.match(home,/<FlowHeartAction/);
  assert.ok(home.indexOf('flows.slice(0, limit)')<home.indexOf('From your flows'));
  assert.doesNotMatch(home,/todaySteps|done today|ReasonLine|flowReason|flow\.milestone|Open flow →|C\.lime/);
  const heart=readFileSync('mobile/src/FlowHeartAction.tsx','utf8');
  assert.match(heart,/label \?\?/);
  assert.match(heart,/#E10600/);
});
