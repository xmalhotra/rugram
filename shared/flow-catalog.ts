import type { FlowArea, HabitFlow } from './mobile';
import { starterFlows } from './starter-flows';
import { nutritionFlows } from './nutrition';
import { nutritionCollections, nutritionIdeaCards } from './nutrition-ideas';
import { recipeFlows } from './recipe-flows';
import { absWorkoutFlow } from './workouts';
import { magnesiumGuideFlow } from './magnesium';
import { gymSupportFlow } from './gym-supports';
import { popularWorkoutFlows } from './workout-guides';
import { animalMovementFlows, animalMovementCollectionFlow } from './animal-movements';
import { fitnessGuideFlows } from './fitness-guides';
import { morningDrinksFlow, morningDrinkFlows } from './morning-drinks';
import { trainingSupplementFlows, trainingSupplementTopicFlows } from './training-supplements';
import { codingFlows, codingCardFlows } from './coding-flows';
import { techResourceFlows } from './tech-resources';

export const flowAreas: { id: FlowArea; title: string; description: string; symbol: string }[] = [
  {
    id: 'Fitness',
    title: 'Build your fitness',
    description: 'Train for an event, get leaner, build muscle, or simply get started.',
    symbol: '↗',
  },
  {
    id: 'Tech',
    title: 'Find your coding rhythm',
    description: 'Resources for the work: deployed engineering, agents, purchases, and a monitor you can live with.',
    symbol: '⌘',
  },
];
export const flowPaths: { id: string; area: FlowArea; title: string; description: string }[] = [
  {
    id: 'coding',
    area: 'Tech',
    title: 'Coding',
    description: 'Habits that support your coding, not another course.',
  },
  {
    id: 'supplements',
    area: 'Fitness',
    title: 'Supplements',
    description: 'Understand context, evidence and safety before considering a product.',
  },
  {
    id: 'morning-drinks',
    area: 'Wellbeing',
    title: 'Morning drinks',
    description: 'Eight optional ways to start your day.',
  },
  {
    id: 'sleep',
    area: 'Wellbeing',
    title: 'Better sleep',
    description: 'Build a manageable wind-down.',
  },
  {
    id: 'workout',
    area: 'Fitness',
    title: 'Workout',
    description: 'Make starting a planned session easier.',
  },
  {
    id: 'run-start',
    area: 'Fitness',
    title: 'Running',
    description: 'A manageable, repeatable outing.',
  },
  {
    id: 'nutrition',
    area: 'Wellbeing',
    title: 'Nutrition',
    description: 'Improve familiar meal choices.',
  },
  {
    id: 'hyrox',
    area: 'Fitness',
    title: 'HYROX & hybrid training',
    description: 'Bring running and strength together.',
  },
  {
    id: 'lean',
    area: 'Fitness',
    title: 'Get leaner',
    description: 'Build sustainable movement and food habits.',
  },
  {
    id: 'muscle',
    area: 'Fitness',
    title: 'Build muscle',
    description: 'Make strength training consistent and measurable.',
  },
  {
    id: 'foundation',
    area: 'Fitness',
    title: 'Overall fitness',
    description: 'Start from where you are, without going all-in.',
  },
  {
    id: 'web',
    area: 'Tech',
    title: 'Web development',
    description: 'Go from tutorials to a working website.',
  },
  {
    id: 'ai',
    area: 'Tech',
    title: 'AI & machine learning',
    description: 'Learn the foundations and test a small project.',
  },
  {
    id: 'cloud',
    area: 'Tech',
    title: 'Cloud & DevOps',
    description: 'Learn to deploy, observe, and safely clean up.',
  },
  {
    id: 'security',
    area: 'Tech',
    title: 'Cybersecurity',
    description: 'Understand threats in a legal practice environment.',
  },
];
const fitnessGuidance =
  'A general starting framework, not a personal training or nutrition prescription. Fit these actions around existing sport and recovery; do not stack extra hard sessions. If you have an injury or health condition, seek qualified advice before changing training.';
