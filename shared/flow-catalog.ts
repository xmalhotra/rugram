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
import { gymHabitFlows } from './gym-flows';

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
  ...gymHabitFlows,
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

/** Personal flow creation stays in the code, and off, while a finished run is the way onto the timeline. */
export const flowCreationEnabled = false;

/** Fitness catalog for the Flows tab. Separate from saved HabitFlow content above. */
export type CatalogStatus = 'live' | 'coming-soon';
export type CatalogLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CatalogFlow = {
  id: string;
  title: string;
  tileId: string;
  level: CatalogLevel;
  tags: string[];
  status: CatalogStatus;
  /** Real HabitFlow id once the entry is live. */
  flowId?: string;
  /** Catalog ids to suggest after this one. Unused in the UI for now. */
  next?: string[];
};
export type CatalogTile = {
  id: string;
  title: string;
  sectionId: string;
  chips?: string[];
  /** Exercise icon for the tile. A missing picture falls back to the section line icon. */
  iconKey?: string;
};
export type CatalogRoot = { id: string; title: string };
export type CatalogSection = { id: string; title: string; rootId: string };

/** Top-level categories on the catalog page. Fitness comes first; others join as they are curated. */
export const catalogRoots: CatalogRoot[] = [{ id: 'fitness', title: 'Fitness' }];

export const catalogSections: CatalogSection[] = [
  { id: 'gym', title: 'Gym', rootId: 'fitness' },
  { id: 'calisthenics', title: 'Calisthenics', rootId: 'fitness' },
  { id: 'crossfit', title: 'CrossFit', rootId: 'fitness' },
  { id: 'home', title: 'Home Workouts', rootId: 'fitness' },
  { id: 'running', title: 'Running', rootId: 'fitness' },
  { id: 'endurance', title: 'Endurance Events', rootId: 'fitness' },
];

const tile = (
  id: string,
  title: string,
  sectionId: string,
  chips?: string[],
): CatalogTile => ({
  id,
  title,
  sectionId,
  ...(chips ? { chips } : {}),
});

export const catalogTiles: CatalogTile[] = [
  tile('gym-back', 'Back', 'gym'),
  tile('gym-biceps', 'Biceps', 'gym'),
  tile('gym-chest', 'Chest', 'gym'),
  tile('gym-triceps', 'Triceps', 'gym'),
  tile('gym-shoulders', 'Shoulders', 'gym'),
  tile('gym-legs', 'Legs', 'gym'),
  tile('gym-core', 'Core', 'gym'),
  tile('gym-supersets', 'Supersets', 'gym', [
    'Back + Biceps',
    'Chest + Triceps',
    'Shoulders + Arms',
    'Legs + Core',
  ]),
  tile('gym-full', 'Full Body', 'gym'),
  tile('cal-upper', 'Upper Body', 'calisthenics'),
  tile('cal-pull', 'Pull', 'calisthenics'),
  tile('cal-push', 'Push', 'calisthenics'),
  tile('cal-legs', 'Legs', 'calisthenics'),
  tile('cal-core', 'Core', 'calisthenics'),
  tile('cal-skills', 'Skills', 'calisthenics'),
  tile('cal-full', 'Full Body', 'calisthenics'),
  tile('cf-benchmark', 'Benchmark WODs', 'crossfit'),
  tile('cf-amrap', 'AMRAP', 'crossfit'),
  tile('cf-emom', 'EMOM', 'crossfit'),
  tile('cf-fortime', 'For Time', 'crossfit'),
  tile('cf-hero', 'Hero WODs', 'crossfit'),
  tile('home-none', 'No Equipment', 'home'),
  tile('home-dumbbells', 'Dumbbells', 'home'),
  tile('home-bands', 'Resistance Bands', 'home'),
  tile('home-short', 'Under 20 Minutes', 'home'),
  tile('run-5k', '5K', 'running'),
  tile('run-10k', '10K', 'running'),
  tile('run-half', 'Half Marathon', 'running'),
  tile('run-marathon', 'Marathon', 'running'),
  tile('run-ultra', 'Ultramarathon', 'running'),
  tile('run-trail', 'Trail', 'running'),
  { ...tile('run-drills', 'Drills & Plyometrics', 'running'), iconKey: 'pogo-jumps' },
  tile('end-sprint', 'Sprint Triathlon', 'endurance'),
  tile('end-olympic', 'Olympic Triathlon', 'endurance'),
  tile('end-half-iron', 'Half Ironman', 'endurance'),
  tile('end-iron', 'Ironman', 'endurance'),
  tile('end-duathlon', 'Duathlon', 'endurance'),
  tile('end-hyrox', 'HYROX', 'endurance'),
];

