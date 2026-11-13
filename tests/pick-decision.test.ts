import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionAlternative,decisionLine} from '../shared/pick-decision';
import {curatedFlowProducts} from '../shared/curated-flow-resources';
test('electronics comparison chooses the nearest priced, available same-category alternative',()=>{
 const sony=curatedFlowProducts.find(item=>item.id==='pick-sony-ch520')!;
 const other=decisionAlternative(sony,curatedFlowProducts)!;
 assert.ok(other);assert.equal(other.subcategory,'Headphones');assert.equal(other.id,'tech-boat-boat-rockerz-plus-450-anc');
 assert.equal(decisionAlternative(sony,[{...other,catalogueOnly:true}]),null);
 assert.equal(decisionAlternative(sony,[{...other,price:50000,purchaseOptions:other.purchaseOptions!.map(option=>({...option,price:50000}))}]),null);
 assert.equal(decisionAlternative(sony,[{...other,subcategory:'Speakers'}]),null);
});
test('food and supplements are not price-compared across different servings or doses',()=>{
 const whey=curatedFlowProducts.find(item=>item.id==='pick-whey-nakpro')!;
 assert.equal(decisionAlternative(whey,curatedFlowProducts),null);
});
test('decision copy stays brief while full evidence remains available separately',()=>{
 assert.equal(decisionLine('Good for listening. '+ 'More details '.repeat(30)),'Good for listening.');
 assert.equal(decisionLine('a'.repeat(400)).length,145);
});
