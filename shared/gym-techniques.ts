import type { HabitFlow } from './mobile';
import type { VisualFlowCard } from './visual-flow-types';

export const gymTechniquesFlowId = 'workout-enhance-gym-techniques';
export type GymTechnique = {
  id: string;
  title: string;
  focus: string;
  when: string;
  cue: string;
  caution: string;
  equipment: string;
  atlas: 'flow-gym-support' | 'flow-gym-focus';
  row: number;
  frames: [string, string, string, string, string];
  benefits: { title: string; description: string }[];
  sources: { title: string; url: string }[];
};
const source = (title: string, url: string) => ({ title, url });
const benefit = (title: string, description: string) => ({ title, description });
export const gymTechniques: GymTechnique[] = [
  {
    id: 'gym-technique-neutral-grip',
    title: 'Find your neutral grip',
    focus: 'Palms facing · wrists stacked',
    when: 'When you want to explore a different dumbbell pressing grip with a light load.',
    cue: 'Wrap your thumbs around the handles. Keep your palms facing each other and wrists aligned with your forearms. In the floor-press example, let the upper arms meet the mat gently before pressing again.',
    caution:
      'A neutral grip is an option, not a universally best grip or treatment for shoulder pain. Do not rotate a heavy load mid-repetition or bounce your arms off the floor.',
    equipment: 'Light dumbbells · firm floor mat',
    atlas: 'flow-gym-support',
    row: 0,
    frames: [
      'Wrap thumbs · palms face each other',
      'Press with wrists aligned to forearms',
      'Keep the dumbbells controlled above the chest',
      'Lower without changing the grip',
      'Upper arms meet the mat gently · no bounce',
    ],
    benefits: [
      benefit('Grip awareness', 'Makes hand orientation and wrist alignment easier to practise.'),
      benefit(
        'A pressing option',
        'Offers an alternative to a palms-forward dumbbell grip without promising a better result.',
      ),
      benefit(
        'Clear range reference',
        'The floor provides an endpoint for the upper arms in this example.',
      ),
    ],
    sources: [
      source(
        'Human Kinetics: neutral-grip dumbbell press',
        'https://us.humankinetics.com/blogs/excerpt/how-to-perform-a-dumbbell-bench-press',
      ),
      source(
        'PureGym: dumbbell press and floor-press variation',
        'https://www.puregym.com/exercises/chest/bench-press/dumbbell-bench-press/',
      ),
    ],
  },
  {
    id: 'gym-technique-back-support',
    title: 'Let the backrest support you',
    focus: 'Back contact · feet planted',
    when: 'For a seated dumbbell press on a suitable, securely locked adjustable bench.',
    cue: 'Set the bench before picking up the weights. Sit against the backrest with your feet firmly on the floor. Press a light load while keeping your torso controlled rather than leaning away from the pad.',
    caution:
      'The backrest does not make an excessive load safe or treat a back injury. Do not force a large arch, add loose pillows, or press through pain. Ask for help if the bench does not fit you.',
    equipment: 'Locked adjustable bench with backrest · light dumbbells',
    atlas: 'flow-gym-support',
    row: 1,
    frames: [
      'Settle against the backrest · feet planted',
      'Begin pressing without leaning forward',
      'Keep the torso supported at the top',
      'Lower with the same back contact',
      'Return to shoulder height · reset',
    ],
    benefits: [
      benefit(
        'A steady setup',
        'Provides an external support reference for a seated pressing position.',
      ),
      benefit(
        'Less torso movement',
        'Helps you notice leaning or compensating instead of focusing on the press.',
      ),
      benefit(
        'Repeatable positioning',
        'Makes it easier to return to the same supported start between repetitions.',
      ),
    ],
    sources: [
      source(
        'ACE: seated overhead press setup',
        'https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/',
      ),
    ],
  },
  {
    id: 'gym-technique-chest-supported-row',
    title: 'Support the chest, focus the row',
    focus: 'Chest stays down · elbows travel back',
    when: 'When practising a row with a suitable incline bench and light dumbbells.',
    cue: 'Lock the incline bench and support your chest on the pad, keeping both feet grounded. Row without lifting your chest away, then lower the dumbbells under control.',
    caution:
      'Choose an angle and load you can support comfortably. Do not jam your face into the bench, yank the weights, or use this as a workaround for unexplained back pain.',
    equipment: 'Stable incline bench · light dumbbells',
    atlas: 'flow-gym-support',
    row: 2,
    frames: [
      'Chest on the incline pad · feet grounded',
      'Start drawing elbows alongside the torso',
      'Keep chest contact as the weights reach the ribs',
      'Lower without swinging the torso',
      'Return to the supported hanging-arm position',
    ],
    benefits: [
      benefit(
        'A quieter torso',
        'The bench provides support while you practise the pulling action.',
      ),
      benefit('Pulling focus', 'Helps distinguish elbow movement from swinging the whole body.'),
      benefit('Controlled return', 'Gives a stable reference while lowering the weights.'),
    ],
    sources: [
      source(
        'PureGym: incline / chest-supported row',
        'https://www.puregym.com/exercises/back/rows/incline-row/',
      ),
    ],
  },
  {
    id: 'gym-technique-knee-cushion',
    title: 'Cushion the contact point',
    focus: 'Pad under the knee · firm footing',
    when: 'For a comfortable half-kneeling position on an otherwise hard floor.',
    cue: 'Place a firm mat or knee pad under the rear knee. Keep the front foot on firm, non-slip ground. Explore a small controlled shift without forcing a stretch.',
    caution:
      'Cushioning may improve contact comfort but cannot make a painful position appropriate. Do not put a soft cushion under a standing foot or stack unstable pads. Skip kneeling if it still hurts.',
    equipment: 'Firm exercise mat or knee pad · non-slip floor',
    atlas: 'flow-gym-support',
    row: 3,
    frames: [
      'Position a firm pad on the floor',
      'Rear knee on the pad · front foot on firm floor',
      'Explore a small comfortable shift',
      'Return without arching the lower back',
      'Finish in a stable half-kneeling position',
    ],
    benefits: [
      benefit('Contact comfort', 'Adds cushioning between the rear knee and a hard floor.'),
      benefit(
        'Steadier attention',
        'May make the setup less distracting when kneeling is otherwise comfortable.',
      ),
      benefit(
        'Clear support placement',
        'Keeps cushioning separate from the surface supporting the standing foot.',
      ),
    ],
    sources: [
      source(
        'ACE: half-kneeling on a cushioned mat',
        'https://www.acefitness.org/resources/everyone/blog/5681/3-stretches-for-opening-up-tight-hips/',
      ),
    ],
  },
  {
    id: 'gym-technique-squat-breath',
    title: 'Match your breath to the squat',
    focus: 'Breathe in on the way down · out as you rise',
    when: 'As a starting cue for bodyweight or light-to-moderate resistance exercise, not maximal lifting.',
    cue: 'A starting rhythm is to inhale during the controlled descent and exhale as you stand, keeping gentle trunk tension. Keep breathing comfortably rather than forcing the timing. Do not rush or force a breath hold at the bottom.',
    caution:
      'This is not a universal heavy-lifting breathing rule. Heavy-load bracing needs qualified instruction. If you have blood-pressure or heart concerns, get individual advice; stop for dizziness, pain or unusual breathlessness.',
    equipment: 'Clear floor space · bodyweight example',
    atlas: 'flow-gym-focus',
    row: 0,
    frames: [
      'Stand tall · breathe comfortably',
      'Inhale as you lower · keep gentle trunk tension',
      'Use a comfortable depth · do not force a breath hold',
      'Exhale as you rise',
      'Stand and reset the breath before another repetition',
    ],
    benefits: [
      benefit('A clear rhythm', 'Links a simple breathing cue to the lowering and rising phases.'),
      benefit(
        'Attention to effort',
        'Helps you notice whether you are rushing or holding your breath unintentionally.',
      ),
      benefit(
        'A repeatable reset',
        'Encourages a calm starting breath before the next repetition.',
      ),
    ],
    sources: [
      source(
        'NSCA: breathing, bracing and movement demands',
        'https://www.nsca.com/education/articles/kinetic-select/anatomical-core-neural-integration/',
      ),
    ],
  },
  {
    id: 'gym-technique-controlled-lowering',
    title: 'Own the lowering phase',
    focus: 'Quiet elbows · no swing',
    when: 'When learning a seated curl with a load you can move without momentum.',
    cue: 'Keep your elbows near your sides. Curl without leaning, then lower deliberately instead of dropping the dumbbells. Maintain the same wrist position throughout.',
    caution:
      'There is no mandatory slow-tempo count here. Reduce the weight if you cannot control the return. Very slow or overloaded negatives are not required and can add unnecessary fatigue.',
    equipment: 'Flat bench · light dumbbells',
    atlas: 'flow-gym-focus',
    row: 1,
    frames: [
      'Sit tall · elbows alongside the torso',
      'Curl without swinging the shoulders',
      'Pause only long enough to stay in control',
      'Lower deliberately · do not drop the weight',
      'Return to a comfortable near-straight elbow',
    ],
    benefits: [
      benefit(
        'Movement control',
        'Practises controlling the return rather than using a swing or sudden drop.',
      ),
      benefit(
        'A clearer effort cue',
        'Keeps attention on elbow movement instead of rocking the body.',
      ),
      benefit(
        'Useful load feedback',
        'Makes it easier to notice when the chosen weight is too demanding to control.',
      ),
    ],
    sources: [
      source(
        'ACE: seated biceps curl phases and breathing',
        'https://www.acefitness.org/resources/everyone/exercise-library/44/seated-biceps-curl/',
      ),
    ],
  },
  {
    id: 'gym-technique-hip-thrust-pad',
    title: 'Pad the hip-thrust bar',
    focus: 'Secure pad · comfortable contact',
    when: 'For a suitably coached hip-thrust setup where a purpose-made pad can improve bar-contact comfort.',
    cue: 'Use a stable bench and a very light training bar. Secure a suitable pad at the bar’s hip-contact area, keep the bar steady with your hands, and practise a controlled lift without overextending your lower back.',
    caution:
      'A pad does not justify more load or hide persistent pain. Do not place the bar over the abdomen, use a sliding bench, or improvise a loose stack of cushioning. Ask gym staff to check the setup first.',
    equipment: 'Secured bench · suitable bar pad · very light training bar',
    atlas: 'flow-gym-focus',
    row: 2,
    frames: [
      'Check the stable bench and secured hip pad',
      'Lift with hands keeping the padded bar steady',
      'Reach hip extension without arching past it',
      'Lower with the pad staying in place',
      'Return low under control · reassess comfort',
    ],
    benefits: [
      benefit('Contact comfort', 'Distributes direct bar contact across the padded area.'),
      benefit(
        'Setup awareness',
        'Highlights the importance of a secure pad and stable bench before adding load.',
      ),
      benefit(
        'Less distraction',
        'May help you focus on the movement when bar contact is otherwise uncomfortable.',
      ),
    ],
    sources: [
      source(
        'PureGym: barbell hip thrust and bar padding',
        'https://www.puregym.com/exercises/glutes/hip-thrusts/barbell-hip-thrust/',
      ),
    ],
  },
  {
    id: 'gym-technique-box-reference',
    title: 'Use a box as a depth reference',
    focus: 'Light touch · no collapse or bounce',
    when: 'For a bodyweight squat with a stable box at a height that suits your current controlled range.',
    cue: 'Place the box behind you before starting. Lower slowly, touch it lightly while staying engaged, and stand without rocking back or bouncing off the surface.',
    caution:
      'A lower box is not automatically better. Do not drop onto it, use an unstable object or force a painful depth. This is a reference drill, not an instruction to add a barbell.',
    equipment: 'Stable gym box · non-slip floor · bodyweight',
    atlas: 'flow-gym-focus',
    row: 3,
    frames: [
      'Check the box position and suitable height',
      'Lower with feet grounded',
      'Touch lightly · stay engaged',
      'Stand without rocking or bouncing',
      'Return tall with the same controlled stance',
    ],
    benefits: [
      benefit(
        'A visible target',
        'Gives a repeatable reference for a squat depth you can currently control.',
      ),
      benefit(
        'Descent awareness',
        'Makes a controlled approach to the bottom position easier to practise.',
      ),
      benefit(
        'Consistent setup',
        'Helps you compare repetitions without chasing a deeper position every time.',
      ),
    ],
    sources: [
      source(
        'Prehab: box-squat demonstration and cautions',
        'https://theprehabguys.com/vimeo-video/box-squat-2/',
      ),
    ],
  },
];

