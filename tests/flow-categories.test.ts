import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
import {flowCategoryGroups,defaultFlowCategoryGroups} from '../shared/flow-categories';
import {focusOptions} from '../shared/focus';
import {validateContent} from '../src/lib/content-validation';
const initialSettings={id:'app',title:'BetterHabits',eventCities:['Hyderabad'],eventCountry:'IN',eventTopics:['Tech'],defaultCreatorMonthlyEvents:2,productCategories:[{id:'Tech',title:'Tech',subcategories:[]}],tiers:['Essential']};
test('four broad categories contain the existing specific interests without duplicating them',()=>{
 const groups=flowCategoryGroups(focusOptions);
 assert.deepEqual(groups.map(group=>group.title),['Fitness','Tech','Lifestyle','Nutrition']);
 assert.deepEqual(groups[0].focusIds,['workout','running','hyrox','supplements']);
 assert.deepEqual(groups[1].focusIds,['coding']);assert.deepEqual(groups[2].focusIds,['morning-drinks','sleep']);
 assert.equal(new Set(groups.flatMap(group=>group.focusIds)).size,focusOptions.length);
});
test('admin changes are respected and new topics cannot become unreachable',()=>{
 const configured=[{id:'custom',title:'Build',illustration:'coding',focusIds:['coding','missing','coding']}];
 const groups=flowCategoryGroups([...focusOptions,{id:'new-interest'}],configured);
 assert.deepEqual(groups[0].focusIds,['coding']);
 assert.ok(groups.at(-1)!.focusIds.includes('new-interest'));
 assert.deepEqual(flowCategoryGroups([],defaultFlowCategoryGroups),[]);
 assert.ok(validateContent('settings',{...initialSettings,flowCategoryGroups:defaultFlowCategoryGroups}));
 assert.throws(()=>validateContent('settings',{...initialSettings,flowCategoryGroups:[defaultFlowCategoryGroups[0],defaultFlowCategoryGroups[0]]}));
});
test('first-time focus and Flows share one hierarchical browser, with no extra submit action',()=>{
 for(const path of ['FlowCategories','FlowDiscovery'])assert.match(readFileSync(`mobile/src/${path}.tsx`,'utf8'),/<FlowTopicBrowser/);
 const source=readFileSync('mobile/src/FlowTopicBrowser.tsx','utf8');
 assert.match(source,/<FlowSections/);assert.match(source,/group.focusIds/);assert.match(source,/nutritionPaths=\{nutritionPaths\}/);containsCode(source,"setGroup(item.id);resetScroll()");
 const discovery=readFileSync('mobile/src/FlowDiscovery.tsx','utf8');
 assert.match(discovery,/onFocus\(focusId\)/);assert.doesNotMatch(discovery,/Show my starter flows|radiogroup/);
});
