import type { HabitFlow } from './mobile';
import {
  nutritionIdeaMedia,
  nutritionCollectionIds,
  nutritionCollectionChildren,
} from './nutrition-ideas';
import { animalFrameMedia, type FlowAtlas } from './flow-frame-sequences';
import {
  gymTechniqueMedia,
  gymTechniqueCards,
  gymTechniquesFlow,
  gymTechniquesFlowId,
} from './gym-techniques';
import { guide, popularWorkoutFlows } from './workout-guides';
import { morningDrinkMedia, morningDrinkFlows, morningDrinksFlowId } from './morning-drinks';
import {
  codingMedia,
  codingCollectionIds,
  codingCollectionChildren,
  legacyCodingCollectionIds,
  type CodingAtlas,
} from './coding-flows';
import {
  trainingSupplementMedia,
  trainingSupplementFlows,
  trainingSupplementFlowIds,
} from './training-supplements';

export const runningStylesFlowId = 'running-styles';
export const hyroxRulebook = 'https://maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf';
const runningSources = [
  {
    title: 'England Athletics: running and training styles',
    url: 'https://www.englandathletics.org/runtogether/support/runner-frequently-asked-questions/',
  },
  {
    title: 'NHS: getting started with run/walk',
    url: 'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/',
  },
];
const hyroxSources = [{ title: 'HYROX Singles rulebook · season 26/27', url: hyroxRulebook }];

export type FitnessMedia = {
  atlas: 'cindy' | 'running' | 'hyrox' | 'morning' | 'supplements' | CodingAtlas | FlowAtlas;
  row: number;
};
/** Bundled media is deliberately separate from editable guide content and review approvals. */
export const fitnessMedia: Record<string, FitnessMedia> = {
  ...nutritionIdeaMedia,
  ...gymTechniqueMedia,
  ...animalFrameMedia,
  ...morningDrinkMedia,
  ...trainingSupplementMedia,
  ...codingMedia,
};
const make = (
  id: string,
  title: string,
  description: string,
  format: string,
  equipment: string,
  sources: NonNullable<HabitFlow['sources']>,
  body: string,
  scale: string,
): HabitFlow =>
  guide(
    id,
    title,
    description,
    'Choose an appropriate scale',
    {
      label: 'Movement guide',
      format,
      equipment,
      reviewedOn: '2026-10-24',
      cards: [
        {
          id: 'technique',
          title: 'What to focus on',
          metric: format,
          body,
          illustration: 'workout',
        },
        {
          id: 'scale',
          title: 'Choose your version',
          metric: 'Quality before volume',
          body: scale,
          illustration: 'workout',
        },
      ],
    },
    sources,
  );

const cindy = popularWorkoutFlows.find(flow => flow.id === 'workout-cindy')!;
export const cindyMovementFlows = [
  [
    'pull-up',
    'Pull-up',
    '5 pull-ups per round',
    'Start from a controlled hang on a secure bar. Pull without swinging, then lower with control. The preview illustrates a strict variation; it does not teach a kipping technique.',
    'Use appropriately supported pull-ups or coached ring rows. Do not improvise an insecure bar or support.',
  ],
  [
    'push-up',
    'Push-up',
    '10 push-ups per round',
    'Begin in a supported plank. Lower your chest under control, keeping your body together, then press back up. Choose a range you can control without pain.',
    'Use a stable elevated surface or an appropriate assisted version. Rest before your trunk position breaks down.',
  ],
  [
    'squat',
    'Air squat',
    '15 squats per round',
    'Stand balanced. Bend hips and knees together, descend into a comfortable controlled squat, then stand. Keep your feet supported; do not force depth.',
    'Use a shallower range or supported squat appropriate to your mobility. A qualified coach can help choose a comfortable variation.',
  ],
].map(([suffix, title, format, body, scale], row) => {
  const id = `cindy-${suffix}`;
  fitnessMedia[id] = { atlas: 'cindy', row };
  const flow = make(
    id,
    title,
    cindy.description,
    format,
    cindy.sessionGuide.equipment,
    cindy.sources!,
    body,
    scale,
  );
  flow.sessionGuide!.cards.push(
    ...cindy.sessionGuide.cards.map(card => ({ ...card, id: `cindy-${card.id}` })),
  );
  flow.exerciseId = suffix === 'squat' ? 'air-squat' : suffix;
  return flow;
});
// Keep the longstanding saved Cindy ID. Children are pages, not browse categories.