export const gymTechniqueMedia = Object.fromEntries(
  gymTechniques.map(card => [card.id, { atlas: card.atlas, row: card.row }]),
);
export const gymTechnique = (id: string) => gymTechniques.find(card => card.id === id);
const guidance =
  'Practical technique education, not secret hacks, a diagnosis, rehabilitation or a personalised training plan. Try one cue with a comfortable load and leave room for recovery. Supports and padding do not guarantee safety or treat pain. Stop for pain, dizziness or unusual symptoms. Ask a qualified coach to check unfamiliar setups and seek individual advice for health conditions.';

export const gymTechniqueCards: HabitFlow[] = gymTechniques.map(card => ({
  id: card.id,
  title: card.title,
  area: 'Fitness',
  pathId: 'workout',
  goal: 'Workout',
  description: card.focus,
  level: 'Technique practice · choose a suitable load',
  rhythm: 'Optional practice within an appropriate planned workout',
  milestone: 'Identify one setup cue you can use comfortably and consistently.',
  review:
    'Did the cue improve attention or comfort? Keep it only if it suits the movement and you.',
  guidance,
  sources: card.sources,
  sessionGuide: {
    collection: 'Enhance gym techniques',
    label: 'Technique practice',
    format: card.focus,
    equipment: card.equipment,
    reviewedOn: '2026-10-24',
    cards: [
      {
        id: 'technique',
        title: 'Try the cue',
        metric: card.focus,
        body: card.cue,
        illustration: 'workout',
      },
      {
        id: 'watch',
        title: 'Know the limit',
        metric: 'Comfort and control first',
        body: card.caution,
        illustration: 'workout',
      },
    ],
  },
  steps: [
    {
      id: 'prepare',
      title: 'Check the setup and limits',
      cue: card.when,
      duration: 'Before optional practice',
    },
    {
      id: 'practice',
      title: 'Explore one appropriate technique cue',
      cue: card.cue,
      duration: 'Optional technique practice',
    },
    {
      id: 'review',
      title: 'Review comfort and control',
      cue: 'Stop or ask for guidance if the position or load does not suit you.',
      duration: 'After practice',
    },
  ],
}));

