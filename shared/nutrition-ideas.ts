import type { HabitFlow } from './mobile';
import type { VisualFlowCard } from './visual-flow-types';
export type NutritionAtlas = 'nutrition-carbs' | 'nutrition-protein' | 'nutrition-drinks';
export type NutritionIdea = {
  id: string;
  key: string;
  title: string;
  atlas: NutritionAtlas;
  row: number;
  diet: string;
  benefits: { title: string; description: string }[];
  when: string;
  caution: string;
  frames: [string, string, string, string, string];
  sources: NonNullable<HabitFlow['sources']>;
};
export const nutritionIdeas: NutritionIdea[] = [
  {
    id: 'nutrition-item-banana',
    key: 'banana',
    title: 'Banana',
    atlas: 'nutrition-carbs',
    row: 0,
    diet: 'Plant-based',
    benefits: [
      {
        title: 'Carbohydrate option',
        description: 'Provides carbohydrate that can contribute to exercise fuel.',
      },
      {
        title: 'Portable food',
        description: 'Easy to carry without cooking.',
      },
      {
        title: 'Familiar choice',
        description: 'A food option to practise when extra fuel is useful.',
      },
    ],
    when: 'A familiar snack before training, or during a longer session when extra carbohydrate is appropriate.',
    caution:
      'Not every short workout needs a snack. Choose a comfortable portion and timing; check dietary restrictions.',
    frames: [
      'A familiar carbohydrate food',
      'Easy to carry before a session',
      'Choose a comfortable portion',
      'Eat calmly before setting off or during a safe break',
      'Practise timing on ordinary training days',
    ],
    sources: [
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
    ],
  },
  {
    id: 'nutrition-item-toast',
    key: 'toast',
    title: 'Plain toast',
    atlas: 'nutrition-carbs',
    row: 1,
    diet: 'Check bread ingredients',
    benefits: [
      {
        title: 'Carbohydrate food',
        description: 'An everyday bread option for fuelling.',
      },
      {
        title: 'Simple choice',
        description: 'Does not require a specialist sports product.',
      },
      {
        title: 'Flexible timing',
        description: 'Can fit a familiar pre-session meal or snack.',
      },
    ],
    when: 'When bread suits your diet and you want an ordinary carbohydrate-containing food before a session.',
    caution:
      'Bread may contain wheat, gluten or other allergens. Choose the type and timing you tolerate; this is not a prescribed portion.',
    frames: [
      'One familiar slice of toast',
      'Choose bread that fits your diet',
      'A comfortable amount for the time available',
      'Eat before training, without rushing',
      'Keep the choice familiar',
    ],
    sources: [
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
      {
        title: 'NHS: the Eatwell Guide',
        url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
      },
    ],
  },
  {
    id: 'nutrition-item-oats',
    key: 'oats',
    title: 'Oats',
    atlas: 'nutrition-carbs',
    row: 2,
    diet: 'Check oats and any milk',
    benefits: [
      {
        title: 'Carbohydrate base',
        description: 'An everyday cereal option for a meal.',
      },
      {
        title: 'Fibre source',
        description: 'Adds fibre to ordinary eating.',
      },
      {
        title: 'No special product',
        description: 'A familiar alternative to buying workout food.',
      },
    ],
    when: 'As part of a usual meal, with enough time to digest comfortably before activity.',
    caution:
      'Fibre and meal size can feel uncomfortable close to hard exercise. Oats and preparation ingredients must fit allergies and dietary restrictions.',
    frames: [
      'A bowl of familiar cooked oats',
      'An everyday cereal choice',
      'Choose a comfortable portion',
      'Allow digestion time that suits you',
      'Notice comfort before your next session',
    ],
    sources: [
      {
        title: 'NHS: the Eatwell Guide',
        url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
      },
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
    ],
  },
  {
    id: 'nutrition-item-rice',
    key: 'rice',
    title: 'Rice',
    atlas: 'nutrition-carbs',
    row: 3,
    diet: 'Plant-based',
    benefits: [
      {
        title: 'Carbohydrate base',
        description: 'Can contribute carbohydrate before training or to later refuelling.',
      },
      {
        title: 'Meal flexibility',
        description: 'Fits many familiar meals.',
      },
      {
        title: 'Ordinary food',
        description: 'No supplement is required to choose a carbohydrate food.',
      },
    ],
    when: 'As the carbohydrate part of a normal meal before training or afterward, depending on your routine.',
    caution:
      'Rice alone is not a complete recovery meal. Pair with suitable other foods across your meal; follow safe cooked-rice storage and reheating guidance.',
    frames: [
      'A familiar carbohydrate part of a meal',
      'Choose the rice you normally enjoy',
      'A portion that fits your appetite and plan',
      'Eat as part of a suitable meal',
      'Refuelling is about the wider meal, not rice alone',
    ],
    sources: [
      {
        title: 'NHS: the Eatwell Guide',
        url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
      },
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
    ],
  },
  {
    id: 'nutrition-item-dal',
    key: 'dal',
    title: 'Dal / lentils',
    atlas: 'nutrition-protein',
    row: 0,
    diet: 'Plant-based',
    benefits: [
      {
        title: 'Plant protein',
        description: 'Contributes protein to ordinary meals.',
      },
      {
        title: 'Fibre source',
        description: 'Lentils add fibre to your food choices.',
      },
      {
        title: 'Familiar meal option',
        description: 'Can fit everyday eating and a post-training meal.',
      },
    ],
    when: 'A cooked pulse option within your usual meals, including a meal after training.',
    caution:
      'Dal is one part of a meal, not a complete diet or protein target. Fibre can affect gut comfort; account for pulse allergies and individual restrictions.',
    frames: [
      'One familiar pulse food',
      'Cooked dal as a protein option',
      'Choose an amount that suits your meal',
      'Eat with foods that fit the rest of your meal',
      'Keep variety across the day',
    ],
    sources: [
      {
        title: 'NHS: balanced eating and protein foods',
        url: 'https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/',
      },
      {
        title: 'NHS: the Eatwell Guide',
        url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
      },
    ],
  },
  {
    id: 'nutrition-item-tofu',
    key: 'tofu',
    title: 'Tofu',
    atlas: 'nutrition-protein',
    row: 1,
    diet: 'Plant-based · contains soy',
    benefits: [
      {
        title: 'Plant protein',
        description: 'A soy-based protein food.',
      },
      {
        title: 'Dairy-free choice',
        description: 'An alternative when dairy is not part of your diet.',
      },
      {
        title: 'Meal versatility',
        description: 'Can be a protein part of a familiar meal.',
      },
    ],
    when: 'When soy fits your diet and you want a plant-based protein option, including after training.',
    caution:
      "Contains soy. Follow the product's preparation and storage instructions. Calcium content varies; no fixed protein grams or complete-meal claim is assumed.",
    frames: [
      'One soy-based protein food',
      'Choose tofu that suits your diet',
      'Prepared safely according to its label',
      'Use as one part of a meal',
      'Choose variety rather than a compulsory daily item',
    ],
    sources: [
      {
        title: 'British Nutrition Foundation: protein foods',
        url: 'https://www.nutrition.org.uk/nutritional-information/protein/',
      },
      {
        title: 'NHS: balanced eating and protein foods',
        url: 'https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/',
      },
    ],
  },
  {
    id: 'nutrition-item-curd',
    key: 'curd',
    title: 'Plain curd / yoghurt',
    atlas: 'nutrition-protein',
    row: 2,
    diet: 'Contains milk',
    benefits: [
      {
        title: 'Protein food',
        description: 'Dairy yoghurt contributes protein.',
      },
      {
        title: 'Calcium source',
        description: 'Dairy foods can contribute calcium.',
      },
      {
        title: 'Practical snack',
        description: 'Can accompany carbohydrate foods after training when useful.',
      },
    ],
    when: 'When dairy suits you and a familiar chilled food is practical, at mealtime or after a session.',
    caution:
      'Contains milk; lactose tolerance varies. Keep chilled. Plant alternatives differ in protein and fortification, so check their labels rather than assuming equivalence.',
    frames: [
      'One familiar dairy food',
      'Plain curd as a meal or snack option',
      'Choose a comfortable portion',
      'Pair with other foods when your meal needs them',
      'Keep chilled and check suitability',
    ],
    sources: [
      {
        title: 'NHS: balanced eating and protein foods',
        url: 'https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/',
      },
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
    ],
  },
  {
    id: 'nutrition-item-eggs',
    key: 'eggs',
    title: 'Cooked eggs',
    atlas: 'nutrition-protein',
    row: 3,
    diet: 'Contains egg',
    benefits: [
      {
        title: 'Protein food',
        description: 'Eggs contribute protein to a meal.',
      },
      {
        title: 'Everyday option',
        description: 'Can be a familiar choice without a protein powder.',
      },
      {
        title: 'Meal component',
        description: 'Can accompany carbohydrate foods in a post-training meal.',
      },
    ],
    when: 'When eggs are part of your diet and you want an ordinary protein food.',
    caution:
      'Contains egg. Follow safe cooking and storage guidance. Eggs alone are not a complete recovery meal or a personalised protein prescription.',
    frames: [
      'A familiar protein food',
      'Use safely cooked eggs',
      'Choose a portion that fits your meal',
      'Eat with other suitable foods',
      'Not a complete recovery meal by itself',
    ],
    sources: [
      {
        title: 'NHS: balanced eating and protein foods',
        url: 'https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/',
      },
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
    ],
  },
  {
    id: 'nutrition-item-water',
    key: 'water',
    title: 'Water',
    atlas: 'nutrition-drinks',
    row: 0,
    diet: 'No mandatory volume',
    benefits: [
      {
        title: 'Fluid access',
        description: 'Makes a simple drink available.',
      },
      {
        title: 'Ordinary hydration',
        description: 'Often enough for short, easy sessions.',
      },
      {
        title: 'No added product',
        description: 'Does not require an electrolyte or sports-fuel purchase.',
      },
    ],
    when: 'An everyday drink and a practical default for many short or easy sessions.',
    caution:
      'Do not force large volumes or use a universal drinking target. Heat, duration, sweat losses and medical fluid restrictions matter.',
    frames: [
      'Make water accessible',
      'Keep the bottle easy to use',
      'Choose a safe drink break',
      'Drink comfortably, not to a forced target',
      'Keep access in mind for the next session',
    ],
    sources: [
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
      {
        title: 'AIS: electrolyte supplements and their limits',
        url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/electrolyte-supplement2',
      },
    ],
  },
  {
    id: 'nutrition-item-electrolytes',
    key: 'electrolytes',
    title: 'Electrolyte drink',
    atlas: 'nutrition-drinks',
    row: 1,
    diet: 'Context-specific · optional',
    benefits: [
      {
        title: 'Electrolyte replacement',
        description: 'May fit a plan for particular sweat or fluid losses.',
      },
      {
        title: 'Known composition',
        description: 'A label helps distinguish what is actually supplied.',
      },
      {
        title: 'Not automatic fuel',
        description: 'Electrolyte-only products may supply little carbohydrate.',
      },
    ],
    when: 'When an individual session or recovery plan justifies electrolyte replacement, rather than as a daily default.',
    caution:
      'Not necessary for everyone. Respect sodium/fluid restrictions; follow the label and individual advice. Electrolytes are not the same thing as carbohydrate fuel.',
    frames: [
      'An optional drink for a specific situation',
      'Check the actual label and suitability',
      'Use within an appropriate hydration plan',
      'A comfortable drink break',
      'Do not assume this also supplies workout fuel',
    ],
    sources: [
      {
        title: 'AIS: electrolyte supplements and their limits',
        url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/electrolyte-supplement2',
      },
      {
        title: 'AIS: sports foods for specific situations',
        url: 'https://www.ais.gov.au/nutrition/supplements/group_a',
      },
    ],
  },
  {
    id: 'nutrition-item-sports-drink',
    key: 'sports-drink',
    title: 'Carbohydrate sports drink',
    atlas: 'nutrition-drinks',
    row: 2,
    diet: 'Longer / demanding sessions · optional',
    benefits: [
      {
        title: 'Carbohydrate fuel',
        description: 'Can supply carbohydrate during appropriate exercise.',
      },
      {
        title: 'Fluid source',
        description: 'Provides fluid as part of a session plan.',
      },
      {
        title: 'Convenience',
        description: 'May be practical when ordinary food is inconvenient.',
      },
    ],
    when: 'During prolonged or demanding exercise when carbohydrate and fluid intake are appropriate to your plan.',
    caution:
      'Usually unnecessary for short, easy activity. Check ingredients and tolerance, including caffeine if present. A sports drink is not an energy-drink or medical treatment.',
    frames: [
      'One optional source of carbohydrate and fluid',
      'Check the drink rather than relying on its name',
      'Plan access for the actual session',
      'Practise a comfortable drink break',
      'Keep amounts individual, not compulsory',
    ],
    sources: [
      {
        title: 'Victoria Department of Health: food before, during and after exercise',
        url: 'https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/',
      },
      {
        title: 'AIS: sports foods for specific situations',
        url: 'https://www.ais.gov.au/nutrition/supplements/group_a',
      },
    ],
  },
  {
    id: 'nutrition-item-gel',
    key: 'gel',
    title: 'Carbohydrate gel',
    atlas: 'nutrition-drinks',
    row: 3,
    diet: 'Longer / demanding sessions · optional',
    benefits: [
      {
        title: 'Portable carbohydrate',
        description: 'A compact option for appropriate exercise fuelling.',
      },
      {
        title: 'Convenient format',
        description: 'May fit when ordinary food is impractical.',
      },
      {
        title: 'Planned use',
        description: 'Can be practised during training, not first tried on race day.',
      },
    ],
    when: 'For longer or demanding sessions where a specific carbohydrate plan is useful.',
    caution:
      'Not a requirement for routine workouts. Follow the label on water and serving use, check caffeine and tolerance, and do not replace normal meals or assume all gels are identical.',
    frames: [
      'One compact carbohydrate option',
      'Check the actual pouch and ingredients',
      'Use only when the session plan calls for it',
      'Follow its directions on water',
      'Practise tolerance and dispose of the pouch',
    ],
    sources: [
      {
        title: 'AIS: carbohydrate sports gels',
        url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/sports-gels/what-is-it',
      },
      {
        title: 'AIS: sports foods for specific situations',
        url: 'https://www.ais.gov.au/nutrition/supplements/group_a',
      },
    ],
  },
];
export const nutritionCollectionSpecs = [
  {
    category: 'protein',
    id: 'nutrition-protein-ideas',
    title: 'Everyday protein',
    description:
      'Choose a protein food that fits your usual meals. These are alternatives, not a list to eat every day.',
    items: ['dal', 'tofu', 'curd', 'eggs'],
  },
  {
    category: 'hydration',
    id: 'nutrition-hydration-ideas',
    title: 'Hydration & electrolytes',
    description:
      'Water first for many ordinary sessions. Compare other drinks only when the session and your individual needs justify them.',
    items: ['water', 'electrolytes', 'sports-drink'],
  },
  {
    category: 'pre',
    id: 'nutrition-pre-ideas',
    title: 'Pre-workout',
    description:
      'Choose a familiar food or drink idea before training, based on meal timing, the actual session and what feels comfortable.',
    items: ['banana', 'toast', 'oats', 'rice', 'water'],
  },
  {
    category: 'intra',
    id: 'nutrition-intra-ideas',
    title: 'Intra-workout',
    description:
      'Explore drink and carbohydrate options during exercise when needed. Short, easy sessions do not automatically need additional fuel or electrolytes.',
    items: ['water', 'banana', 'sports-drink', 'gel'],
  },
  {
    category: 'post',
    id: 'nutrition-post-ideas',
    title: 'Post-workout',
    description:
      'Build your next familiar meal from suitable protein foods, carbohydrate foods and fluids. The cards are components and alternatives, not a compulsory stack.',
    items: ['dal', 'tofu', 'curd', 'eggs', 'rice', 'water'],
  },
];
export const nutritionCollectionIds = nutritionCollectionSpecs.map(item => item.id);
export const nutritionIdea = (id: string) => nutritionIdeas.find(item => item.id === id);
export const nutritionIdeaMedia = Object.fromEntries(
  nutritionIdeas.map(item => [item.id, { atlas: item.atlas, row: item.row }]),
);
export const nutritionCollectionChildren: Record<string, string[]> = Object.fromEntries(
  nutritionCollectionSpecs.map(item => [item.id, item.items.map(key => 'nutrition-item-' + key)]),
);
const guidance =
  'General education, not a personalised diet or supplement prescription. Choose suitable alternatives, not every card. Check allergies, dietary and medical restrictions, food hygiene, comfort and recovery. Quantities and timing are individual; no recipe, mandatory intake or universal workout-fuel target is prescribed.';
