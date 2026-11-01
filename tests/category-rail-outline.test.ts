import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryRailOutline,categoryRailPath} from '../shared/category-rail';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('outline joins the selected tab to a continuous baseline with no segment below it',()=>{
 for(let index=0;index<4;index++){const shape=categoryRailOutline(4,index,350);assert.equal(shape.valid,true);assert.equal(shape.start-shape.curve,shape.leftWidth);assert.equal(shape.end+shape.curve,shape.rightStart);assert.equal(shape.rightStart+shape.rightWidth,shape.width);assert.ok(shape.leftWidth>=0);assert.ok(shape.rightWidth>=0);}
 assert.equal(categoryRailOutline(1,0,390).width,390);
 assert.equal(categoryRailOutline(0,-1,390).valid,false);
});
test('all rails use a connected cutout with the same surface as the content below',()=>{
 const rail=readFileSync('mobile/src/CategoryRail.tsx','utf8');assert.match(rail,/<CategoryRailOutline/);assert.doesNotMatch(rail,/!compact&&<CategoryRailOutline/);containsCode(rail,'surface={C.bg} inactiveSurface={C.card}');containsCode(rail,'borderWidth:0');
 const outline=readFileSync('mobile/src/CategoryRailOutline.tsx','utf8');assert.match(outline,/<Path d=\{shape.border\}/);assert.match(outline,/strokeLinejoin="round"/);assert.doesNotMatch(outline,/borderBottomWidth|borderRightWidth|borderLeftWidth/);assert.match(outline,/pointerEvents="none"/);
});
test('border has exactly one connected subpath through every curved intersection',()=>{
 for(const count of [1,4,6])for(let index=0;index<count;index++)for(const height of [44,104,150])for(const itemWidth of [88,100]){
  const shape=categoryRailPath(count,index,390,height,itemWidth);
  assert.equal((shape.border.match(/M /g)??[]).length,1);assert.equal((shape.border.match(/Q /g)??[]).length,4);assert.equal(shape.border.includes('Z'),false);assert.ok(shape.fill.endsWith('Z'));assert.doesNotMatch(shape.border,/NaN|Infinity/);
 }
});
test('compact cutout geometry uses its actual item width',()=>{
 const shape=categoryRailOutline(5,3,390,100);assert.equal(shape.start,14+3*108);assert.equal(shape.end-shape.start,100);assert.equal(shape.width,560);assert.equal(shape.rightStart+shape.rightWidth,shape.width);
});
