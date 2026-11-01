import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('category sliders keep the selected category visible and announce the selected state',()=>{
 const source=readFileSync('mobile/src/CategoryRail.tsx','utf8');
 assert.match(source,/accessibilityRole="tablist"/);assert.match(source,/accessibilityRole="tab"/);containsCode(source,'selected:selected===item.id');containsCode(source,'onPress={()=>onSelect(item.id)}');assert.match(source,/scrollTo/);assert.match(source,/numberOfLines=\{2\}/);
});
test('Flows, Picks and Events use swipeable compact shelves without losing detail actions',()=>{
 for(const file of ['HyderabadEvents','ElectronicsBrowser'])assert.match(readFileSync(`mobile/src/${file}.tsx`,'utf8'),/<BrowseShelf/);
 const flows=readFileSync('mobile/src/FlowTopicBrowser.tsx','utf8');
 assert.match(flows,/accessibilityLabel="Flow categories"/);
 assert.match(flows,/accessibilityLabel="Flow grid"/);
 assert.match(flows,/accessibilityLabel="Flow list"/);
 assert.match(flows,/position: 'absolute'/);
 assert.match(flows,/homeFlowSummary/);
 assert.match(flows,/flexDirection: 'row'/);
 assert.match(flows,/index \+ 5/);
 assert.match(flows,/section\.title/);
 assert.doesNotMatch(flows,/<BrowseShelf/);
 assert.match(readFileSync('mobile/src/NutritionDiscovery.tsx','utf8'),/<FlowSections/);
 const shelf=readFileSync('mobile/src/BrowseShelf.tsx','utf8');assert.match(shelf,/horizontal/);assert.match(shelf,/snapToInterval=\{180\}/);
 for(const file of ['FlowPreview','EventPreview','ProductPreview']){const source=readFileSync(`mobile/src/${file}.tsx`,'utf8');assert.match(source,/168/);assert.match(source,/accessibilityRole="button"/);}
 const picks=readFileSync('mobile/src/PicksBrowser.tsx','utf8');assert.match(picks,/Open saved picks/);assert.doesNotMatch(picks,/\['Browse','Saved'\]/);
});
test('secondary navigation uses compact text chips instead of a second illustrated row',()=>{
 const rail=readFileSync('mobile/src/CategoryRail.tsx','utf8');
 containsCode(rail,'minHeight:compact?48:80');containsCode(rail,'!compact&&(item.imageUrl');
 const flows=readFileSync('mobile/src/FlowTopicBrowser.tsx','utf8');assert.match(flows,/<FlowSections/);assert.doesNotMatch(flows,/title:'All '\+group.title/);
 assert.match(readFileSync('mobile/src/FlowSections.tsx','utf8'),/<CategoryRail\s+compact/);
 for(const file of ['SupplementDiscovery','ElectronicsBrowser'])assert.match(readFileSync(`mobile/src/${file}.tsx`,'utf8'),/<CategoryRail\s+compact/);
});
test('selected category labels are not repeated as content headings',()=>{
 const flows=readFileSync('mobile/src/FlowTopicBrowser.tsx','utf8');assert.doesNotMatch(flows,/\{current\?\.title\?\?'Choose a flow'\}/);
 const electronics=readFileSync('mobile/src/ElectronicsBrowser.tsx','utf8');assert.doesNotMatch(electronics,/\{active==='All'\?'Electronics':active\}/);
 const picks=readFileSync('mobile/src/PicksBrowser.tsx','utf8');assert.doesNotMatch(picks,/\{category==='featured'\?'Handpicked':current\?\.title\?\?category\}/);
});
