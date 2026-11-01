import type { Product } from './mobile';

export const supplementShortlists = [
  {
    id: 'peptides',
    title: 'Collagen peptides',
    comparisonGroup: 'oral-collagen-peptides',
    productIds: [
      'pick-collagen-wellbeing',
      'pick-collagen-healthyhey',
      'pick-collagen-carbamide',
      'pick-collagen-gnc',
      'pick-collagen-chicnutrix',
    ],
  },
  {
    id: 'creatine',
    title: 'Creatine',
    comparisonGroup: 'creatine-monohydrate',
    productIds: [
      'pick-creatine-nakpro',
      'pick-creatine-on',
      'pick-creatine-fastup',
      'pick-creatine-naturaltein',
      'pick-creatine-carbamide',
    ],
  },
  {
    id: 'protein',
    title: 'Whey protein',
    comparisonGroup: 'whey-protein-shortlist',
    productIds: [
      'pick-whey-truebasics',
      'pick-whey-nakpro',
      'pick-whey-on',
      'pick-whey-naturaltein',
      'pick-whey-gnc',
    ],
  },
  {
    id: 'plant-protein',
    title: 'Plant-based protein',
    comparisonGroup: 'plant-protein-shortlist',
    productIds: [
      'pick-plant-nakpro',
      'pick-plant-cosmix',
      'pick-plant-wellbeing',
      'pick-plant-fastup',
      'pick-plant-carbamide',
    ],
  },
];

const names: Record<string, string> = {
  'pick-collagen-wellbeing': 'Wellbeing Nutrition marine collagen',
  'pick-collagen-healthyhey': 'HealthyHey bovine collagen',
  'pick-collagen-carbamide': 'Carbamide Forte hydrolyzed collagen',
  'pick-collagen-gnc': 'GNC marine collagen',
  'pick-collagen-chicnutrix': 'Chicnutrix Mighty Collagen',
  'pick-creatine-nakpro': 'NAKPRO creatine',
  'pick-creatine-on': 'Optimum Nutrition creatine',
  'pick-creatine-fastup': 'Fast&Up creatine',
  'pick-creatine-naturaltein': 'Naturaltein Creapure creatine',
  'pick-creatine-carbamide': 'Carbamide Forte creatine',
  'pick-whey-truebasics': 'TrueBasics whey isolate',
  'pick-whey-nakpro': 'NAKPRO Perform Whey',
  'pick-whey-on': 'Optimum Nutrition Gold Standard Whey',
  'pick-whey-naturaltein': 'Naturaltein whey concentrate',
  'pick-whey-gnc': 'GNC Pro Performance Whey',
  'pick-plant-nakpro': 'NAKPRO plant protein',
  'pick-plant-cosmix': 'Cosmix plant protein',
  'pick-plant-wellbeing': 'Wellbeing Nutrition plant protein',
  'pick-plant-fastup': 'Fast&Up plant protein',
  'pick-plant-carbamide': 'Carbamide Forte plant protein',
};

export function supplementComparisonNames(productIds: string[], currentId: string) {
  return productIds.filter(id => id !== currentId).map(id => names[id] ?? id);
}

/** Attach editorial metadata to the reviewed seed, not to arbitrary admin catalogue edits. */
export function withSupplementShortlist(product: Product): Product {
  const shortlist = supplementShortlists.find(group => group.productIds.includes(product.id));
  if (!shortlist || !product.assessment) return product;
  return {
    ...product,
    comparisonGroup: shortlist.comparisonGroup,
    assessment: {
      ...product.assessment,
      shortlist: {
        rank: shortlist.productIds.indexOf(product.id) + 1,
        group: shortlist.title + ' · editorial shortlist',
        comparedWith: supplementComparisonNames(shortlist.productIds, product.id),
      },
    },
  };
}
