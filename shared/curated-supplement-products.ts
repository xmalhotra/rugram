import type { Product } from './mobile';
import { supplementComparisonNames, supplementShortlists } from './supplement-shortlists';

// Source-linked seller snapshots. Price is the selected pack price, not a per-dose comparison.
// Editorial ordering compares label clarity, formula choice and pack options; no lab quality score.
const entries = [
  {
    id: 'pick-collagen-wellbeing',
    title: 'Wellbeing Nutrition',
    variantLabel: 'Marine collagen · Unflavoured',
    packLabel: '200 g',
    form: 'Marine collagen peptides',
    why: 'An unflavoured marine-collagen option with a clearly identified fish source.',
    notFor:
      'Fish allergy or a vegan diet. Collagen is not a replacement for a varied protein intake.',
    price: 1745,
    url: 'https://wellbeingnutrition.com/products/korean-marine-collagen-peptides?variant=40790287614032',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0240/2942/9840/files/MARINE_P-1.jpg?v=1754640121',
    checkedAt: '2026-10-24T02:47:16.922Z',
  },
  {
    id: 'pick-collagen-healthyhey',
    title: 'HealthyHey',
    variantLabel: 'Bovine collagen blend · Orange',
    packLabel: '200 g',
    form: 'Bovine collagen peptides with added nutrients',
    why: 'A clearly labelled bovine-source alternative, separated from marine collagen options.',
    notFor: 'A vegetarian or vegan diet, or a preference to avoid bovine-derived ingredients.',
    price: 599,
    url: 'https://healthyhey.com/products/collagen-for-skin?variant=44641507279133',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/2181/1153/files/healthyhey-nutrition-powder-orange-skin-glow-n-shine-collagen-powder-200g-hydrolysed-collagen-for-women-and-men-with-hyaluronic-acid-biotin-and-vitamin-c-for-healthy-skin-hair-and-nails-1246841740.png?v=1791304840',
    checkedAt: '2026-10-24T02:47:16.929Z',
  },
  {
    id: 'pick-collagen-carbamide',
    title: 'Carbamide Forte',
    variantLabel: 'Hydrolyzed collagen · Unflavoured',
    packLabel: '200 g',
    form: 'Hydrolyzed Type I & III collagen',
    why: 'An unflavoured collagen listing for comparing source information and pack cost.',
    notFor:
      'Anyone whose dietary restrictions do not match the animal source; confirm the source on the full seller label.',
    price: 695,
    url: 'https://mycf.in/products/carbamide-forte-hydrolyzed-collagen-powder-with-type-1-3-collagen-peptides-unflavored-200g?variant=42703490121841',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0062/3345/6753/files/B09GG1JBSL.MAIN.jpg_3.jpg?v=1784185487',
    checkedAt: '2026-10-24T02:47:16.969Z',
  },
  {
    id: 'pick-collagen-gnc',
    title: 'GNC',
    variantLabel: 'Marine collagen · Orange',
    packLabel: '200 g',
    form: 'Marine collagen peptides with added nutrients',
    why: 'A flavoured marine-collagen option with the selected pack size identified.',
    notFor:
      'Fish allergy or a vegan diet; review the added nutrients before combining supplements.',
    price: 1748,
    url: 'https://www.guardian.in/products/gnc-marine-collagen-hydrolyzed-peptides-sb?variant=52527434891495',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0623/9010/8391/files/200gms.png?v=1736760951',
    checkedAt: '2026-10-24T02:47:16.886Z',
  },
  {
    id: 'pick-collagen-chicnutrix',
    title: 'Chicnutrix Mighty Collagen',
    variantLabel: 'Marine collagen · Mango',
    packLabel: '25 servings',
    form: 'Marine collagen with astaxanthin',
    why: 'A marine-collagen blend sold through Fast&Up, with a separate added-ingredient profile.',
    notFor: 'Fish allergy or a vegan diet; the blend is not equivalent to plain collagen powder.',
    price: 1350,
    url: 'https://in.fastandup.com/products/mighty-collagen-marine-collagen-supplement-for-youthful-skin-mango?variant=48958710251595',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0574/6035/9243/files/1-FOR-WEBSITE.jpg?v=1790588008',
    checkedAt: '2026-10-24T02:47:16.901Z',
  },
  {
    id: 'pick-plant-nakpro',
    title: 'NAKPRO',
    variantLabel: 'Pea & brown rice blend · Chocolate',
    packLabel: '1 kg',
    form: 'Pea and brown rice protein',
    why: 'A two-source plant-protein blend with a listed 1 kg purchase option.',
    notFor:
      'Anyone who already meets their needs from food or cannot tolerate the listed ingredients.',
    price: 1399,
    url: 'https://nakpro.com/products/nakpro-plant-protein-powder?variant=40031814647888',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0237/4497/0832/files/01_chocolate_1kg.jpg?v=1776752615',
    checkedAt: '2026-10-24T02:47:16.888Z',
  },
  {
    id: 'pick-plant-cosmix',
    title: 'Cosmix',
    variantLabel: 'No-Nonsense Plant Protein · Unflavoured',
    packLabel: '1 kg',
    form: 'Pea and rice protein with herbs',
    why: 'An unflavoured pea-and-rice option for people who prefer not to add a shake flavour.',
    notFor: 'Anyone needing to avoid ingredients in the added herb blend; check the full label.',
    price: 1650.6,
    url: 'https://cosmix.in/products/no-nonsense-plant-protein-classic-unflavoured?variant=42818404253789',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0281/7507/3373/files/1KGCUCatalogueCover.jpg?v=1735187739',
    checkedAt: '2026-10-24T02:47:16.968Z',
  },
  {
    id: 'pick-plant-wellbeing',
    title: 'Wellbeing Nutrition',
    variantLabel: 'Plant Protein · French Vanilla Caramel',
    packLabel: '500 g',
    form: 'Plant protein blend with probiotics',
    why: 'A smaller flavoured plant-protein pack with added ingredients disclosed by the seller.',
    notFor:
      'Anyone seeking a plain single-ingredient protein or needing to avoid the listed allergens.',
    price: 1709,
    url: 'https://wellbeingnutrition.com/products/vegan-protein-french-vanilla-caramel?variant=40945671635024',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0240/2942/9840/files/Vegan_Protein_22g_500g_3B_CFU_Probiotics_French_Vanilla_Caramel.jpg?v=1752045736',
    checkedAt: '2026-10-24T02:47:16.876Z',
  },
  {
    id: 'pick-plant-fastup',
    title: 'Fast&Up',
    variantLabel: 'Plant Protein · Cookies & Cream',
    packLabel: '500 g',
    form: 'Pea and brown rice protein blend',
    why: 'A smaller flavoured pack for comparing a pea-and-rice formula before buying a larger bag.',
    notFor: 'Anyone seeking an unflavoured powder or unable to tolerate its listed ingredients.',
    price: 1439,
    url: 'https://in.fastandup.com/products/plant-protein-cookies-cream-500g?variant=42789921980491',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0574/6035/9243/files/PlantProtein-Cookies_Cream-500g.webp?v=1792573071',
    checkedAt: '2026-10-24T02:47:16.899Z',
  },
  {
    id: 'pick-plant-carbamide',
    title: 'Carbamide Forte',
    variantLabel: 'Plant Protein · Belgian Chocolate',
    packLabel: '1 kg',
    form: 'Pea and brown rice protein blend',
    why: 'A listed 1 kg plant-protein blend to compare against the smaller packs.',
    notFor:
      'Anyone who does not need a powder or whose requirements do not match the full formula.',
    price: 1695,
    url: 'https://mycf.in/products/carbamide-forte-vegan-protein-powder-1kg?variant=42468631347313',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0062/3345/6753/files/chocolate_1_kg.jpg?v=1791284678',
    checkedAt: '2026-10-24T02:47:16.895Z',
  },
  {
    id: 'pick-creatine-on',
    title: 'Optimum Nutrition',
    variantLabel: 'Micronised Creatine · Unflavoured',
    packLabel: '250 g',
    form: 'Creatine monohydrate',
    why: 'An unflavoured monohydrate option with an exact 250 g purchase listing.',
    notFor:
      'Anyone for whom creatine is unsuitable; a workout goal alone does not establish personal need.',
    price: 799,
    url: 'https://www.optimumnutrition.co.in/products/micronized-creatine-powder-unflavoured-1118952?variant=46438071173346',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0738/8649/9042/files/748927066623_1.jpg?v=1773302233',
    checkedAt: '2026-10-24T02:47:16.905Z',
  },
  {
    id: 'pick-creatine-fastup',
    title: 'Fast&Up',
    variantLabel: 'Creatine Monohydrate Essentials · Unflavoured',
    packLabel: '100 g',
    form: 'Creatine monohydrate',
    why: 'A smaller unflavoured monohydrate pack for comparing upfront pack cost.',
    notFor:
      'Anyone needing medical advice before creatine use; do not infer improved endurance from the listing.',
    price: 565.25,
    url: 'https://in.fastandup.com/products/creatine-monohydrate-essentials?variant=41041410981963',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0574/6035/9243/files/creatine-mono-100gm-unflavoured.jpg?v=1791546642',
    checkedAt: '2026-10-24T02:47:16.887Z',
  },
  {
    id: 'pick-creatine-naturaltein',
    title: 'Naturaltein',
    variantLabel: 'Creapure Creatine Monohydrate · Single box',
    packLabel: '1 box',
    form: 'Creatine monohydrate; seller-labelled Creapure',
    why: 'A source-traceability-labelled monohydrate alternative. Confirm the seal and net weight with the seller.',
    notFor:
      'Anyone seeking a personal treatment or dosing recommendation. The brand label is not our batch verification.',
    price: 1390,
    url: 'https://naturaltein.in/products/creatine?variant=42576158425171',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0634/8868/8211/files/Creapure_Creatine_Monohydrate_box_1.webp?v=1779861652',
    checkedAt: '2026-10-24T02:47:16.917Z',
  },
  {
    id: 'pick-creatine-carbamide',
    title: 'Carbamide Forte',
    variantLabel: 'Creatine Monohydrate · Unflavoured',
    packLabel: '250 g',
    form: 'Creatine monohydrate',
    why: 'An unflavoured 250 g pack for ingredient and listed-cost comparison.',
    notFor:
      'Anyone for whom creatine is unsuitable; check the full label and personal circumstances.',
    price: 474,
    url: 'https://mycf.in/products/carbamide-forte-micronised-creatine-monohydrate-powder-creatine-supplement-for-lean-muscle-volumization-strength-energy-unflavoured-83-servings-250g?variant=42702750613617',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0062/3345/6753/files/B0CHM882RH_MAIN_jpg.jpg?v=1758024227',
    checkedAt: '2026-10-24T02:47:16.905Z',
  },
  {
    id: 'pick-whey-naturaltein',
    title: 'Naturaltein',
    variantLabel: 'Whey Protein Concentrate · Chocolate',
    packLabel: '1 kg',
    form: 'Whey protein concentrate',
    why: 'A concentrate option with a clearly specified chocolate 1 kg variant.',
    notFor: 'Milk allergy, a vegan diet, or anyone who already meets their needs from food.',
    price: 4199,
    url: 'https://naturaltein.in/products/whey-protein-concentrate?variant=42639852634195',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0634/8868/8211/files/Cons___biscoff_1.webp?v=1759512043',
    checkedAt: '2026-10-24T02:47:16.914Z',
  },
  {
    id: 'pick-whey-gnc',
    title: 'GNC',
    variantLabel: 'Pro Performance 100% Whey · Chocolate Supreme',
    packLabel: '1 kg',
    form: 'Whey protein blend',
    why: 'A separately listed 1 kg chocolate whey option for comparing formula and pack cost.',
    notFor: 'Milk allergy, a vegan diet, or anyone whose requirements do not match the full label.',
    price: 4132,
    url: 'https://www.guardian.in/products/pp-100-whey-chocolate-supreme-improved-1kg?variant=52433299079399',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0623/9010/8391/files/1_68538c11-50b1-4a8b-9327-7e8724b50dc6.jpg?v=1785830862',
    checkedAt: '2026-10-24T02:47:16.914Z',
  },
];