const runningStyles = [
  [
    'run-walk',
    'Run / walk',
    'Alternate at your own pace',
    'Walking and short comfortable running periods can make starting more manageable. Return to walking before your effort becomes uncontrolled.',
    'Start with a manageable amount and recovery between outings. The NHS beginner plan offers a structured progression.',
  ],
  [
    'easy',
    'Easy running',
    'Comfortable, conversational effort',
    'Use a relaxed effort at which conversation feels comfortable. Let your stride be natural; the preview is not a required foot-strike or cadence pattern.',
    'Slow down or walk when needed. Keep an easy outing easy rather than turning every run into a test.',
  ],
  [
    'tempo',
    'Tempo running',
    'Controlled, sustained harder effort',
    'Tempo or threshold training uses a controlled harder effort rather than an all-out sprint. Build a comfortable running base before adding this style.',
    'A coach can select a suitable dose. Warm up, recover, and avoid stacking hard sessions when you are tired.',
  ],
  [
    'intervals',
    'Running intervals',
    'Work periods with recovery',
    'Alternate planned faster efforts with easy recovery. The frames illustrate changing pace, not a prescribed speed or universal running form.',
    'Choose duration and recovery for your experience with a coach. Beginners can keep to run/walk rather than high-intensity repetitions.',
  ],
  [
    'hills',
    'Hill running',
    'Controlled uphill effort',
    'Use a suitable gentle slope and a controlled effort. Adjust your stride naturally to the slope; do not chase speed or force a particular foot landing.',
    'Walk the hill if needed. Choose secure footing and recover comfortably; steep or fast downhill running is not part of this preview.',
  ],
];
export const runningStyleFlows = runningStyles.map(([suffix, title, format, body, scale], row) => {
  const id = `running-style-${suffix}`;
  fitnessMedia[id] = { atlas: 'running', row };
  return {
    ...make(
      id,
      title,
      'Explore a running style, then choose a suitable effort and progression.',
      format,
      'Suitable shoes · clear, safe route',
      runningSources,
      body,
      scale,
    ),
    pathId: 'run-start',
    goal: 'Running',
  };
});
export const runningStylesFlow: HabitFlow = {
  ...runningStyleFlows[0],
  id: runningStylesFlowId,
  title: 'Running styles',
  description:
    'Run / walk, easy running, tempo, intervals and hills. Swipe between five visual guides.',
  relatedFlowIds: runningStyleFlows.map(flow => flow.id),
  sessionGuide: {
    ...runningStyleFlows[0].sessionGuide!,
    collection: 'Running styles',
    format: '5 running styles',
  },
};