const fitnessSources = [
  {
    title: 'WHO: general physical activity guidance',
    url: 'https://www.who.int/initiatives/behealthy/physical-activity/',
  },
];
const learnSources = [
  {
    title: 'Microsoft Learn: training library',
    url: 'https://learn.microsoft.com/en-us/training/paths/',
  },
];

// Editorial starter flows. Source links offer background, not validation of the
// complete flow or a claim that an influencer follows it. Stable IDs preserve saves.
export const goalFlows: HabitFlow[] = [
  ...codingFlows,
  ...codingCardFlows,
  ...techResourceFlows,
  ...starterFlows,
  ...popularWorkoutFlows,
  ...fitnessGuideFlows,
  ...animalMovementFlows,
  animalMovementCollectionFlow,
  morningDrinksFlow,
  ...morningDrinkFlows,
  ...trainingSupplementFlows,
  ...trainingSupplementTopicFlows,
  ...nutritionFlows,
  ...nutritionCollections,
  ...nutritionIdeaCards,
  ...recipeFlows,
  absWorkoutFlow,
  magnesiumGuideFlow,
  gymSupportFlow,
  {
    id: 'fitness-hyrox-base',
    area: 'Fitness',
    pathId: 'hyrox',
    goal: 'HYROX & hybrid training',
    title: 'Build your hybrid base',
    level: 'Already active',
    rhythm: 'Weekly planning + your existing training days',
    description:
      'For people who want a starting structure for running and strength, without adding a second training programme on top of their current one.',
    milestone: 'Finish a week with training and recovery deliberately planned.',
    review:
      'Did your running or strength suffer from fatigue? Reduce the load before adding more. Review this outline with a qualified coach before race-specific training.',
    guidance: fitnessGuidance,
    eventContext: { topic: 'HYROX', country: 'IN' },
    sources: [
      ...fitnessSources,
      {
        title: 'NHS: water, drinks and hydration',
        url: 'https://www.nhs.uk/Live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/',
      },
    ],
    steps: [
      {
        id: 'map',
        title: 'Map training and recovery',
        cue: 'Before the week starts, list your current workouts and sport; leave recovery space',
        duration: '10 minutes weekly',
      },
      {
        id: 'drink',
        title: 'Choose your pre-training drink',
        cue: 'Before a planned session, make water available. An electrolyte product is an optional choice, not a requirement or a performance guarantee',
        duration: 'A preference on training days',
        pickContext: { label: 'Compare optional drink picks', useCase: 'pre-workout-drink' },
      },
      {
        id: 'run',
        title: 'Keep an easy aerobic session easy',
        cue: 'On a planned easy day, choose a comfortable pace rather than a time trial',
        duration: 'Within your current training capacity',
      },
      {
        id: 'log',
        title: 'Record effort and recovery',
        cue: 'After training, note what you did, how hard it felt, and any discomfort',
        duration: '2 minutes after a session',
      },
    ],
  },
  {
    id: 'fitness-lean-habits',
    area: 'Fitness',
    pathId: 'lean',
    goal: 'Get leaner',
    title: 'Lean habits, without extremes',
    level: 'Getting started',
    rhythm: 'Meal choices + movement you can repeat',
    description:
      'Replace the pressure to get “shredded” quickly with repeatable food, movement, and recovery habits. No crash diets or promised body transformations.',
    milestone: 'Identify two choices you can keep without feeling depleted.',
    review:
      'How are energy, hunger, training, and consistency? Appearance alone is not a useful daily score. Adapt habits instead of cutting food aggressively.',
    guidance: fitnessGuidance,
    sources: fitnessSources,
    steps: [
      {
        id: 'meal',
        title: 'Plan one balanced meal',
        cue: 'Before shopping or ordering, choose a meal you enjoy with vegetables and a protein source',
        duration: 'A food preference',
      },
      {
        id: 'move',
        title: 'Use an existing break for movement',
        cue: 'When you have a break, choose a comfortable walk if it fits your day',
        duration: 'Start with a manageable amount',
      },
      {
        id: 'review',
        title: 'Notice energy, not just appearance',
        cue: 'At the end of the week, note which habits helped you feel and function better',
        duration: '5 minutes weekly',
      },
    ],
  },
  {
    id: 'fitness-strength-log',
    area: 'Fitness',
    pathId: 'muscle',
    goal: 'Build muscle',
    title: 'Make your lifting count',
    level: 'Gym beginner',
    rhythm: 'On planned strength days + weekly review',
    description:
      'Stop restarting random workouts. Use an appropriate repeatable programme and keep a simple log so you can discuss progression with a trainer.',
    milestone: 'Keep a week of exercise, reps, load, and recovery notes.',
    review:
      'Are technique and recovery consistent? Use your log with a qualified trainer to decide when to progress; more load is not always better.',
    guidance: fitnessGuidance,
    sources: fitnessSources,
    steps: [
      {
        id: 'plan',
        title: 'Choose a repeatable programme',
        cue: 'Before the week, select a programme appropriate to your experience and equipment',
        duration: '10 minutes weekly',
      },
      {
        id: 'record',
        title: 'Log your planned strength session',
        cue: 'During your workout, record exercise, reps, and load without chasing a maximum',
        duration: 'On training days only',
      },
      {
        id: 'recover',
        title: 'Check recovery before progressing',
        cue: 'Before the next session, review soreness, sleep, and technique notes',
        duration: '2 minutes',
      },
    ],
  },
  {
    id: 'fitness-start-small',
    area: 'Fitness',
    pathId: 'foundation',
    goal: 'Overall fitness',
    title: 'A week you can repeat',
    level: 'Getting started',
    rhythm: 'Short movement breaks + weekly planning',
    description:
      'For the person who wants to feel fitter but keeps making plans that are too ambitious. Start with a little movement and build consistency first.',
    milestone: 'Discover a comfortable activity and a repeatable time for it.',
    review:
      'What fitted naturally? Keep that cue next week. Increase gradually only when comfortable; missed days do not need punishment sessions.',
    guidance: fitnessGuidance,
    sources: fitnessSources,
    steps: [
      {
        id: 'cue',
        title: 'Choose an activity you enjoy',
        cue: 'Before the week starts, choose walking, cycling, or another accessible activity',
        duration: '5 minutes weekly',
      },
      {
        id: 'move',
        title: 'Take a comfortable movement break',
        cue: 'After a familiar daily cue, move at an effort that feels manageable',
        duration: 'Start small and adapt',
      },
      {
        id: 'notice',
        title: 'Note what made it easier',
        cue: 'After moving, record the cue and how you felt',
        duration: '1 minute',
      },
    ],
  },
  {
    id: 'tech-web-first-page',
    area: 'Tech',
    pathId: 'web',
    goal: 'Web development',
    title: 'Build your first useful web page',
    level: 'Beginner',
    rhythm: '3 focused sessions a week',
    description:
      'Break the tutorial loop: learn one concept, use it in a small page, and keep a visible record of what you built.',
    milestone: 'A small HTML/CSS/JavaScript page you can demonstrate.',
    review:
      'Can you explain and change your code without copying the tutorial? If not, make the project smaller before adding a framework.',
    sources: [
      {
        title: 'MDN: Learn web development',
        url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
      },
    ],
    steps: [
      {
        id: 'learn',
        title: 'Learn one web concept',
        cue: 'At your chosen learning time, work through a short MDN section',
        duration: '10 minutes per session',
      },
      {
        id: 'build',
        title: 'Apply it to your page',
        cue: 'Immediately after learning, build or change one visible feature',
        duration: '20 minutes per session',
      },
      {
        id: 'note',
        title: 'Save the change and explain it',
        cue: 'Before closing the editor, save your work and note what you learned',
        duration: '5 minutes per session',
      },
    ],
  },
  {
    id: 'tech-ai-small-experiment',
    area: 'Tech',
    pathId: 'ai',
    goal: 'AI & machine learning',
    title: 'From AI curiosity to an experiment',
    level: 'Basic Python helpful',
    rhythm: '3 focused sessions a week',
    description:
      'Understand one AI concept and test a tiny example instead of collecting tools. Begin with a guided exercise, not a production agent.',
    milestone: 'A small experiment with documented inputs, outputs, and failure cases.',
    review:
      'What failed, and how did you check it? Improve the test examples before switching models or buying more tools.',
    guidance:
      'Use public or synthetic data. Do not upload personal or confidential information. Check service charges before using a paid API.',
    sources: learnSources,
    steps: [
      {
        id: 'concept',
        title: 'Study one AI concept',
        cue: 'At the start of your session, choose a beginner module from Microsoft Learn',
        duration: '10 minutes per session',
      },
      {
        id: 'experiment',
        title: 'Run a small guided example',
        cue: 'After the lesson, try the example with public or synthetic inputs',
        duration: '20 minutes per session',
      },
      {
        id: 'evaluate',
        title: 'Keep a failure-case notebook',
        cue: 'Before finishing, record one output that worked and one that did not',
        duration: '5 minutes per session',
      },
    ],
  },
  {
    id: 'tech-cloud-safe-lab',
    area: 'Tech',
    pathId: 'cloud',
    goal: 'Cloud & DevOps',
    title: 'Your first safe cloud lab',
    level: 'Basic command-line skills',
    rhythm: '2 lab sessions a week',
    description:
      'Learn one deployment concept at a time, with cleanup and cost checks built into the flow.',
    milestone: 'Explain how a small service is deployed, observed, and removed.',
    review:
      'Can you reproduce the lab from your notes, and confirm no resources remain running? Make it repeatable before making it larger.',
    guidance:
      'Use a provider sandbox where available. Budget alerts are not hard spending caps. Never commit keys or assume a cloud service is free.',
    sources: learnSources,
    steps: [
      {
        id: 'scope',
        title: 'Read the lab and its costs',
        cue: 'Before creating resources, choose a beginner cloud module and review prerequisites',
        duration: '10 minutes per session',
      },
      {
        id: 'lab',
        title: 'Complete one bounded lab',
        cue: 'During your learning block, follow the provider’s exercise and save notes, not secrets',
        duration: '25 minutes per session',
      },
      {
        id: 'cleanup',
        title: 'Remove resources and check usage',
        cue: 'Before leaving the session, delete lab resources and inspect the billing dashboard',
        duration: '5 minutes per session',
      },
    ],
  },
  {
    id: 'tech-security-first-lab',
    area: 'Tech',
    pathId: 'security',
    goal: 'Cybersecurity',
    title: 'Learn security in a safe lab',
    level: 'Beginner',
    rhythm: '2 learning sessions a week',
    description:
      'Move from security headlines to understanding one threat, one defence, and one small authorised exercise.',
    milestone: 'A short write-up explaining a threat and a practical mitigation.',
    review:
      'Can you explain what happened and how to prevent it, rather than just repeat commands? Revisit the concept if the answer is no.',
    guidance:
      'Practise only in a purpose-built lab or an environment you own and are explicitly authorised to test. Never test public systems without permission.',
    sources: learnSources,
    steps: [
      {
        id: 'concept',
        title: 'Learn one security concept',
        cue: 'At your chosen time, read a beginner security module',
        duration: '10 minutes per session',
      },
      {
        id: 'practice',
        title: 'Practise only inside an authorised lab',
        cue: 'After the lesson, use its sandbox or a local practice environment',
        duration: '20 minutes per session',
      },
      {
        id: 'explain',
        title: 'Write the defence in plain language',
        cue: 'Before ending, describe the threat and how you would reduce the risk',
        duration: '5 minutes per session',
      },
    ],
  },
];

export function discoverFlows(library: HabitFlow[], area: FlowArea, pathId: string) {
  return library.filter(flow => flow.area === area && flow.pathId === pathId);
}