export const curatedSupplementProducts: Product[] = entries.map(entry => {
  const shortlist = supplementShortlists.find(group => group.productIds.includes(entry.id))!;
  const collagen = shortlist.id === 'peptides';
  return {
    id: entry.id,
    title: entry.title,
    category: 'Supplements',
    status: 'published',
    comparisonGroup: shortlist.comparisonGroup,
    createdBy: 'admin',
    endorsements: [],
    variantLabel: entry.variantLabel,
    packLabel: entry.packLabel,
    price: entry.price,
    tier: entry.price < 1000 ? 'Essential' : entry.price < 3000 ? 'Upgrade' : 'Premium',
    url: entry.url,
    imageUrl: entry.imageUrl,
    checkedAt: entry.checkedAt,
    summary: entry.why,
    safetyNote: collagen
      ? 'Oral collagen nutrition product, not an injectable or research peptide. Check the animal source, fish and other allergens. Optional purchase; no skin, joint or recovery outcome is guaranteed. Seek qualified advice if under 18, pregnant, breastfeeding, taking medicines or managing a condition.'
      : 'Optional supplement, not personalised medical or dosing advice. Check the full ingredient and allergen label. Seek qualified advice if under 18, pregnant, breastfeeding, taking medicines or managing a health condition.',
    specifications: [
      ['Listed formula', entry.form],
      ['Selected variant', entry.variantLabel],
      ['Pack', entry.packLabel],
    ].map(([label, value]) => ({ label, value, sourceUrl: entry.url, checkedAt: entry.checkedAt })),
    assessment: {
      shortlist: {
        rank: shortlist.productIds.indexOf(entry.id) + 1,
        group: shortlist.title + ' · editorial shortlist',
        comparedWith: supplementComparisonNames(shortlist.productIds, entry.id),
      },
      whyChosen: entry.why,
      bestFor: 'Comparing the stated formula, selected variant and upfront pack cost.',
      notFor: entry.notFor,
      criteria: [
        'Declared ingredient source',
        'Formula and flavour choice',
        'Pack options and listed price',
        'Public manufacturer listing',
      ],
      tradeoffs: [
        'Manufacturer listing reviewed; we have not independently tested this batch or established superiority.',
        'Pack sizes and formulas differ. Pack prices are not dose-normalised value rankings.',
      ],
      sourceUrls: [entry.url],
      checkedAt: entry.checkedAt,
    },
    purchaseOptions: [
      {
        url: entry.url,
        sellerName: new URL(entry.url).hostname.replace(/^www\./, ''),
        price: entry.price,
        shippingFee: null,
        availability: 'unknown',
        deliveryNote:
          'Dated manufacturer snapshot. Stock indicators can conflict; verify the exact variant, availability, label, delivery and final price with the seller.',
        checkedAt: entry.checkedAt,
      },
    ],
  };
});
