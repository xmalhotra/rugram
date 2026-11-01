import type {Product} from './mobile';
export type PickSpecification={label:string;value:string;sourceUrl:string;checkedAt:string};
export type PickAssessment={shortlist?:{rank:number;group:string;comparedWith:string[]};bestFor:string;notFor:string;whyChosen:string;tradeoffs:string[];criteria:string[];sourceUrls:string[];checkedAt:string};
export function pickShortlist(product:Product){const assessment=product.assessment;const selection=assessment?.shortlist;return product.status==='published'&&selection&&Number.isInteger(selection.rank)&&selection.rank>0&&selection.group.trim()&&selection.comparedWith.some(name=>name.trim())&&assessment?.whyChosen.trim()&&assessment.sourceUrls.length?selection:null;}
export function shortlistGroups(products:Product[]){
  const groups=new Map<string,{title:string;ranked:boolean;products:Product[]}>();
  for(const product of [...new Map(products.filter(product=>product.status==='published').map(product=>[product.id,product])).values()]){
    const selection=pickShortlist(product);const title=selection?`${product.demo?'Demo · ':''}${selection.group.trim()}`:'More to explore';const key=selection?title.toLowerCase():'unranked';
    if(!groups.has(key))groups.set(key,{title,ranked:Boolean(selection),products:[]});groups.get(key)!.products.push(product);
  }
  return [...groups.values()].sort((a,b)=>Number(b.ranked)-Number(a.ranked)||a.title.localeCompare(b.title)).map(group=>({...group,products:group.products.sort((a,b)=>(pickShortlist(a)?.rank??Infinity)-(pickShortlist(b)?.rank??Infinity)||a.title.localeCompare(b.title))}));
}
export type PublicRecommendation={name:string;profileUrl:string;sourceUrl:string;claim:'Uses'|'Recommends'|'Mentions';context:string;disclosure:string;checkedAt:string;verified:boolean};
export function alternativePicks(product:Product,library:Product[]){return [...new Map(library.filter(item=>item.id!==product.id&&item.status==='published'&&item.category===product.category&&(!product.comparisonGroup||item.comparisonGroup===product.comparisonGroup)&&(!product.assessment?.shortlist?.group||item.assessment?.shortlist?.group===product.assessment.shortlist.group)&&(!product.equipmentType||item.equipmentType===product.equipmentType)&&(!product.subcategory||item.subcategory===product.subcategory)&&(!product.useCases?.length||item.useCases?.some(tag=>product.useCases!.includes(tag)))).map(item=>[item.id,item])).values()].sort((a,b)=>a.price-b.price).slice(0,4);}
export function comparisonRows(products:Product[]){return [...new Set(products.flatMap(product=>(product.specifications??[]).map(spec=>spec.label)))].map(label=>({label,values:products.map(product=>product.specifications?.find(spec=>spec.label===label)?.value??'Not recorded')}));}
