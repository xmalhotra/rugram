import type { HabitFlow } from './mobile';

const framework = {
  title: 'AIS: assessing supplement use',
  url: 'https://www.ais.gov.au/nutrition/supplements',
};
const exercise = {
  title: 'NIH ODS: exercise and athletic performance',
  url: 'https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/',
};
const creatine = {
  title: 'AIS: creatine and training context',
  url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/performance-supplements2/creatine',
};
const caffeine = {
  title: 'FDA: caffeine sensitivity and safety',
  url: 'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much',
};
const fuel = {
  title: 'AIS: carbohydrate sports foods',
  url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/sports-gels',
};
const sportsFoods = {
  title: 'AIS: sports foods and context-specific use',
  url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a',
};
const iron = {
  title: 'NIH ODS: iron and the risks of excess',
  url: 'https://ods.od.nih.gov/factsheets/Iron-Consumer/',
};
const vitaminD = {
  title: 'NIH ODS: vitamin D and safety',
  url: 'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/',
};
const quality = {
  title: 'USADA: supplement risk and third-party certification',
  url: 'https://www.usada.org/substances/supplement-connect/',
};

export const trainingSupplementTopics = [
  {
    id: 'food',
    title: 'Start with food',
    status: 'No supplement may be needed',
    summary: 'Your workout label alone does not establish a supplement need.',
    consider:
      'Review your normal meals, training, sleep and recovery before looking for a product. A sports dietitian can assess a real gap. A beginner does not need to start a stack to make training count.',
    caution:
      'This guide is education, not a test that determines what you personally need. Do not replace adequate meals, training or medical care with supplements.',
    question:
      'What specific problem am I trying to solve, and could ordinary food or a training change solve it?',
    sources: [framework],
  },
  {
    id: 'protein',
    title: 'Protein',
    status: 'Consider only for a food gap',
    summary: 'A powder is optional when meals already cover your protein needs.',
    consider:
      'Protein supports muscle maintenance and repair. A convenient powder may help when suitable meals do not cover needs; whey is not the only option. Review your full diet rather than adding shakes automatically after every session.',
    caution:
      'Check milk, soy and other allergens and your overall intake. Get individual advice if you have kidney disease, dietary restrictions or prescribed nutrition. This card does not calculate a protein target or serving.',
    question: 'Do I have a genuine protein gap, and which food or convenient option fits my diet?',
    sources: [exercise],
  },
  {
    id: 'creatine',
    title: 'Creatine monohydrate',
    status: 'Optional · training-specific evidence',
    summary:
      'Most relevant to repeated high-intensity or strength work—not an automatic race supplement.',
    consider:
      'Creatine monohydrate has evidence for supporting brief, repeated high-intensity exercise and resistance training. This does not establish that you need it, or prove a benefit for steady running or a HYROX finish time.',
    caution:
      'Body-mass changes may matter in weight-bearing sport. Discuss suitability with a qualified professional, particularly with kidney disease, medicines or pregnancy. No loading plan or dose is prescribed here.',
    question:
      'Does the evidence match my training, and have suitability and body-mass trade-offs been reviewed?',
    sources: [creatine],
  },
  {
    id: 'caffeine',
    title: 'Caffeine',
    status: 'Optional · sensitivity matters',
    summary: 'More stimulation is not a better plan; consider sleep and all caffeine sources.',
    consider:
      'Caffeine may suit some exercise situations, but is not required. Coffee, tea, gels and pre-workouts can all contribute. The amount in a product or cup varies, and individual sensitivity matters.',
    caution:
      'Avoid stacking stimulants or using pure concentrated caffeine. Sleep disruption, anxiety and palpitations are reasons to reconsider. Pregnancy, breastfeeding, some conditions and medicines need professional advice. No stimulant dose is suggested.',
    question: 'Do I tolerate caffeine, what else am I taking, and will this affect my sleep?',
    sources: [caffeine],
  },
  {
    id: 'carbohydrate',
    title: 'Endurance fuel',
    status: 'Sports food · session-dependent',
    summary: 'Longer or demanding sessions may need a fuelling plan—not a “stamina booster”.',
    consider:
      'Carbohydrate foods, drinks or gels can be practical during appropriate prolonged exercise. Session length, intensity, food access and stomach tolerance determine the context. Familiar food may work; gels are a convenience, not a requirement.',
    caution:
      'Practise a suitable plan in training rather than introducing a new gel at a race. Some products contain caffeine too. Carbohydrate fuel and low-sugar electrolyte products do different jobs; this guide sets no intake target.',
    question:
      'Is this session long or demanding enough to need planned fuel, and what can I tolerate?',
    sources: [fuel],
  },
  {
    id: 'hydration',
    title: 'Hydration & electrolytes',
    status: 'Water first · context-dependent',
    summary: 'Electrolytes depend on duration, heat and sweat losses—not just the word “workout”.',
    consider:
      'Start with access to water. Longer sessions, hot conditions or substantial sweat losses can make an individual fluid and electrolyte plan relevant. Sports drinks can also provide carbohydrate; not every electrolyte product supplies fuel.',
    caution:
      'Do not force fluids or add salt just to follow this guide. Kidney or heart conditions, medicines and fluid or sodium restrictions require medical advice. No sweat-rate diagnosis, sodium target or drinking volume is calculated.',
    question:
      'What are the actual conditions and drink opportunities, and do I have fluid or salt restrictions?',
    sources: [sportsFoods],
  },
  {
    id: 'clinical',
    title: 'Vitamins & minerals',
    status: 'Clinical review when indicated',
    summary: 'A workout type cannot diagnose low iron, vitamin D or another deficiency.',
    consider:
      'Food intake, risk factors, medical history and clinical assessment—not a training label—inform vitamin and mineral use. A clinician can decide whether testing or treatment is appropriate. These are not general performance add-ons.',
    caution:
      'Do not self-start iron or high-dose vitamin D for tiredness. Excess can be harmful. Persistent or unexplained fatigue deserves assessment rather than a guessed supplement stack. Do not change a prescribed treatment using this card.',
    question: 'Is there a dietary risk or medical indication, and who should assess it?',
    sources: [iron, vitaminD],
  },
  {
    id: 'quality',
    title: 'Check before buying',
    status: 'Risk reduction · not a guarantee',
    summary: 'A label, influencer recommendation or certification mark is not a safety guarantee.',
    consider:
      'Check the actual ingredients and current third-party certification record for the exact product and batch where applicable. Contamination and inaccurate claims remain possible. Competitive athletes must also consider anti-doping rules.',
    caution:
      'Certification can reduce risk but cannot prove zero risk, effectiveness or personal suitability. Avoid fat burners, testosterone boosters, undisclosed blends and exaggerated claims. No pictured pack is a verified or recommended product.',
    question:
      'Is there a clear need, independent quality information and a professional who can review this?',
    sources: [quality],
  },
] as const;

