import test from 'node:test';
import assert from 'node:assert/strict';
import {needsFocusOnboarding} from '../shared/flow-browse';
import {flowsForFocus} from '../shared/focus';
import {flows} from '../shared/mobile';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('flow preview stays read-only until the user adds the flow',()=>{
  const details=readFileSync('mobile/src/FlowDetails.tsx','utf8');
  const equipment=readFileSync('mobile/src/GymSupportGuide.tsx','utf8');
  containsCode(details,'const isAdded=data.profile.flowIds.includes(flow.id)');
  assert.match(details,/readOnly=\{!isAdded\}/);
  containsCode(details,'if(isAdded&&!busy)onAvailable(id,enabled)');
  assert.match(details,/isAdded && flow\.review/);
  assert.match(equipment,/!readOnly\s*&&\s*\(?\s*<HabitToggle/);
  const store=readFileSync('src/lib/mobile/profile.ts','utf8');
  containsCode(store,'profileBefore.flowIds.includes(flow.id) && flow.steps.some');
  assert.match(store,/Join the flow before completing its steps/);
});
test('Home requires a first flow; saving a focus alone must not finish onboarding',()=>{
  assert.equal(needsFocusOnboarding({flowIds:[]}),true);
  assert.equal(needsFocusOnboarding({focusId:'running',flowIds:[]}),true);
  assert.equal(needsFocusOnboarding({flowIds:['existing']}),false);
});
test('category browsing uses admin-configured flows and order without changing the saved focus',()=>{
  const profile={focusId:'running',flowIds:[]};const options=[{id:'custom',flowIds:[flows[1].id,flows[0].id]}];
  assert.deepEqual(flowsForFocus(flows,'custom',options).map(flow=>flow.id),options[0].flowIds);
  assert.equal(profile.focusId,'running');
  assert.deepEqual(flowsForFocus(flows,'missing',options),[]);
});
test('Home shows added flows and leaves the guide library on the Flows tab',()=>{
  const tabs=readFileSync('mobile/app/(tabs)/_layout.tsx','utf8');
  containsCode(tabs,'return (<NativeTabs');
  assert.doesNotMatch(tabs,/<Redirect|needsFocusOnboarding/);
  const home=readFileSync('mobile/app/(tabs)/index.tsx','utf8');
  assert.match(home,/<QramScreen tab="Flows"/);
  assert.doesNotMatch(home,/needsFocusOnboarding|FocusStarter|Onboarding/);
  const onboarding=readFileSync('mobile/app/onboarding.tsx','utf8');
  assert.match(onboarding,/<Redirect href="\/\(tabs\)"/);
  const app=readFileSync('mobile/App.tsx','utf8');
  containsCode(app,"edges={homeScreen?['top','bottom']:['top']}");
  assert.match(tabs,/name="index" disableAutomaticContentInsets/);
  containsCode(app,"inset={homeScreen?'never':'automatic'}");
  const rootList=readFileSync('mobile/src/RootList.tsx','utf8');
  containsCode(rootList,'contentInsetAdjustmentBehavior={inset}');
  assert.doesNotMatch(app,/FocusStarter/);
  // Home opens on the community feed; your own flows sit under the Yours segment.
  containsCode(app,"tab==='Flows' && (<View");
  containsCode(app,"homeTab==='yours'?(<HomeFeed");
  containsCode(app,"<CommunityFeed key={homeTab} tab={homeTab}");
  containsCode(app,"tab==='Discover' && (");
  assert.ok(!app.includes("tab==='Flows' && (onboarding"));
});
test('first-time journey stays in setup through focus selection, then reaches Home after adding a flow',()=>{
  const profile:{focusId?:string;flowIds:string[]}={flowIds:[]};
  assert.equal(needsFocusOnboarding(profile),true);
  profile.focusId='running';
  assert.equal(needsFocusOnboarding(profile),true);
  const starters=flowsForFocus(flows,profile.focusId);assert.ok(starters.length>0);
  profile.flowIds.push(starters[0].id);
  assert.equal(needsFocusOnboarding(profile),false);
  profile.flowIds=[];
  assert.equal(needsFocusOnboarding(profile),true);
});
