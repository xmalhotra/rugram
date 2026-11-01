import type { HabitFlow } from './mobile';
import type { WorkoutGuide } from './workout-guides';
import { fitnessCollectionChildren } from './fitness-guides';
import {
  animalMovementContext,
  animalCrawlSource,
  duckWalkSource,
  crabToeTouchSource,
} from './animal-movement-context';

export const animalIllustrations = [
  'animal-bear',
  'animal-crab',
  'animal-ape',
  'animal-frog',
  'animal-inchworm',
  'animal-bird-dog',
] as const;
export type AnimalIllustration = (typeof animalIllustrations)[number];
export const animalMovementCategory = 'Animal movements';
const ace = (slug: string) =>
  `https://www.acefitness.org/resources/everyone/exercise-library/${slug}/`;
const af =
  'https://animalflow.com/wp-content/uploads/2022/10/AF-Manual-L1-A4-Eng-2021-Student-Download.pdf';
const movements = [
  {
    id: 'bear',
    name: 'Bear crawl',
    level: 'Intermediate · wrists loaded',
    focus: 'Opposite hand + foot',
    illustration: 'animal-bear',
    setup:
      'Begin on all fours, hands under shoulders and knees under hips. Brace gently and lift your knees just clear of the floor.',
    move: 'Take a small step with one hand and the opposite foot, then switch sides. Keep your hips quiet and your back level. Move slowly, not for speed.',
    easier:
      'Keep your knees down and practise small weight shifts first. A stationary hover is an option only if you can stay comfortable and breathe.',
    watch:
      'Avoid rocking your hips, shrugging or pushing through wrist pain. Stop when you can no longer keep your trunk controlled.',
    source: {
      title: 'ACE: bear crawl setup and alignment',
      url: 'https://www.acefitness.org/resources/pros/expert-articles/6377/5-cognitive-awareness-drills-for-training-athletes/',
    },
  },
  {
    id: 'crab',
    name: 'Crab walk',
    level: 'Intermediate · shoulders loaded',
    focus: 'Face up · small steps',
    illustration: 'animal-crab',
    setup:
      'Sit with bent knees and feet flat. Place your hands behind you in a comfortable position; gently lift your hips only as far as your shoulders tolerate.',
    move: 'Keep your chest facing up. Shift weight carefully and take short alternating steps with your hands and feet. Use clear, non-slip floor space.',
    easier:
      'Start seated with gentle weight shifts, or practise a small stationary hip lift. Skip the lift if the wrist or shoulder position is uncomfortable.',
    watch:
      'Do not force your shoulders backwards or lock yourself into a painful hand position. Supporting body weight here is demanding, not a required beginner task.',
    source: {
      title: 'ACE: crab position (youth movement resource, not an adult prescription)',
      url: 'https://www.acefitness.org/resources/everyone/blog/5055/youth-fitness-resistance-training/',
    },
  },
  {
    id: 'ape',
    name: 'Lateral ape',
    level: 'Skill practice · coaching helpful',
    focus: 'Sideways weight transfer',
    illustration: 'animal-ape',
    setup:
      'Use a squat depth you control. Place both hands on the floor toward one side, leaving space to move your feet.',
    move: 'Transfer weight gradually into your hands, then relocate your feet sideways and reset. Learn a small, grounded version before any hopping or hand-balancing.',
    easier:
      'Keep your feet grounded and practise a shallow side-to-side squat shift. Get coaching before trying a deeper, hand-supported transfer.',
    watch:
      'Do not force a deep squat, collapse into your wrists or launch your feet without control. This card introduces the pattern, not a certified Animal Flow lesson.',
    source: { title: 'Animal Flow: lateral travelling ape reference', url: af },
  },
  {
    id: 'frog',
    name: 'Frog travel',
    level: 'Skill practice · optional impact',
    focus: 'Hands forward · feet follow',
    illustration: 'animal-frog',
    setup:
      'Start in a comfortable squat with your hands in front. Choose a small movement area and a depth that suits your hips and knees.',
    move: 'Reach your hands forward, transfer weight with control, then bring your feet forward and reset. The travelling-ape/frog pattern is a skill, not a distance challenge.',
    easier:
      'Keep both feet down and practise a gentle squat-to-hand-support weight shift. A shallow standing squat is an alternative; jumping is not required.',
    watch:
      'Leave airborne variations to coached practice. Avoid hard landings, painful knee flexion and sudden loading through your wrists.',
    source: { title: 'Animal Flow: forward travelling ape / frog reference', url: af },
  },
  {
    id: 'inchworm',
    name: 'Inchworm walkout',
    level: 'Demanding · adjustable range',
    focus: 'Hinge · walk out · return',
    illustration: 'animal-inchworm',
    setup:
      'Stand comfortably and hinge at your hips. Soften your knees as needed to reach the floor without forcing your back or hamstrings.',
    move: 'Walk your hands out in small steps toward a controlled plank, then reverse the hand walk and stand comfortably. This walkout adaptation omits the push-up in ACE’s full inchworm.',
    easier:
      'Shorten the walkout, use a suitable stable raised surface with guidance, or practise a standing hip hinge instead. You do not need to reach a full plank.',
    watch:
      'Do not let your lower back sag or reach your hands beyond a position you can support. Stop for wrist, shoulder or back discomfort.',
    source: {
      title: 'ACE: inchworm technique (walkout adaptation shown here)',
      url: ace('254/inchworms'),
    },
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    level: 'Controlled · knees supported',
    focus: 'Reach long, not high',
    illustration: 'animal-bird-dog',
    setup:
      'Start on hands and knees, with hands under shoulders and knees under hips. Keep your spine comfortable and your gaze toward the floor.',
    move: 'Reach one arm and the opposite leg away from you without turning your pelvis. Return with control, then switch. Keep the reach low enough to avoid arching your back.',
    easier:
      'Move only one arm or one leg, or slide a foot along the floor. Use a comfortable knee pad and reduce the range before adding balance demands.',
    watch:
      'Avoid lifting the leg high, twisting your hips or holding your breath. This is movement practice, not a treatment plan for back pain.',
    source: { title: 'ACE: bird-dog alignment and progression', url: ace('14/bird-dog') },
  },
  {
    id: 'lateral-bear',
    name: 'Lateral bear crawl',
    level: 'Intermediate · sideways control',
    focus: 'Travel sideways · keep the hips quiet',
    illustration: 'animal-bear',
    setup:
      'Use a small bear hover with room to your side. Keep your knees bent and your shoulders and hips level.',
    move: 'Take short, controlled hand-and-foot steps sideways, then let the other supports follow. Do not rotate into a plank. This is a controlled lateral-crawl variation, not a speed drill.',
    easier: 'Rest your knees and practise a small sideways weight shift before adding travel.',
    watch:
      'Reduce the range if your hips swing or your hands cross awkwardly. Avoid painful wrist loading.',
    source: animalCrawlSource,
  },
  {
    id: 'crab-toe-touch',
    name: 'Crab toe-touch',
    level: 'Intermediate · balance and shoulder support',
    focus: 'Opposite hand to foot · return to support',
    illustration: 'animal-crab',
    setup:
      'Start in a low face-up crab position with both feet and hands supported. Keep the hip lift comfortable.',
    move: 'Lift one hand and the opposite foot toward each other. Touch only if the reach is comfortable, then return both supports to the floor. Reset before trying the other side.',
    easier:
      'Keep your hips seated and practise a small opposite hand-to-knee reach, or lift only one limb at a time.',
    watch:
      'Avoid arching into a high bridge or forcing the supporting shoulder. Skip this pattern if the hand position hurts.',
    source: crabToeTouchSource,
  },
  {
    id: 'sit-through',
    name: 'Controlled sit-through',
    level: 'Skill practice · shoulder support',
    focus: 'Shift · rotate · thread · return',
    illustration: 'animal-crab',
    setup:
      'Begin in a comfortable low hover. Make room beside you and choose a supported range you can control.',
    move: 'Shift onto one hand and the opposite foot. Lift the other hand, thread the free leg under your body, then reverse the movement. Keep it slow and low; no jumping.',
    easier:
      'Practise only the initial weight shift, with your knees down if needed. Get coaching before attempting the full rotation.',
    watch:
      'Do not force the supporting shoulder or twist sharply through your wrist. Return to support before changing sides.',
    source: animalCrawlSource,
  },
  {
    id: 'duck',
    name: 'Duck walk',
    level: 'Demanding · deep-squat tolerance',
    focus: 'Stay low · take small steps',
    illustration: 'animal-ape',
    setup:
      'Choose a squat depth your knees, hips and ankles tolerate. Keep your hands in front for balance; do not force a deeper position.',
    move: 'Shift onto one foot and step the other a little forward. Alternate while keeping a controlled low position. This version uses steps, not hops.',
    easier:
      'Use a shallower squat or practise a stationary squat-to-stand instead. Skip low travel if it is uncomfortable.',
    watch:
      'This is not a required beginner move. Avoid it with knee or back symptoms unless a qualified professional has cleared an appropriate version.',
    source: duckWalkSource,
  },
] satisfies {
  id: string;
  name: string;
  level: string;
  focus: string;
  illustration: AnimalIllustration;
  setup: string;
  move: string;
  easier: string;
  watch: string;
  source: { title: string; url: string };
}[];

