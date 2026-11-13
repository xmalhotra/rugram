import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedFlowProducts} from '../shared/curated-flow-resources';
import {customerReadyProduct,defaultFeaturedProductIds} from '../shared/pick-catalog';
import {storeReadyProducts} from '../shared/store-ready-products';
import {productSchema} from '../src/lib/product-validation';

test('customer catalogue hides research-only, demo and unavailable products',()=>{
 const product=storeReadyProducts[0];
 assert.ok(customerReadyProduct(product));
 for(const patch of [{catalogueOnly:true},{demo:true},{imageUrl:''},{variantLabel:''},{status:'archived' as const},{purchaseOptions:product.purchaseOptions!.map(option=>({...option,availability:'out-of-stock' as const}))},{purchaseOptions:product.purchaseOptions!.map(option=>({...option,url:'http://localhost/product'}))}])assert.equal(customerReadyProduct({...product,...patch}),false);
});
test('featured shelf resolves real photographed products with purchase variants',()=>{
 for(const id of defaultFeaturedProductIds){const product=curatedFlowProducts.find(product=>product.id===id);assert.ok(product,id);assert.ok(customerReadyProduct(product),id);}
});
test('new Sony products have valid exact-variant seller records',()=>{
 for(const product of storeReadyProducts){assert.ok(productSchema.safeParse(product).success,product.id);assert.match(product.purchaseOptions![0].url,/\?variant=\d+/);assert.ok(product.purchaseOptions![0].price>0);assert.notEqual(product.demo,true);}
});