export const trainingSupplementSafety =
  'Adult education, not a prescription, diagnosis or personalised supplement stack. No supplement is automatically required. Training, meals, sleep and recovery remain the foundation. Under-18s, pregnancy or breastfeeding, medical conditions and medicines need qualified advice before performance-supplement use. The demonstrator appearance control changes images only, never suitability, ingredients or dosage.';

export const trainingSupplementTopicFlows: HabitFlow[] = trainingSupplementTopics.map(topic => ({
  id: `training-supplement-${topic.id}`,
  title: topic.title,
  goal: 'Supplements',
  area: 'Fitness',
  pathId: 'supplements',
  description: topic.summary,
  level: topic.status,
  rhythm: 'Review a decision, not a daily challenge',
  milestone: 'Understand when a product might be unnecessary and what to ask before using it.',
  review: topic.question,
  guidance: trainingSupplementSafety,
  sources: [...topic.sources],
  sessionGuide: {
    label: 'Understand what fits your training',
    collection: 'Workout supplement decisions',
    format: topic.status,
    equipment: 'Your training context · food intake · product information if considering one',
    reviewedOn: '2026-10-24',
    cards: [
      {
        id: 'context',
        title: 'When it might be relevant',
        metric: topic.status,
        body: topic.consider,
        illustration: 'workout',
      },
      {
        id: 'caution',
        title: 'When to pause',
        metric: 'Suitability before a product',
        body: topic.caution,
        illustration: 'workout',
      },
      {
        id: 'question',
        title: 'Ask before deciding',
        metric: 'A question, not a recommendation',
        body: topic.question,
        illustration: 'workout',
      },
    ],
  },
  steps: [
    {
      id: 'context',
      title: 'Review training and food first',
      cue: 'Name a specific problem rather than assuming a product is needed.',
      duration: 'Before considering a product',
    },
    {
      id: 'suitability',
      title: 'Check suitability and quality',
      cue: 'Use qualified advice and ingredient information; do not guess doses.',
      duration: 'A review, not a consumption target',
    },
    {
      id: 'decision',
      title: 'Choose a suitable next step',
      cue: 'Not using a supplement is a valid decision.',
      duration: 'When relevant',
    },
  ],
}));