const steps = [
  {
    id: 'choose',
    title: 'Choose an idea that fits',
    cue: 'Pick a suitable food or drink for the actual session and your usual diet.',
    duration: 'At a suitable time',
  },
  {
    id: 'use',
    title: 'Use it when appropriate',
    cue: 'Fit it around your existing meal or session without forcing intake.',
    duration: 'A food or drink choice',
  },
  {
    id: 'review',
    title: 'Notice comfort and practicality',
    cue: 'Keep useful choices and adapt what does not suit you.',
    duration: 'Afterward',
  },
];
export const nutritionIdeaCards: HabitFlow[] = nutritionIdeas.map(item => ({
  id: item.id,
  title: item.title,
  area: 'Wellbeing',
  pathId: 'nutrition',
  goal: 'Nutrition idea',
  description: item.when,
  level: 'Food and drink ideas',
  rhythm: 'When this idea fits',
  milestone: 'Find a suitable repeatable food or drink option.',
  review: 'Was it comfortable, suitable and practical?',
  guidance,
  sources: item.sources,
  steps: steps.map(step => ({ ...step })),
  sessionGuide: {
    collection: 'Nutrition',
    label: item.diet,
    format: 'One food or drink idea',
    equipment: 'No special equipment required',
    reviewedOn: '2026-10-25',
    cards: [
      {
        id: 'idea',
        title: item.title,
        metric: 'One food or drink idea',
        body: item.when,
        illustration: 'workout',
      },
    ],
  },
}));
export const nutritionCollections: HabitFlow[] = nutritionCollectionSpecs.map(item => ({
  id: item.id,
  title: item.title,
  area: 'Wellbeing',
  pathId: 'nutrition',
  goal: item.title,
  description: item.description,
  level: 'Food choices, not recipes',
  rhythm: 'Choose what fits your meals and training',
  milestone: 'Find suitable ideas without treating all cards as a daily target.',
  review: 'Which choices fit your routine and recovery?',
  guidance,
  sources: [
    ...new Map(
      nutritionIdeas
        .filter(idea => item.items.includes(idea.key))
        .flatMap(idea => idea.sources)
        .map(source => [source.url, source]),
    ).values(),
  ],
  steps: steps.map(step => ({ ...step })),
  relatedFlowIds: nutritionCollectionChildren[item.id],
  sessionGuide: {
    collection: 'Nutrition',
    label: item.title,
    format: item.items.length + ' food & drink ideas',
    equipment: 'Familiar foods · optional sports foods only where appropriate',
    reviewedOn: '2026-10-25',
    cards: [
      {
        id: 'ideas',
        title: item.title,
        metric: 'Food choices, not recipes',
        body: item.description,
        illustration: 'workout',
      },
    ],
  },
}));
export function nutritionCollectionForId(id: string) {
  const current = nutritionCollections.find(item => item.id === id);
  if (current) return current;
  const match =
    /^nutrition-(protein-(?:plant|dairy|mixed)|hydration-(?:everyday|running|gym|hyrox)|(?:pre|intra|post)-(?:running|gym|hyrox))$/.exec(
      id,
    );
  if (match)
    return nutritionCollections.find(
      item => item.id === 'nutrition-' + id.split('-')[1] + '-ideas',
    );
  if (
    [
      'wellbeing-nutrition-start',
      'recipe-chickpea-bowl',
      'recipe-curd-chickpea-bowl',
      'recipe-egg-chickpea-bowl',
    ].includes(id)
  )
    return nutritionCollections[0];
  return undefined;
}
export function withNutritionIdeaVisual(flow: HabitFlow, sourceFlowId?: string): HabitFlow {
  const item = nutritionIdea(flow.id);
  if (!item) return flow;
  const source =
    sourceFlowId ??
    nutritionCollectionSpecs.find(collection => collection.items.includes(item.key))!.id;
  const visualCard: VisualFlowCard = {
    media: { atlas: item.atlas, row: item.row },
    frames: item.frames,
    benefits: item.benefits,
    sourceFlowId: source,
    sourceStepIds: ['use'],
    illustration: 'habit',
  };
  return { ...flow, visualCard };
}
