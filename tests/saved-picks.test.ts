import test from 'node:test';
import assert from 'node:assert/strict';
import {savedPicks} from '../shared/saved-picks';
import type {MobilePayload,Product} from '../shared/mobile';
const product=(id:string)=>({id,title:id,status:'published'}) as Product;
const data=(ids:string[],products:Product[]=[],resources:Product[]=[])=>({profile:{savedProductIds:ids},products,flowResources:{products:resources}}) as MobilePayload;
test('saved Picks combines catalogue and flow resources, newest save first, without duplicates',()=>{
  const result=savedPicks(data(['first','second'],[product('first')],[product('second'),product('first')]));
  assert.deepEqual(result.products.map(product=>product.id),['second','first']);assert.equal(result.count,2);assert.equal(result.unavailable,0);
});
test('saving and unsaving immediately change the collection; unavailable saves remain accounted for',()=>{
  assert.equal(savedPicks(data([],[product('one')])).count,0);
  assert.equal(savedPicks(data(['one'],[product('one')])).products.length,1);
  const result=savedPicks(data(['missing','missing']));assert.equal(result.count,1);assert.equal(result.unavailable,1);assert.deepEqual(result.products,[]);
});
