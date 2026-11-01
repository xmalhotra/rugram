import type {Product} from './mobile';

// Editorial starting content. All fields remain editable through the admin catalogue.
// Prices are dated seller snapshots, never a claim of live stock or cheapest price.
const checkedAt='2026-10-15T19:00:00.000Z';
const entries=[
  {id:'pick-whey-truebasics',title:'TrueBasics',variantLabel:'Clean Raw Whey Isolate · Unflavoured',packLabel:'1 kg',price:5299,tier:'Premium',form:'Whey isolate',flavour:'Unflavoured',
    url:'https://www.truebasics.com/sv/truebasics-clean-raw-whey-isolate/SP-139677',
    imageUrl:'https://img2.hkrtcdn.com/44876/prd_4487541-TrueBasics-Clean-Raw-Whey-Isolate-1-kg-Unflavoured_o.jpg',
    why:'An unflavoured isolate option when you don’t want a chocolate shake.',bestFor:'People who prefer an unflavoured whey isolate.',tradeoff:'Higher upfront pack cost. Isolate does not mean lactose-free.',seller:'TrueBasics official store'},
  {id:'pick-whey-nakpro',title:'NAKPRO',variantLabel:'Perform Whey · Chocolate',packLabel:'1 kg',price:2199,tier:'Essential',form:'Whey concentrate & whey powder blend',flavour:'Chocolate',
    url:'https://nakpro.com/products/nakpro-whey-protein-powder-perform?variant=32726926950480',
    imageUrl:'https://nakpro.com/cdn/shop/files/perform_chocolate_1kg.png?v=1775117358&width=1080',
    why:'A lower-cost 1 kg option for someone who prefers a flavoured blend.',bestFor:'A lower upfront spend on a chocolate whey blend.',tradeoff:'Not an isolate. Lower pack price does not establish better quality.',seller:'NAKPRO official store'},
  {id:'pick-whey-on',title:'Optimum Nutrition',variantLabel:'Gold Standard 100% Whey · Double Rich Chocolate',packLabel:'907 g · 2 lb',price:4629,tier:'Premium',form:'Whey isolate, concentrate & hydrolysed whey blend',flavour:'Double Rich Chocolate',
    url:'https://www.optimumnutrition.co.in/products/gold-standard-100-whey-protein-powder-double-rich-chocolate-1118949',
    imageUrl:'https://www.optimumnutrition.co.in/cdn/shop/files/748927065725_1_872e2270-f183-4b16-9679-60f0c2cab58e.jpg?v=1791372160&width=1100',
    why:'A flavoured blend with a clearly listed protein source and pack size.',bestFor:'People comparing a chocolate, isolate-led blend.',tradeoff:'Smaller pack than the other two. Confirm current seller availability.',seller:'Primarc Pecan Retail Private Limited'},
];
export const curatedWheyProducts:Product[]=entries.map((item,index)=>({
  ...item,category:'Supplements',summary:'A convenient way to fill a protein gap; optional when meals already cover your needs.',
  useCases:[],checkedAt,status:'published',createdBy:'admin',endorsements:[],
  safetyNote:'Contains milk. Not suitable for milk allergy; check the full label for other allergens. If under 18, pregnant, taking medicines or managing a health condition, seek qualified advice before use.',
  specifications:[['Protein source',item.form],['Flavour',item.flavour],['Pack size',item.packLabel]].map(([label,value])=>({label,value,sourceUrl:item.url,checkedAt})),
  assessment:{shortlist:{rank:index+1,group:'Whey protein shortlist',comparedWith:entries.filter(other=>other.id!==item.id).map(other=>other.title)},whyChosen:item.why,bestFor:item.bestFor,notFor:'Anyone who already meets their needs from food, or has a milk allergy.',tradeoffs:[item.tradeoff,'Manufacturer listing reviewed; independent batch quality has not been verified.'],criteria:['Protein source','Flavour','Pack size','Listed pack price'],sourceUrls:[item.url],checkedAt},
  purchaseOptions:[{url:item.url,sellerName:item.seller,price:item.price,shippingFee:null,deliveryNote:'Dated listing snapshot. Confirm the selected variant, stock, delivery and final price with the seller.',checkedAt}],
}));
