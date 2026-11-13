import type {Product} from './mobile';
import snapshot from './electronics-snapshot.json';
export const electronicsProducts:Product[]=snapshot.records.map(item=>({
  id:item.id,title:item.title,category:'Tech',subcategory:item.subcategory,
  variantLabel:item.variantLabel,packLabel:item.subcategory==='Earbuds'?'One earbuds set':item.subcategory==='Headphones'?'One pair of headphones':item.subcategory==='Laptops'?'One laptop':item.subcategory==='TVs'?'One television':'One speaker',price:item.price,tier:item.price<5000?'Essential':item.price<50000?'Upgrade':'Premium',
  summary:item.summary,url:item.url,imageUrl:item.imageUrl,checkedAt:snapshot.checkedAt,
  status:'published',createdBy:'admin',demo:false,catalogueOnly:item.subcategory==='Laptops'||item.availability==='out-of-stock',endorsements:[],
  comparisonGroup:`electronics-${item.subcategory.toLowerCase()}`,
  safetyNote:'Check compatibility, the exact variant, warranty, return policy and all checkout charges. Manufacturer listings are not independent testing or creator endorsements.',
  specifications:[...item.specifications,{label:'Price basis',value:item.priceBasis}].map(spec=>({...spec,sourceUrl:item.sourceUrl,checkedAt:snapshot.checkedAt})),
  purchaseOptions:[{url:item.url,sellerName:item.subcategory==='Laptops'?'ASUS India':item.subcategory==='TVs'?'Vu official catalogue':'boAt official store',price:item.price,shippingFee:null,availability:item.availability as 'in-stock'|'out-of-stock'|'unknown',deliveryNote:'Snapshot, not a live quote. '+(item.availability==='out-of-stock'?'Unavailable in direct-store feed; dealer inventory unverified. ':'')+'Confirm price, variant, stock, delivery and charges.',checkedAt:snapshot.checkedAt}],
  assessment:{bestFor:item.summary,whyChosen:'Included as a real, source-linked catalogue option to research. This is not a top-ten ranking or a tested best-buy recommendation.',notFor:'Anyone whose required features or exact configuration do not match the seller listing.',tradeoffs:[item.note],criteria:['Official India product listing','Distinct product or screen-size variant','Recorded INR price'],sourceUrls:[item.url,item.sourceUrl].filter((value,index,array)=>array.indexOf(value)===index),checkedAt:snapshot.checkedAt},
}));