export const animalMovementFlows: (HabitFlow & { sessionGuide: WorkoutGuide })[] = movements.map(
  movement => ({
    id: `workout-animal-${movement.id}`,
    title: movement.name,
    area: 'Fitness',
    pathId: 'workout',
    goal: 'Workout',
    description: `Explore ${movement.name.toLowerCase()}, one movement at a time.`,
    level: movement.level,
    rhythm: 'Optional practice within your existing routine',
    milestone: `Recall the setup, movement and easier option for ${movement.name.toLowerCase()}.`,
    review:
      'Was the movement comfortable and controlled? Choose a simpler version or qualified guidance if not.',
    guidance:
      'No universal checklist of animal movements is recommended for everyone. These are educational options, not a personal prescription, rehabilitation or a certified Animal Flow programme. Prepare gently and leave room for recovery. Skip positions that hurt your wrists, shoulders, knees or back. Stop for pain, dizziness or unusual symptoms. Seek qualified advice for injuries, pregnancy or health conditions. No compulsory repetitions, sets or daily targets.',
    sources: [movement.source],
    sessionGuide: {
      collection: animalMovementCategory,
      label: 'Movement guide',
      format: movement.focus,
      equipment: 'Clear, non-slip floor · optional mat',
      reviewedOn: '2026-10-24',
      cards: [
        {
          id: 'setup',
          title: 'Find your starting position',
          metric: 'Set up',
          body: movement.setup,
          illustration: movement.illustration,
        },
        {
          id: 'move',
          title: 'Remember the pattern',
          metric: movement.focus,
          body: movement.move,
          illustration: movement.illustration,
        },
        {
          id: 'scale',
          title: 'Make it easier',
          metric: 'Smaller is fine',
          body: movement.easier,
          illustration: movement.illustration,
        },
        {
          id: 'watch',
          title: 'What to watch for',
          metric: 'Control before speed',
          body: movement.watch,
          illustration: movement.illustration,
        },
      ],
    },
    steps: [
      {
        id: 'prepare',
        title: 'Review the starting position',
        cue: 'Explore the movement and choose a comfortable scale before practice.',
        duration: 'Before optional practice',
      },
      {
        id: 'practice',
        title: 'Explore with control',
        cue: 'Practise only if the position is comfortable; no target count is required.',
        duration: 'Within your capacity',
      },
      {
        id: 'recover',
        title: 'Check comfort and recovery',
        cue: 'Rest or choose an easier option rather than pushing through discomfort.',
        duration: 'After practice',
      },
    ],
  }),
);

