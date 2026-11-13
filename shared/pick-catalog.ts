import type {MobilePayload} from './mobile';
import type {Product} from './mobile';
import {purchaseHost} from './purchases';
export const defaultFeaturedProductIds=['pick-sony-ch520','pick-whey-nakpro','pick-amazfit-bip-6','pick-amayu-oats','pick-sony-ult-field-1','pick-portronics-luxcell-b','pick-sbd-straps-classic'];
export function customerReadyProduct(product:Product){return product.status==='published'&&!product.demo&&!product.catalogueOnly&&Boolean(product.imageUrl?.startsWith('https://')&&product.variantLabel&&product.purchaseOptions?.some(option=>purchaseHost(option.url)&&option.price>0&&option.availability!=='out-of-stock'));}
export function browseProducts(data:Pick<MobilePayload,'products'|'flowResources'>){
  // Feed records win over connections, including explicit archival/moderation changes.
  return [...new Map([...(data.flowResources?.products??[]),...data.products].map(product=>[product.id,product])).values()].filter(customerReadyProduct);
}
