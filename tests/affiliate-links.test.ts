import test from 'node:test';
import assert from 'node:assert/strict';
import {affiliateSeller,purchaseDestination,sellerPriceLabel,storeLabel,type PurchaseOption} from '../shared/purchases';
import {purchaseOptionSchema} from '../src/lib/product-validation';
const option:PurchaseOption={url:'https://www.amazon.in/dp/TEST',sellerName:'Example seller',price:2499,shippingFee:null,deliveryNote:'Confirm final delivery charges.',checkedAt:new Date().toISOString()};
test('Amazon links do not display manually stored prices; other sellers show their own price',()=>{
  assert.equal(sellerPriceLabel(option),'Check price');assert.equal(sellerPriceLabel({...option,url:'https://amzn.to/example'}),'Check price');
  assert.equal(storeLabel('https://amazon.in.evil.example/product'),'amazon.in.evil.example');
  assert.equal(sellerPriceLabel({...option,url:'https://www.flipkart.com/product'}),'₹2,499');
});
test('affiliate destination preserves supplied tracking parameters without inventing or personalising tags',()=>{
  const affiliate={...option,affiliateUrl:'https://www.amazon.in/dp/TEST?tag=test-account-21&linkCode=abc',affiliateDisclosure:'Affiliate link; a commission may be earned.'};
  assert.equal(purchaseDestination(affiliate),affiliate.affiliateUrl);assert.equal(affiliateSeller(affiliate),true);assert.equal(purchaseOptionSchema.safeParse(affiliate).success,true);
  assert.equal(purchaseDestination(option),option.url);assert.equal(affiliateSeller(option),false);
});
test('affiliate publication rejects missing disclosures, unsafe URLs and cross-seller redirects',()=>{
  assert.equal(purchaseOptionSchema.safeParse({...option,affiliateUrl:'https://amzn.to/test'}).success,false);
  assert.equal(purchaseOptionSchema.safeParse({...option,url:'https://www.amazon.in/dp/TEST?tag=test-21'}).success,false);
  assert.equal(purchaseOptionSchema.safeParse({...option,affiliateUrl:'javascript:alert(1)',affiliateDisclosure:'Commercial link'}).success,false);
  assert.equal(purchaseOptionSchema.safeParse({...option,affiliateUrl:'https://www.flipkart.com/product',affiliateDisclosure:'Commercial link'}).success,false);
  assert.equal(purchaseOptionSchema.safeParse({...option,affiliateUrl:'https://amzn.to/test',affiliateDisclosure:'Commercial link'}).success,true);
});
