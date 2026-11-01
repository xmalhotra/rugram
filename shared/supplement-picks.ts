import { type SupplementDiscoveryLibrary, type SupplementTopic } from './supplement-discovery';
import type { Product } from './mobile';
import { pickShortlist } from './pick-comparison';
import { supplementShortlists } from './supplement-shortlists';

const additionalTopics: SupplementTopic[] = [
  {
    id: 'peptides',
    title: 'Collagen peptides',
    summary: 'Oral collagen nutrition products',
    consider:
      'This category covers oral collagen peptide nutrition products only, not injectable or research peptides. Collagen is optional; an editorial position is not evidence that you need it or that it will improve skin, joints or exercise recovery.',
    foodFirst:
      'Check the animal source and fish or other allergens. Collagen does not replace varied dietary protein. Follow the product label and seek qualified advice where appropriate.',
    sourceUrls: [
      'https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks',
    ],
    productIds: [],
    flowIds: [],
  },
  {
    id: 'plant-protein',
    title: 'Plant-based protein',
    summary: 'Dairy-free protein options',
    consider:
      'Whey comes from milk. Plant-based protein powders use ingredients such as soy, pea or rice. A powder is optional when meals already meet your needs.',
    foodFirst:
      'Compare ingredients, allergens and protein content, rather than assuming plant-based means suitable for everyone.',
    sourceUrls: ['https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/'],
    productIds: [],
    flowIds: [],
  },
];

/** Keep the editor’s product selections; never infer eligibility from a product name. */
export function supplementPickCategories(library: SupplementDiscoveryLibrary): SupplementTopic[] {
  const topics = new Map(library.topics.map(topic => [topic.id, topic]));
  for (const topic of additionalTopics) if (!topics.has(topic.id)) topics.set(topic.id, topic);
  for (const shortlist of supplementShortlists) {
    const topic = topics.get(shortlist.id);
    if (!topic) continue;
    // Expand untouched legacy seed selections, but preserve editor-created lists and explicit empty lists.
    const legacy =
      shortlist.id === 'protein'
        ? ['pick-whey-truebasics', 'pick-whey-nakpro', 'pick-whey-on']
        : shortlist.id === 'creatine'
          ? ['pick-creatine-nakpro']
          : [];
    const builtin = !library.topics.some(item => item.id === shortlist.id);
    if (
      builtin ||
      (legacy.length > 0 && JSON.stringify(topic.productIds) === JSON.stringify(legacy))
    ) {
      topics.set(topic.id, {
        ...topic,
        title: shortlist.title,
        productIds: [...shortlist.productIds],
      });
    }
  }
  return [
    ...new Set(['peptides', 'creatine', 'protein', 'plant-protein', ...topics.keys()]),
  ].flatMap(id => (topics.has(id) ? [topics.get(id)!] : []));
}

export const supplementOrderNote =
  'Gold, Silver and Bronze identify the recorded editorial shortlist ranks. Other numbers are catalogue positions only. Neither is an independent quality award, lab-test result, medical ranking or personalised recommendation. Unavailable products are omitted without changing recorded ranks.';

export function supplementPosition(index: number) {
  return { number: index + 1, medal: ['Gold', 'Silver', 'Bronze'][index] as string | undefined };
}

export function supplementProductPosition(product: Product, index: number) {
  const shortlist = pickShortlist(product);
  return shortlist
    ? { ...supplementPosition(shortlist.rank - 1), ranked: true }
    : { number: index + 1, medal: undefined, ranked: false };
}