const levelOrder: CatalogLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

function coming(
  tileId: string,
  items: [string, CatalogLevel, string[]?][],
): CatalogFlow[] {
  return items.map(([title, level, tags]) => ({
    id: `${tileId}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`,
    title,
    tileId,
    level,
    tags: tags ?? [],
    status: 'coming-soon',
  }));
}

export const catalogFlows: CatalogFlow[] = [
  ...coming('gym-back', [
    ['Chest-supported row', 'Beginner'],
    ['Pull-up and row day', 'Intermediate'],
    ['Weighted pull-up strength', 'Advanced'],
  ]),
  ...coming('gym-biceps', [
    ['First curls', 'Beginner'],
    ['Arm day curls', 'Intermediate'],
    ['Peak contraction finishers', 'Advanced'],
  ]),
  ...coming('gym-chest', [
    ['Push-up to bench', 'Beginner'],
    ['Flat and incline press', 'Intermediate'],
    ['Heavy bench cycle', 'Advanced'],
  ]),
  ...coming('gym-triceps', [
    ['Press-down basics', 'Beginner'],
    ['Close-grip press', 'Intermediate'],
    ['Dips and extensions', 'Advanced'],
  ]),
  ...coming('gym-shoulders', [
    ['Shoulder press start', 'Beginner'],
    ['Overhead and raises', 'Intermediate'],
    ['Strict press strength', 'Advanced'],
  ]),
  ...coming('gym-legs', [
    ['Squat pattern start', 'Beginner'],
    ['Squat and hinge day', 'Intermediate'],
    ['Lower body strength', 'Advanced'],
  ]),
  ...coming('gym-core', [
    ['Dead bug and plank', 'Beginner'],
    ['Anti-rotation core', 'Intermediate'],
    ['Hanging core strength', 'Advanced'],
  ]),
  ...coming('gym-supersets', [
    ['Back + Biceps superset', 'Intermediate', ['Back + Biceps']],
    ['Chest + Triceps superset', 'Intermediate', ['Chest + Triceps']],
    ['Shoulders + Arms superset', 'Intermediate', ['Shoulders + Arms']],
    ['Legs + Core superset', 'Intermediate', ['Legs + Core']],
  ]),
  ...coming('gym-full', [
    ['Full body three days', 'Beginner'],
    ['Full body strength', 'Intermediate'],
    ['Full body density', 'Advanced'],
  ]),
  ...coming('cal-pull', [
    ['First pull-up', 'Beginner'],
    ['Pull-up volume', 'Intermediate'],
    ['Weighted pull-up', 'Advanced'],
  ]),
  ...coming('cal-push', [
    ['Knee push-up', 'Beginner'],
    ['Push-up strength', 'Intermediate'],
    ['Dip progression', 'Advanced'],
  ]),
  ...coming('cal-legs', [
    ['Squat hold', 'Beginner'],
    ['Pistol prep', 'Intermediate'],
    ['Shrimp squat', 'Advanced'],
  ]),
  ...coming('cal-core', [
    ['Hollow body', 'Beginner'],
    ['L-sit prep', 'Intermediate'],
    ['Hanging leg raise', 'Advanced'],
  ]),
  ...coming('cal-skills', [
    ['Support hold', 'Beginner'],
    ['Wall handstand', 'Intermediate'],
    ['Muscle-up prep', 'Advanced'],
  ]),
  ...coming('cal-full', [
    ['Calisthenics circuit', 'Beginner'],
    ['Mixed skill day', 'Intermediate'],
    ['Density circuit', 'Advanced'],
  ]),
  ...coming('cf-benchmark', [
    ['Cindy', 'Intermediate'],
    ['Fran', 'Advanced'],
    ['Helen', 'Intermediate'],
  ]),
  ...coming('cf-amrap', [
    ['12 minute AMRAP', 'Beginner'],
    ['20 minute AMRAP', 'Intermediate'],
    ['Partner AMRAP', 'Advanced'],
  ]),
  ...coming('cf-emom', [
    ['10 minute EMOM', 'Beginner'],
    ['Strength EMOM', 'Intermediate'],
    ['Mixed modal EMOM', 'Advanced'],
  ]),
  ...coming('cf-fortime', [
    ['Short for time', 'Beginner'],
    ['Chipper for time', 'Intermediate'],
    ['Ladder for time', 'Advanced'],
  ]),
  ...coming('cf-hero', [
    ['Murph scaled', 'Intermediate'],
    ['DT', 'Advanced'],
    ['Kelly', 'Intermediate'],
  ]),
  ...coming('home-none', [
    ['Bodyweight starter', 'Beginner'],
    ['Living room circuit', 'Intermediate'],
    ['Density no gear', 'Advanced'],
  ]),
  ...coming('home-dumbbells', [
    ['Dumbbell full body', 'Beginner'],
    ['Dumbbell strength', 'Intermediate'],
    ['Dumbbell complex', 'Advanced'],
  ]),
  ...coming('home-bands', [
    ['Band warmup', 'Beginner'],
    ['Band strength', 'Intermediate'],
    ['Band finisher', 'Advanced'],
  ]),
  ...coming('home-short', [
    ['15 minute starter', 'Beginner'],
    ['20 minute strength', 'Intermediate'],
    ['12 minute burner', 'Advanced'],
  ]),
  ...coming('run-5k', [
    ['Couch to 5K', 'Beginner'],
    ['Easy 5K', 'Beginner'],
    ['Faster 5K', 'Intermediate'],
  ]),
  ...coming('run-10k', [
    ['First 10K', 'Beginner'],
    ['10K steady', 'Intermediate'],
    ['10K speed', 'Advanced'],
  ]),
  ...coming('run-half', [
    ['First half marathon', 'Intermediate'],
    ['Half marathon base', 'Intermediate'],
    ['Half marathon sharpen', 'Advanced'],
  ]),
  ...coming('run-marathon', [
    ['First marathon, 16 weeks', 'Intermediate'],
    ['Marathon long run', 'Intermediate'],
    ['Marathon race week', 'Advanced'],
  ]),
  ...coming('run-ultra', [
    ['Time on feet', 'Intermediate'],
    ['First ultra', 'Advanced'],
    ['Ultra back to back', 'Advanced'],
  ]),
  ...coming('run-trail', [
    ['Trail introduction', 'Beginner'],
    ['Hilly trail', 'Intermediate'],
    ['Technical trail', 'Advanced'],
  ]),
  ...coming('end-sprint', [
    ['Sprint triathlon start', 'Beginner'],
    ['Sprint brick', 'Intermediate'],
    ['Sprint race week', 'Intermediate'],
  ]),
  ...coming('end-olympic', [
    ['Olympic distance base', 'Intermediate'],
    ['Olympic brick', 'Intermediate'],
    ['Olympic race plan', 'Advanced'],
  ]),
  ...coming('end-half-iron', [
    ['Half Ironman brick', 'Intermediate'],
    ['Half Ironman base', 'Advanced'],
    ['Half Ironman long', 'Advanced'],
  ]),
  ...coming('end-iron', [
    ['Ironman year', 'Advanced'],
    ['Ironman long ride', 'Advanced'],
    ['Ironman run off the bike', 'Advanced'],
  ]),
  ...coming('end-duathlon', [
    ['First duathlon', 'Beginner'],
    ['Duathlon brick', 'Intermediate'],
    ['Duathlon speed', 'Advanced'],
  ]),
  ...coming('end-hyrox', [
    ['HYROX introduction', 'Beginner'],
    ['HYROX stations', 'Intermediate'],
    ['HYROX race sim', 'Advanced'],
  ]),
  {
    id: 'cal-upper-beginner',
    title: 'Upper Body at Home',
    tileId: 'cal-upper',
    level: 'Beginner',
    tags: [],
    status: 'coming-soon',
    flowId: 'cal-upper-beginner',
  },
  {
    id: 'cal-upper-intermediate',
    title: 'Upper Body at Home',
    tileId: 'cal-upper',
    level: 'Intermediate',
    tags: [],
    status: 'coming-soon',
    flowId: 'cal-upper-intermediate',
  },
];

const backAndBiceps = catalogFlows.find(flow => flow.id === 'gym-supersets-back-biceps-superset');
if (backAndBiceps) backAndBiceps.flowId = 'gym-back-biceps';

for (const flow of catalogFlows) {
  const rank = levelOrder.indexOf(flow.level);
  const step = catalogFlows.find(
    item => item.tileId === flow.tileId && levelOrder.indexOf(item.level) === rank + 1,
  );
  if (step) flow.next = [step.id];
}

export function sectionsWithTiles() {
  return catalogSections.map(section => ({
    ...section,
    tiles: catalogTiles.filter(item => item.sectionId === section.id),
  }));
}

export function sectionsInRoot(id: string) {
  return catalogSections.filter(section => section.rootId === id);
}

export function tilesInSection(id: string) {
  return catalogTiles.filter(item => item.sectionId === id);
}

export function flowsInTile(id: string) {
  return catalogFlows.filter(item => item.tileId === id);
}

export function catalogFlow(id: string) {
  return catalogFlows.find(item => item.id === id);
}

export function catalogTile(id: string) {
  return catalogTiles.find(item => item.id === id);
}
