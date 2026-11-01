// Read-only source research: prints a reviewable snapshot, never writes catalogue records.
const checkedAt=new Date().toISOString();
async function json(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}: ${url}`);return response.json();}
const records=[];
async function boat(collection,subcategory,filter=()=>true){
  const sourceUrl=`https://www.boat-lifestyle.com${collection?'/'+collection:''}`;
  const {products}=await json(`${sourceUrl}/products.json?limit=250`);
  const chosen=products.filter(filter).filter(p=>p.variants.some(v=>v.available&&Number(v.price)>0)).slice(0,10);
  if(chosen.length!==10)throw new Error(`Only ${chosen.length} ${subcategory} products`);
  for(const p of chosen){const v=p.variants.find(v=>v.available&&Number(v.price)>0);records.push({id:`tech-boat-${p.handle}`,title:p.title.split('|')[0].trim(),subcategory,variantLabel:v.title==='Default Title'?'Standard product':v.title,price:Number(v.price),url:`https://www.boat-lifestyle.com/products/${p.handle}?variant=${v.id}`,imageUrl:p.images.find(i=>i.variant_ids?.includes(v.id))?.src??p.images[0]?.src,summary:subcategory==='Headphones'?'Compare comfort, noise control and calling before choosing.':subcategory==='Earbuds'?'Compare in-ear fit, microphone quality and device support.':'Compare room size, portability and connections.',availability:'in-stock',sourceUrl,priceBasis:'Manufacturer-listed variant price',specifications:[{label:'Format',value:subcategory},{label:'Variant',value:v.title==='Default Title'?'Standard product':v.title}],note:'Manufacturer-listed price and stock snapshot, not an independent performance review. Playback, ANC and audio marketing claims are not independently verified.'});}
}
await boat('collections/bluetooth-wireless-headphones','Headphones',p=>!/neckband|kids|rockid/i.test(p.title));
await boat('collections/true-wireless-earbuds','Earbuds',p=>p.product_type==='TWS');
await boat('','Speakers',p=>/stone|partypal/i.test(p.title)&&/speaker/i.test(p.title));

const asusSource='https://www.asus.com/in/store/laptops/';
const html=await(await fetch(asusSource)).text();
const raw=JSON.parse(html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
const urls=[...new Set(raw.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&'ProductURL'in x).map(x=>raw[x.ProductURL]).filter(x=>typeof x==='string'&&x.includes('/laptops/')))];
for(const url of urls){
  if(records.filter(r=>r.subcategory==='Laptops').length===10)break;
  const response=await fetch(url);if(!response.ok)continue;const page=await response.text();
  const schemas=[...page.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return JSON.parse(m[1])}catch{return []}});
  const p=schemas.find(p=>p['@type']==='Product'&&p.offers?.priceCurrency==='INR'&&Number(p.offers.price)>0);
  if(!p)continue;
  records.push({id:`tech-asus-${url.split('/').filter(Boolean).at(-1)}`,title:p.name.replace(/<[^>]+>/g,'').split(';')[0].trim(),subcategory:'Laptops',variantLabel:'Product-family listing · confirm configuration',price:Number(p.offers.price),url,imageUrl:Array.isArray(p.image)?p.image[0]:p.image,summary:'Match your apps, portability and upgrade needs to the exact configuration.',availability:p.offers.availability?.endsWith('/InStock')?'in-stock':'unknown',sourceUrl:url,priceBasis:'Manufacturer product-family offer; configuration must be confirmed',specifications:[{label:'Type',value:'Laptop'},{label:'Configuration',value:'Product-family listing; confirm RAM, storage and processor with ASUS. The listed price is not a quote for every configuration.'}],note:'Price is the INR offer in the official product page structured data. Family-level specifications may describe higher configurations; confirm the exact configuration, current price and availability before buying.'});
}
if(records.filter(r=>r.subcategory==='Laptops').length!==10)throw new Error('Could not verify ten laptop listings');

const tvSource='https://www.vutvs.com/products.json?limit=100';
const {products:tvs}=await json(tvSource);
// Two clearly distinguished screen sizes per family, not colour duplicates.
for(const p of tvs){for(const v of p.variants.filter(v=>Number(v.price)>0).slice(0,2)){
  records.push({id:`tech-vu-${p.handle}-${v.id}`,title:`${p.title} · ${v.title}`,subcategory:'TVs',variantLabel:v.title,price:Number(v.price),url:`https://www.vutvs.com/products/${p.handle}?variant=${v.id}`,imageUrl:p.images.find(i=>i.variant_ids?.includes(v.id))?.src??p.images[0]?.src,summary:'Start with screen size, room distance and the devices you connect.',availability:v.available?'in-stock':'out-of-stock',sourceUrl:tvSource,priceBasis:'Manufacturer-listed screen-size variant price',specifications:[{label:'Screen size',value:v.title},{label:'Family',value:p.title}],note:'Manufacturer catalogue snapshot. Direct-store stock is unavailable for this variant at the recorded check; this is not a promise of dealer inventory. Confirm installation, delivery and warranty separately.'});
}}
if(records.filter(r=>r.subcategory==='TVs').length!==10)throw new Error('Could not verify ten TV variants');
console.log(JSON.stringify({checkedAt,records}));
