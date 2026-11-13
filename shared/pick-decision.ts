import type {Product} from './mobile';
import {customerReadyProduct} from './pick-catalog';
import {sortedPurchaseOptions} from './purchases';
export function decisionLine(value:string|undefined,max=145){const text=(value??'').trim();if(text.length<=max)return text;const sentence=text.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim();return sentence&&sentence.length<=max?sentence:text.slice(0,max-1).trimEnd()+'…';}
export function decisionPrice(product:Product){return sortedPurchaseOptions(product.purchaseOptions??[]).find(option=>option.availability!=='out-of-stock')?.price??product.price;}
export function decisionAlternative(product:Product,library:Product[]){
 // Supplements and food need dose / serving normalization before a price comparison is meaningful.
 if(product.category!=='Tech'||!product.subcategory||!customerReadyProduct(product))return null;
 const price=decisionPrice(product);
 return [...new Map(library.filter(item=>customerReadyProduct(item)&&item.id!==product.id&&item.category===product.category&&item.subcategory===product.subcategory&&(!product.comparisonGroup||item.comparisonGroup===product.comparisonGroup)&&Math.abs(decisionPrice(item)-price)<=price*0.3).map(item=>[item.id,item])).values()].sort((a,b)=>Math.abs(decisionPrice(a)-price)-Math.abs(decisionPrice(b)-price)||a.id.localeCompare(b.id))[0]??null;
}