export const trainingSupplementWorkouts = [
  {
    id: 'starting',
    title: 'Getting started',
    context:
      'For everyday or beginner training, begin with meals, recovery and manageable sessions. Products are not an entry requirement; review a food gap or clinical concern only when relevant.',
    topicIds: ['food', 'protein', 'hydration', 'clinical', 'quality'],
  },
  {
    id: 'strength',
    title: 'Strength & muscle',
    context:
      'For resistance training, review food and protein first. Creatine or caffeine are optional discussions, not a mandatory muscle-building stack. Training progression and recovery remain central.',
    topicIds: ['food', 'protein', 'creatine', 'caffeine', 'clinical', 'quality'],
  },
  {
    id: 'running',
    title: 'Running & endurance',
    context:
      'For running, distinguish short comfortable outings from prolonged demanding sessions. Consider practical fuel and hydration when relevant, then food gaps and individual caffeine tolerance—not a generic endurance stack.',
    topicIds: ['food', 'carbohydrate', 'hydration', 'protein', 'caffeine', 'clinical', 'quality'],
  },
  {
    id: 'hyrox',
    title: 'HYROX & hybrid',
    context:
      'For mixed running and strength, assess the actual training or event demands. Fuel, fluids and recovery may need planning. Creatine relates to suitable high-intensity training, not a guaranteed HYROX race benefit.',
    topicIds: [
      'food',
      'carbohydrate',
      'hydration',
      'protein',
      'creatine',
      'caffeine',
      'clinical',
      'quality',
    ],
  },
] as const;

export const trainingSupplementFlows: HabitFlow[] = trainingSupplementWorkouts.map(workout => {
  const pages = workout.topicIds.map(id =>
    trainingSupplementTopicFlows.find(flow => flow.id === `training-supplement-${id}`)!,
  );
  return {
    ...pages[0],
    id: `supplements-${workout.id}`,
    title: workout.title,
    description: workout.context,
    relatedFlowIds: pages.map(flow => flow.id),
    sessionGuide: {
      ...pages[0].sessionGuide!,
      label: 'No supplement is automatically required',
      format: `${pages.length} decision guides`,
    },
    sources: [
      ...new Map(
        pages.flatMap(flow => flow.sources ?? []).map(source => [source.url, source]),
      ).values(),
    ],
  };
});
export const trainingSupplementFlowIds = trainingSupplementFlows.map(flow => flow.id);
export const trainingSupplementMedia = Object.fromEntries(
  trainingSupplementTopicFlows.map((flow, row) => [
    flow.id,
    { atlas: 'supplements' as const, row },
  ]),
);
