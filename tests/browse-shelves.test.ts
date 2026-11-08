import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('category sliders keep the selected category visible and announce the selected state',()=>{
 const source=readFileSync('mobile/src/CategoryRail.tsx','utf8');
 assert.match(source,/accessibilityRole="tablist"/);assert.match(source,/accessibilityRole="tab"/);containsCode(source,'selected:selected===item.id');containsCode(source,'onPress={()=>onSelect(item.id)}');assert.match(source,/scrollTo/);assert.match(source,/numberOfLines=\{2\}/);
});
test('Flows, Picks and Events use swipeable compact shelves without losing detail actions',()=>{
 // Events moved to Luma-style date-grouped rows; Picks keeps its shelf.
 for(const file of ['ElectronicsBrowser'])assert.match(readFileSync(`mobile/src/${file}.tsx`,'utf8'),/<BrowseShelf/);
 const flows=readFileSync('mobile/src/FlowCatalogHome.tsx','utf8');
 assert.match(flows,/sectionsInRoot/);
 assert.match(flows,/flexDirection: 'row'/);
 assert.doesNotMatch(readFileSync('mobile/App.tsx','utf8'),/label: group.title/);
 assert.doesNotMatch(flows,/<BrowseShelf/);
 assert.match(readFileSync('mobile/src/NutritionDiscovery.tsx','utf8'),/<FlowSections/);
 const shelf=readFileSync('mobile/src/BrowseShelf.tsx','utf8');assert.match(shelf,/horizontal/);assert.match(shelf,/snapToInterval=\{180\}/);
 for(const file of ['FlowPreview','EventPreview','ProductPreview']){const source=readFileSync(`mobile/src/${file}.tsx`,'utf8');assert.match(source,/168/);assert.match(source,/accessibilityRole="button"/);}
 const picks=readFileSync('mobile/src/PicksBrowser.tsx','utf8');// Saved picks are the first top-bar tab, Yours, not a header link.
  assert.match(picks,/props.section === 'yours' \? \(\s*<SavedPicks/);assert.doesNotMatch(picks,/\['Browse','Saved'\]/);
});
test('secondary navigation uses compact text chips instead of a second illustrated row',()=>{
 const rail=readFileSync('mobile/src/CategoryRail.tsx','utf8');
 containsCode(rail,'minHeight:compact?48:80');containsCode(rail,'!compact&&(item.imageUrl');
 // Category tabs open a Spotify-style home (shelves, then the catalog) rather than section chips.
 const flows=readFileSync('mobile/src/FlowCatalogHome.tsx','utf8');assert.doesNotMatch(flows,/<CategoryRail/);
 assert.match(readFileSync('mobile/src/FlowSections.tsx','utf8'),/<CategoryRail\s+compact/);
 // Supplements dropped its in-goal category row; the back link names the goal.
 for(const file of ['ElectronicsBrowser'])assert.match(readFileSync(`mobile/src/${file}.tsx`,'utf8'),/<CategoryRail\s+compact/);
});
test('selected category labels are not repeated as content headings',()=>{
 const flows=readFileSync('mobile/src/FlowCatalogHome.tsx','utf8');assert.doesNotMatch(flows,/Choose a flow/);
 const electronics=readFileSync('mobile/src/ElectronicsBrowser.tsx','utf8');assert.doesNotMatch(electronics,/\{active==='All'\?'Electronics':active\}/);
 const picks=readFileSync('mobile/src/PicksBrowser.tsx','utf8');assert.doesNotMatch(picks,/\{category==='featured'\?'Handpicked':current\?\.title\?\?category\}/);
});
