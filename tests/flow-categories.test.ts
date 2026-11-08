import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {flowCategoryGroups,defaultFlowCategoryGroups} from '../shared/flow-categories';
import {focusOptions} from '../shared/focus';
import {validateContent} from '../src/lib/content-validation';
const initialSettings={id:'app',title:'BetterHabits',eventCities:['Hyderabad'],eventCountry:'IN',eventTopics:['Tech'],defaultCreatorMonthlyEvents:2,productCategories:[{id:'Tech',title:'Tech',subcategories:[]}],tiers:['Essential']};
test('four broad categories contain the existing specific interests without duplicating them',()=>{
 const groups=flowCategoryGroups(focusOptions);
 // Nutrition lives inside Lifestyle.
 assert.deepEqual(groups.map(group=>group.title),['Fitness','Tech','Lifestyle']);
 // Supplements sit in Lifestyle; Fitness links to them.
 assert.deepEqual(groups[0].focusIds,['workout','running','hyrox']);
 assert.deepEqual(groups[1].focusIds,['coding']);assert.deepEqual(groups[2].focusIds,['morning-drinks','nutrition','supplements','sleep']);
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
test('the Flows tab is the fitness catalog, with saved flows still available from Yours',()=>{
 const app=readFileSync('mobile/App.tsx','utf8');
 assert.match(app,/<FlowCatalogHome/);
 assert.doesNotMatch(app,/FlowCategories|FlowTopicBrowser|usePaneState\('flowGroup'/);
 assert.match(readFileSync('mobile/src/FlowCatalogHome.tsx','utf8'),/sectionsInRoot/);
});
