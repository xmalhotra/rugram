import type {Product} from './mobile';
export const electronicsCategories=['Headphones','Earbuds','Laptops','Speakers','TVs'] as const;
export function electronicsType(product:Product){
  if(product.comparisonGroup==='wireless-earbuds')return 'Earbuds';
  if(product.comparisonGroup==='power-banks')return 'Charging';
  if(product.comparisonGroup==='desktop-computers')return 'Desktops';
  return product.subcategory??'Electronics';
}
export function electronicsBrowseCategories(products:Product[],configured:readonly string[]=[]){
  const types=new Set(electronicsItems(products).map(electronicsType));
  return [...new Set([...electronicsCategories,...configured,...types])].filter(type=>types.has(type));
}
export function electronicsItems(products:Product[],type='All'){
  return products.filter(product=>(product.category==='Tech'||product.category==='Electronics')&&product.status==='published'&&!product.demo&&(type==='All'||electronicsType(product)===type));
}