export const animalMovementFlowId = 'workout-animal-movements';
/** One joinable flow; individual records stay editable and retain legacy saved links. */
export const animalMovementCollectionFlow: HabitFlow = {
  ...animalMovementFlows[0],
  id: animalMovementFlowId,
  title: animalMovementCategory,
  description:
    'Ten ground-based patterns, with documented context from Vidyut Jammwal, Da Rulk / Centr and Animal Flow creator Mike Fitch. Explore the movement, not a celebrity promise.',
  relatedFlowIds: animalMovementFlows.map(flow => flow.id),
  milestone: 'Explore the movement library and choose a comfortable variation.',
  sources: [
    ...animalMovementContext.connections.map(connection => connection.source),
    ...new Map(
      animalMovementFlows.flatMap(flow => flow.sources ?? []).map(source => [source.url, source]),
    ).values(),
  ],
  sessionGuide: {
    ...animalMovementFlows[0].sessionGuide,
    format: `${animalMovementFlows.length} movements`,
    attribution: {
      label: animalMovementContext.preview,
      url: animalMovementContext.connections[0].source.url,
    },
  },
};

export function movementBrowseLibrary(library: HabitFlow[]) {
  const parents = library.filter(
    flow =>
      flow.sessionGuide && (flow.relatedFlowIds?.length || fitnessCollectionChildren[flow.id]),
  );
  const children = new Set(
    parents.flatMap(flow => flow.relatedFlowIds ?? fitnessCollectionChildren[flow.id] ?? []),
  );
  const retired = new Set(['workout-12-3-30', 'workout-norwegian-4x4', 'workout-annie']);
  return library.filter(flow => !children.has(flow.id) && !retired.has(flow.id));
}
