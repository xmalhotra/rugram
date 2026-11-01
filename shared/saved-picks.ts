import type {MobilePayload} from './mobile';
export function savedPicks(data:Pick<MobilePayload,'products'|'flowResources'|'profile'>){
  const library=new Map([...data.flowResources.products,...data.products].map(product=>[product.id,product]));
  const ids=[...new Set(data.profile.savedProductIds)].reverse();
  return {products:ids.flatMap(id=>library.has(id)?[library.get(id)!]:[]),unavailable:ids.filter(id=>!library.has(id)).length,count:ids.length};
}
