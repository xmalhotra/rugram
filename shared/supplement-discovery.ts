import type { Product } from './mobile';
export type SupplementGoal = {
  id: string;
  title: string;
  summary: string;
  illustration: string;
  topicIds: string[];
};
export type SupplementTopic = {
  id: string;
  title: string;
  summary: string;
  consider: string;
  foodFirst: string;
  sourceUrls: string[];
  productIds: string[];
  flowIds: string[];
  guideId?: string;
};
export type SupplementDiscoveryLibrary = { goals: SupplementGoal[]; topics: SupplementTopic[] };
const nih = 'https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/';
const hydration = 'https://www.ausport.gov.au/ais/nutrition/education-modules/modules/hydration';
export const defaultSupplementDiscovery: SupplementDiscoveryLibrary = {
  goals: [
    {
      id: 'strength',
      title: 'Working out',
      summary: 'Strength & gym sessions',
      illustration: 'workout',
      topicIds: ['protein', 'creatine', 'hydration'],
    },
    {
      id: 'running',
      title: 'Running',
      summary: 'Fuel, hydration & recovery',
      illustration: 'running',
      topicIds: ['endurance', 'hydration', 'protein'],
    },
    {
      id: 'hyrox',
      title: 'HYROX',
      summary: 'Running meets strength',
      illustration: 'hyrox',
      topicIds: ['hydration', 'protein', 'creatine'],
    },
    {
      id: 'recovery',
      title: 'Recovery',
      summary: 'Between your sessions',
      illustration: 'nutrition',
      topicIds: ['protein', 'labels'],
    },
  ],
  topics: [
    {
      id: 'protein',
      title: 'Whey protein',
      summary: 'For recovery, when meals leave a protein gap.',
      consider:
        'A powder can help when food does not cover your protein needs. Enough protein from meals can make a powder unnecessary.',
      foodFirst: 'Meals can cover your protein needs too.',
      sourceUrls: [nih],
      productIds: ['pick-whey-truebasics', 'pick-whey-nakpro', 'pick-whey-on'],
      flowIds: ['nutrition-protein-plant', 'nutrition-protein-dairy', 'nutrition-protein-mixed'],
    },
    {
      id: 'endurance',
      title: 'Endurance & fuelling',
      summary: 'Fuel the session—not a “stamina booster”.',
      consider:
        'Carbohydrate foods and drinks can support longer exercise. Your session length, intensity and tolerance matter; a supplement alone does not build endurance.',
      foodFirst: 'Start with familiar foods and practise your plan in training.',
      sourceUrls: [nih],
      productIds: ['pick-fastup-gel-lemon'],
      flowIds: ['nutrition-pre-running', 'nutrition-intra-running'],
    },
    {
      id: 'creatine',
      title: 'Creatine',
      summary: 'Learn where the evidence fits.',
      consider:
        'Evidence is strongest for repeated high-intensity efforts, including resistance training. That does not make it a default choice for steady endurance running or a proven HYROX race aid.',
      foodFirst:
        'Training, meals and recovery still come first. A goal alone does not establish personal suitability.',
      sourceUrls: [nih],
      productIds: ['pick-creatine-nakpro'],
      flowIds: [],
    },
    {
      id: 'hydration',
      title: 'Hydration & electrolytes',
      summary: 'Start with your session, not a product.',
      consider:
        'Plan fluids before, during and after exercise. The linked drink listings are optional comparisons, not a personalised electrolyte prescription.',
      foodFirst: 'Start with access to water and a practical hydration plan.',
      sourceUrls: [hydration],
      productIds: ['pick-reload-orange-20', 'pick-reload-berry-20'],
      flowIds: [],
    },
    {
      id: 'labels',
      title: 'Understand the label',
      summary: 'Forms, amounts and claims.',
      consider:
        'Learn to read magnesium forms and elemental amounts. This is label education—not a recommendation to take magnesium for recovery or sleep.',
      foodFirst:
        'Review diet and personal needs with a qualified professional before adding supplements.',
      sourceUrls: ['https://ods.od.nih.gov/factsheets/Magnesium-Consumer/'],
      productIds: ['pick-magnesium-wellbeing'],
      flowIds: [],
      guideId: 'magnesium',
    },
  ],
};
export function topicProducts(topic: SupplementTopic, products: Product[], limit = 3) {
  const eligible = new Map(
    products
      .filter(
        product =>
          product.status === 'published' && product.category === 'Supplements' && !product.demo,
      )
      .map(product => [product.id, product]),
  );
  return [...new Set(topic.productIds)]
    .flatMap(id => (eligible.has(id) ? [eligible.get(id)!] : []))
    .slice(0, Math.max(0, Math.min(5, Math.floor(limit) || 0)));
}
