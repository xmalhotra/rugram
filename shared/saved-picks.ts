import type {MobilePayload} from './mobile';
export function savedPicks(data:Pick<MobilePayload,'products'|'flowResources'|'profile'>){
  const library=new Map([...data.flowResources.products,...data.products].map(product=>[product.id,product]));
  const ids=[...new Set(data.profile.savedProductIds)].reverse();
  return {products:ids.flatMap(id=>library.has(id)?[library.get(id)!]:[]),unavailable:ids.filter(id=>!library.has(id)).length,count:ids.length};
}
/** Your picks map: saved picks grouped under each Picks category, in catalogue order. */
export function picksMap(data:Pick<MobilePayload,'products'|'flowResources'|'profile'>,categories:readonly {id:string;title:string}[]){
  const {products}=savedPicks(data);
  const known=new Set(categories.map(item=>item.id));
  const groups=categories.map(item=>({id:item.id,title:item.id==='Tech'&&item.title==='Tech'?'Electronics':item.title,products:products.filter(product=>product.category===item.id)})).filter(group=>group.products.length>0);
  const other=products.filter(product=>!known.has(product.category));
  return other.length?[...groups,{id:'other',title:'Other',products:other}]:groups;
}
