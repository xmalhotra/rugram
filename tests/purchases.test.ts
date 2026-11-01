import assert from 'node:assert/strict';
import test from 'node:test';
import {purchaseOptionSchema,productSchema} from '../src/lib/product-validation';
import {draftPurchaseOptions,emptyPurchaseDraft,offerState,primaryPurchase,purchaseHost,snapshotPurchase,storeLabel,type PurchaseOption} from '../shared/purchases';
import {curatedGymProducts} from '../shared/curated-gym-products';
const option:PurchaseOption={url:'https://example.com/product',sellerName:'Example shop',price:100,shippingFee:null,deliveryNote:'Confirm delivery in your location.',checkedAt:new Date(Date.now()-1000).toISOString()};
test('shop links reject private hosts, credentials and unsafe schemes without trusting store-like strings',()=>{
  for(const url of ['javascript:alert(1)','http://amazon.in/product','https://localhost/product','https://127.0.0.1/product','https://192.168.1.1/product','https://[::1]/product','https://shop.local/p','https://user:pass@example.com/p','https://example.com:8080/p','not a url'])assert.equal(purchaseOptionSchema.safeParse({...option,url}).success,false,url);
  assert.equal(purchaseHost('https://www.amazon.in/product'),'amazon.in');assert.equal(storeLabel('https://www.amazon.in/product'),'Amazon');
  assert.equal(storeLabel('https://amazon.in.bad-shop.com/product'),'amazon.in.bad-shop.com');
  assert.equal(storeLabel('https://www.swiggy.com/instamart/item'),'Swiggy Instamart');
});
test('new Picks require a variant and one to five complete seller records',()=>{
  const base=curatedGymProducts[0];
  assert.equal(productSchema.safeParse({...base,purchaseOptions:undefined}).success,false);
  assert.equal(productSchema.safeParse({...base,variantLabel:''}).success,false);
  assert.equal(productSchema.safeParse({...base,purchaseOptions:[]}).success,false);
  assert.equal(productSchema.safeParse({...base,purchaseOptions:Array.from({length:6},(_,i)=>({...option,url:`https://example.com/${i}`}))}).success,false);
  for(const changes of [{price:-1},{price:NaN},{shippingFee:-1},{sellerName:''},{deliveryNote:''},{checkedAt:new Date(Date.now()+86400000).toISOString()}])assert.equal(purchaseOptionSchema.safeParse({...option,...changes}).success,false);
});
test('the API derives canonical price from item prices, not conditional discount claims or client summary fields',()=>{
  const options=[{...option,price:150,offer:{label:'Conditional 50% offer',terms:'Eligible cards only; check seller terms.'}},{...option,url:'https://example.org/product',price:100}];
  assert.equal(primaryPurchase(options)?.price,100);
  const parsed=productSchema.parse({...curatedGymProducts[0],price:1,url:'https://example.net/fake-summary',purchaseOptions:options});
  assert.equal(parsed.price,100);assert.equal(parsed.url,'https://example.org/product');
  assert.equal(parsed.purchaseOptions[0].offer?.label,'Conditional 50% offer');
});
test('duplicate and invalid seller URLs return validation errors rather than throwing',()=>{
  const base=curatedGymProducts[0];
  assert.equal(productSchema.safeParse({...base,purchaseOptions:[option,option]}).success,false);
  assert.doesNotThrow(()=>assert.equal(productSchema.safeParse({...base,purchaseOptions:[{...option,url:'not-url'}]}).success,false));
});
test('offers retain eligibility and expiry instead of being treated as unconditional savings',()=>{
  assert.equal(offerState(undefined),'none');
  assert.equal(offerState({label:'Test',terms:'Eligible orders only'}),'expiry-unknown');
  assert.equal(offerState({label:'Test',terms:'Eligible orders only',expiresAt:'2000-01-01T00:00:00Z'}),'expired');
  assert.equal(offerState({label:'Test',terms:'Eligible orders only',expiresAt:'2999-01-01T00:00:00Z'}),'listed');
  assert.equal(purchaseOptionSchema.safeParse({...option,offer:{label:'Test'}}).success,false);
});
test('unknown delivery stays null; free delivery stays zero; no synthetic offers appear on source snapshots',()=>{
  assert.equal(purchaseOptionSchema.parse(option).shippingFee,null);
  assert.equal(purchaseOptionSchema.parse({...option,shippingFee:0}).shippingFee,0);
  for(const product of curatedGymProducts){assert.ok(product.purchaseOptions?.length);assert.ok(product.purchaseOptions.every(value=>!value.offer&&value.shippingFee===null));}
  const legacy={...curatedGymProducts[0],purchaseOptions:undefined};assert.ok(!legacy.purchaseOptions);assert.equal(snapshotPurchase(legacy).purchaseOptions?.[0].offer,undefined);
});
test('draft entry refuses missing prices, impossible dates and orphaned offer information',()=>{
  const draft={...emptyPurchaseDraft(),url:option.url,sellerName:option.sellerName,price:'100',deliveryNote:option.deliveryNote,checkedDate:'2026-01-01'};
  assert.equal(draftPurchaseOptions([draft])[0].shippingFee,null);
  assert.throws(()=>draftPurchaseOptions([{...draft,price:''}]),/listed price/);
  assert.throws(()=>draftPurchaseOptions([{...draft,checkedDate:'2026-02-31'}]),/Check/);
  assert.throws(()=>draftPurchaseOptions([{...draft,offerCode:'DEAL'}]),/offer description/);
});