export const gymTechniquesFlow: HabitFlow = {
  id: gymTechniquesFlowId,
  title: 'Enhance gym techniques',
  area: 'Fitness',
  pathId: 'workout',
  goal: 'Workout',
  level: 'Technique education · individual suitability varies',
  rhythm: 'Choose one cue within your planned session',
  milestone: 'Find a useful technique cue without adding unnecessary load or complexity.',
  review: 'Keep useful cues and leave out those that do not fit your training.',
  description:
    'Small setup changes and attention cues for grip, support, cushioning, breathing and controlled movement. Choose one relevant technique at a time.',
  guidance,
  relatedFlowIds: gymTechniqueCards.map(card => card.id),
  sources: [
    ...new Map(gymTechniques.flatMap(card => card.sources).map(item => [item.url, item])).values(),
  ],
  sessionGuide: {
    collection: 'Enhance gym techniques',
    label: 'Practical technique cues',
    format: `${gymTechniqueCards.length} technique cards`,
    equipment: 'Varies by card · no purchase required',
    reviewedOn: '2026-10-24',
    cards: [
      {
        id: 'choose',
        title: 'Choose one useful cue',
        metric: 'Focus, not more load',
        body: 'Preview a technique that fits your planned exercise, check its limits, and practise with a comfortable load. Not every card belongs in every workout.',
        illustration: 'workout',
      },
    ],
  },
  steps: [
    {
      id: 'choose',
      title: 'Choose one cue for your planned session',
      cue: 'Open a relevant card and check the setup.',
      duration: 'Before optional practice',
    },
    {
      id: 'practice',
      title: 'Practise with control',
      cue: 'Use a comfortable load and stop if the cue does not suit you.',
      duration: 'Within your capacity',
    },
    {
      id: 'review',
      title: 'Keep only cues that suit you',
      cue: 'Review comfort, control and recovery before using the cue again.',
      duration: 'After practice',
    },
  ],
};

/** Release-owned presentation survives CMS edits without letting editors inject media paths. */
export function withGymTechniqueVisual(flow: HabitFlow): HabitFlow {
  const card = gymTechnique(flow.id);
  if (!card) return flow;
  const visualCard: VisualFlowCard = {
    media: { atlas: card.atlas, row: card.row },
    frames: card.frames,
    benefits: card.benefits,
    sourceFlowId: gymTechniquesFlowId,
    sourceStepIds: ['practice'],
    illustration: 'movement',
  };
  return { ...flow, visualCard };
}
