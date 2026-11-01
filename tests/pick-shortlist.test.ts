import test from 'node:test';
import assert from 'node:assert/strict';
import {pickShortlist,shortlistGroups} from '../shared/pick-comparison';
import type {Product} from '../shared/mobile';
import {productSchema} from '../src/lib/product-validation';
const product=(id:string,rank?:number,group='Headphones')=>({id,title:id,category:'Tech',status:'published',price:100,tier:'Premium',assessment:rank?{shortlist:{rank,group,comparedWith:['Another headphones model']},whyChosen:'A sourced fit explanation.',sourceUrls:['https://example.com/specifications'],bestFor:'Focus',notFor:'Sport',criteria:['Comfort'],tradeoffs:['No water resistance'],checkedAt:new Date().toISOString()}:undefined}) as Product;
test('shortlists are explicit editorial ranks, not price or influencer popularity',()=>{
  const first=product('A',2),second={...product('B',1),price:1000},unranked={...product('C'),endorsements:new Array(100).fill({})};
  const groups=shortlistGroups([first,unranked,second]);assert.deepEqual(groups[0].products.map(item=>item.id),['B','A']);assert.equal(groups[1].ranked,false);assert.equal(pickShortlist(unranked),null);
  assert.equal(pickShortlist({...first,status:'pending'}),null);
});
test('comparison groups and filtered shortlist numbers do not become a global or renumbered best list',()=>{
  const groups=shortlistGroups([product('Headphones',2),product('Watch',1,'Activity trackers')]);assert.equal(groups.length,2);assert.equal(pickShortlist(groups.find(group=>group.title==='Headphones')!.products[0])!.rank,2);
});
test('rank requires a comparison group, alternative names and supporting sources',()=>{
  const sample=product('A',1);const schema=productSchema;const input={...sample,title:'Focus headphones',subcategory:'Audio',variantLabel:'One pair',summary:'A fictional product for validation.',url:'https://example.com/headphones',checkedAt:new Date().toISOString(),purchaseOptions:[{url:'https://example.com/headphones',sellerName:'Demo seller',price:100,shippingFee:null,deliveryNote:'Check charges at checkout.',checkedAt:new Date().toISOString()}]};
  assert.equal(schema.safeParse(input).success,true);
  assert.equal(schema.safeParse({...input,assessment:{...sample.assessment,shortlist:{rank:0,group:'Headphones',comparedWith:['Alternative']}}}).success,false);
  assert.equal(schema.safeParse({...input,assessment:{...sample.assessment,shortlist:{rank:1,group:'',comparedWith:[]}}}).success,false);
  assert.equal(pickShortlist({...sample,assessment:{...sample.assessment!,sourceUrls:[]}}),null);
});
