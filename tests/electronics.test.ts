import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {electronicsProducts} from '../shared/electronics-catalog';
import {electronicsCategories,electronicsItems,electronicsBrowseCategories} from '../shared/electronics-discovery';
import {curatedEverydayProducts} from '../shared/curated-everyday-products';
import {productSchema} from '../src/lib/product-validation';
test('electronics starts with ten source-linked entries per requested category, not mock rankings',()=>{
  assert.equal(electronicsProducts.length,50);
  assert.equal(new Set(electronicsProducts.map(product=>product.id)).size,50);
  for(const category of electronicsCategories){
    const items=electronicsItems(electronicsProducts,category);assert.equal(items.length,10,category);
    for(const item of items){assert.equal(productSchema.safeParse(item).success,true,item.id);assert.ok(item.price>0);assert.ok(item.imageUrl?.startsWith('https://'));assert.equal(item.assessment?.shortlist,undefined);assert.equal(item.endorsements.length,0);}
  }
});
test('category rail is catalogue-driven, preserves legacy items, and excludes archived or demo products',()=>{
  const products=[...electronicsProducts,...curatedEverydayProducts];
  assert.deepEqual(electronicsBrowseCategories(electronicsProducts).slice(0,5),[...electronicsCategories]);
  assert.equal(electronicsItems(products,'Earbuds').some(item=>item.id==='pick-boat-airdopes-181-pro'),true);
  assert.equal(electronicsItems(products,'Charging').some(item=>item.id==='pick-portronics-luxcell-b'),true);
  assert.equal(electronicsItems([{...electronicsProducts[0],status:'archived'}]).length,0);
  assert.equal(electronicsItems([{...electronicsProducts[0],demo:true}]).length,0);
  assert.equal(electronicsBrowseCategories(products,['Wi-Fi']).includes('Wi-Fi'),false);
});
test('TV size variants are explicit, stock stays honest, and laptop configurations are qualified',()=>{
  for(const item of electronicsItems(electronicsProducts,'TVs')){assert.match(item.variantLabel!,/inch/);assert.equal(item.purchaseOptions?.[0].availability,'out-of-stock');}
  for(const item of electronicsItems(electronicsProducts,'Laptops')){assert.match(item.variantLabel!,/confirm configuration/);assert.ok(item.specifications?.some(spec=>spec.label==='Configuration'));}
  const source=readFileSync('mobile/src/ElectronicsBrowser.tsx','utf8');
  assert.match(source,/<CategoryRail/);assert.match(source,/onSelect=\{setSelected\}/);assert.match(source,/<ProductPreview/);assert.match(source,/onPick=\{onPick\}/);assert.match(source,/onLink=\{onLink\}/);assert.match(source,/<BrowseShelf/);
});