export const hyroxStations = [
  {
    id: 'ski',
    title: 'SkiErg',
    volume: 1000,
    unit: 'm',
    cue: 'Reach, pull the handles down with a controlled hip hinge, then recover. Use the machine safely; avoid pulling only with your arms.',
  },
  {
    id: 'sled-push',
    title: 'Sled push',
    volume: 50,
    unit: 'm',
    cue: 'Brace against the sled and take small controlled steps. A qualified coach should select the load and suitable floor friction.',
  },
  {
    id: 'sled-pull',
    title: 'Sled pull',
    volume: 50,
    unit: 'm',
    cue: 'Use a controlled hand-over-hand rope pull within a clear marked area. Manage loose rope and do not wrap it around your hands.',
  },
  {
    id: 'burpee',
    title: 'Burpee broad jump',
    volume: 80,
    unit: 'm',
    cue: 'Move through the burpee and a controlled two-foot broad jump. Land balanced and use a clear surface. Learn the components separately before combining them.',
  },
  {
    id: 'row',
    title: 'Rowing',
    volume: 1000,
    unit: 'm',
    cue: 'From the catch, drive with the legs, open the hips, then draw the handle. Recover arms, hips, then knees. Ask for help setting up the machine.',
  },
  {
    id: 'carry',
    title: 'Farmers carry',
    volume: 200,
    unit: 'm',
    cue: 'Lift the implements with control, stand tall and walk with steady short steps. Set them down safely before grip or posture fails.',
  },
  {
    id: 'lunge',
    title: 'Sandbag lunge',
    volume: 100,
    unit: 'm',
    cue: 'Secure the sandbag, step into a controlled lunge and rise before the next step. Learn a comfortable unloaded lunge before adding load.',
  },
  {
    id: 'wall-ball',
    title: 'Wall balls',
    volume: 100,
    unit: 'reps',
    cue: 'Hold the ball, squat with control, then drive up to throw toward the target. Receive the ball safely and reset. Practise with an appropriate light ball.',
  },
];
function hyroxCollection(half: boolean) {
  const id = half ? 'hyrox-half' : 'hyrox-full';
  const title = half ? 'Half HYROX' : 'Full HYROX';
  const run = half ? 500 : 1000;
  const factor = half ? 0.5 : 1;
  const context = half
    ? 'Half-volume training version, not an official race category. Running and station distance/repetitions are halved; weights are not automatically halved.'
    : 'Singles format: eight 1 km runs, each followed by its station in the official order. Loads and target standards depend on division.';
  const children = hyroxStations.flatMap((station, row) => {
    const runId = `${id}-run-${row + 1}`;
    const stationId = `${id}-${station.id}`;
    fitnessMedia[runId] = { atlas: 'running', row: 1 };
    fitnessMedia[stationId] = { atlas: 'hyrox', row };
    const common =
      'This is demanding training, not a beginner prescription. Choose safe loads and recovery with a qualified coach. For racing, consult the current division rules; changing the demonstrator does not change weights.';
    return [
      make(
        runId,
        `Run ${row + 1} · ${run} m`,
        context,
        `${run} m before ${station.title}`,
        'Clear running route',
        hyroxSources,
        'Use a sustainable pace appropriate to your training. This run comes before the next station; do not skip directly between stations.',
        common,
      ),
      make(
        stationId,
        `${row + 1}. ${station.title}`,
        context,
        `${station.volume * factor} ${station.unit}`,
        'Suitable training equipment · division-specific race loads',
        hyroxSources,
        station.cue,
        common,
      ),
    ].map(flow => ({ ...flow, pathId: 'hyrox', goal: title }));
  });
  const parent: HabitFlow = {
    ...children[0],
    id,
    title,
    description: context,
    relatedFlowIds: children.map(flow => flow.id),
    sessionGuide: {
      ...children[0].sessionGuide!,
      collection: title,
      label: half ? 'Half-volume training' : 'Singles format · 26/27',
      format: half ? '8 × 500 m + half-volume stations' : '8 × 1 km + 8 stations',
    },
  };
  return { parent, children };
}
const full = hyroxCollection(false);
const half = hyroxCollection(true);
export const hyroxFlows = [full.parent, half.parent];
export const fitnessGuideFlows = [
  gymTechniquesFlow,
  ...gymTechniqueCards,
  ...cindyMovementFlows,
  runningStylesFlow,
  ...runningStyleFlows,
  ...hyroxFlows,
  ...full.children,
  ...half.children,
];
export const fitnessCollectionIds = [
  ...nutritionCollectionIds,
  gymTechniquesFlowId,
  ...codingCollectionIds,
  ...legacyCodingCollectionIds,
  ...trainingSupplementFlowIds,
  morningDrinksFlowId,
  'workout-cindy',
  runningStylesFlowId,
  ...hyroxFlows.map(flow => flow.id),
];
export const fitnessCollectionChildren: Record<string, string[]> = {
  ...nutritionCollectionChildren,
  [gymTechniquesFlowId]: gymTechniqueCards.map(card => card.id),
  ...codingCollectionChildren,
  ...Object.fromEntries(trainingSupplementFlows.map(flow => [flow.id, flow.relatedFlowIds!])),
  [morningDrinksFlowId]: morningDrinkFlows.map(flow => flow.id),
  'workout-cindy': cindyMovementFlows.map(flow => flow.id),
  [runningStylesFlowId]: runningStyleFlows.map(flow => flow.id),
  ...Object.fromEntries(hyroxFlows.map(flow => [flow.id, flow.relatedFlowIds!])),
};
export const curatedFitnessIds: Record<string, string[]> = {
  supplements: trainingSupplementFlowIds,
  workout: ['workout-cindy', 'workout-animal-movements', gymTechniquesFlowId],
  running: [runningStylesFlowId],
  hyrox: hyroxFlows.map(flow => flow.id),
};
export const isFitnessVisualFlow = (id: string) =>
  id === 'workout-animal-movements' ||
  id.startsWith('workout-animal-') ||
  fitnessCollectionIds.includes(id) ||
  !!fitnessMedia[id];
