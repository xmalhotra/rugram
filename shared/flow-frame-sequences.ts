import { gymTechniques } from './gym-techniques';
import { nutritionIdeas, type NutritionAtlas } from './nutrition-ideas';
/** Release-owned image storyboards. A row has five distinct photographed stages.
 * These are generated illustrations, never a coach/clinical approval. */
export type FlowAtlas =
  | NutritionAtlas
  | 'flow-gym-support'
  | 'flow-gym-focus'
  | 'flow-sleep'
  | 'flow-meals'
  | 'flow-daily'
  | 'flow-fitness'
  | 'flow-supports'
  | 'flow-animal'
  | 'flow-animal-extra';
type Five = [string, string, string, string, string];
export type FlowFrameSequence = {
  atlas: FlowAtlas;
  row: number;
  title: string;
  frames: Five;
  benefit: string;
  scene: string;
};
const sequence = (
  atlas: FlowAtlas,
  row: number,
  title: string,
  frames: Five,
  benefit: string,
  scene: string,
): FlowFrameSequence => ({ atlas, row, title, frames, benefit, scene });
export const flowFrameSequences = {
  bear: sequence(
    'flow-animal',
    0,
    'Bear crawl',
    [
      'Begin in a stable hover',
      'Advance one hand and the opposite foot',
      'Settle into support',
      'Advance the other opposite pair',
      'Finish in a stable hover',
    ],
    'Make the opposite-hand and opposite-foot travel pattern visible.',
    'Fixed full-body side view on mat: bear-crawl hover with knees just clear of floor, right hand and left foot advance a small step, stable support, left hand and right foot advance, stable hover further forward. Hips steady, no plank substitutions.',
  ),
  crab: sequence(
    'flow-animal',
    1,
    'Crab walk',
    [
      'Set up with supported hands and feet',
      'Begin one small step',
      'Settle into support',
      'Take the alternating small step',
      'Finish with hands and feet supported',
    ],
    'Show the supported face-up travel pattern.',
    'Fixed full-body three-quarter side view on mat: low supported face-up crab position, one hand and opposite foot take small step, supported low reset, alternate pair takes small step, supported low finish further along. Hips comfortably lifted, no deep shoulder stretch.',
  ),
  ape: sequence(
    'flow-animal',
    2,
    'Lateral ape',
    [
      'Begin in a comfortable squat',
      'Place hands to one side',
      'Shift support toward the hands',
      'Move the feet sideways a small distance',
      'Return to the supported squat',
    ],
    'Show the order of a small sideways transfer.',
    'Fixed full-body front three-quarter camera: comfortable supported low squat, hands placed to one side, small controlled shift to hands, feet move sideways following hands, squat reset at new location. No acrobatic jump.',
  ),
  frog: sequence(
    'flow-animal',
    3,
    'Frog travel',
    [
      'Begin in a comfortable squat',
      'Place hands a short distance ahead',
      'Shift support comfortably',
      'Let the feet follow a small distance',
      'Reset in a supported squat',
    ],
    'Show hands leading before the feet follow.',
    'Fixed full-body side view: comfortable squat, hands reach a short distance ahead onto mat, controlled weight transfer to hands, feet follow a small distance, squat reset forward. No high jump or forced deep squat.',
  ),
  inchworm: sequence(
    'flow-animal',
    4,
    'Hinge & hand walkout',
    [
      'Hinge to a comfortable hand placement',
      'Walk hands away a little',
      'Reach a supported plank if suitable',
      'Walk hands back',
      'Return to the hinge and stand comfortably',
    ],
    'Show the walkout and return as one complete sequence.',
    'Fixed full-body side view: standing hinge with hands toward floor and knees softened, hands walk out, controlled supported plank, hands walk back toward feet, returns to standing hinge then upright. No push-up, no abrupt camera change, whole person always visible.',
  ),
  lateralBear: sequence(
    'flow-animal-extra',
    0,
    'Lateral bear crawl',
    [
      'Find a steady hover',
      'Step the leading supports sideways',
      'Bring the trailing supports across',
      'Take another small side step',
      'Settle in a hover at the new position',
    ],
    'Explore sideways coordination and shoulder-supported trunk control.',
    'Fixed front three-quarter camera. A bent-knee bear hover travels from left to right over five stages; knees stay low, shoulders and hips level, hands never cross. Full body stays in the cell.',
  ),
  crabToeTouch: sequence(
    'flow-animal-extra',
    1,
    'Crab toe-touch',
    [
      'Begin in a low supported crab',
      'Lift an opposite hand and foot',
      'Touch comfortably without a high bridge',
      'Lower the hand and foot with control',
      'Return to four-point support',
    ],
    'Show an opposite hand-to-foot reach and return in a face-up position.',
    'Fixed three-quarter side camera: low face-up crab, right hand and left foot lift, right fingertips meet left toes while left palm and right foot stay supported, lower, low crab reset. No high bridge or forced reach.',
  ),
  sitThrough: sequence(
    'flow-animal-extra',
    2,
    'Controlled sit-through',
    [
      'Begin in a low hover',
      'Shift to one supporting hand and foot',
      'Rotate and thread the free leg',
      'Reach a low supported sit-through',
      'Return to the starting hover',
    ],
    'Show a deliberate support change, rotation and return.',
    'Fixed front three-quarter camera. From four-point hover, transfer to left hand and right foot, lift right hand, thread left leg under toward right, extend it low, then return. No jumps or forced backbend.',
  ),
  duckWalk: sequence(
    'flow-animal-extra',
    3,
    'Duck walk',
    [
      'Choose a comfortable squat',
      'Shift weight and take a short step',
      'Settle while staying low',
      'Step forward with the other foot',
      'Finish in a balanced low position',
    ],
    'Show low stepping rather than hopping.',
    'Fixed side three-quarter camera. Comfortable squat with hands in front; step alternating feet slowly forward across five stages. Stay low, no hopping, no hands on floor, no forced squat depth.',
  ),
  evening: sequence(
    'flow-sleep',
    0,
    'Prepare tomorrow',
    [
      'Choose a small evening cue',
      'Gather tomorrow’s essentials',
      'Set out something you need',
      'Put the essentials together',
      'Leave the space ready',
    ],
    'Make one practical preparation before the next day begins.',
    'Person by bedside gathers keys, folds a shirt, puts essentials into a bag, places it ready, leaves a tidy space.',
  ),
  phone: sequence(
    'flow-sleep',
    1,
    'Put the phone aside',
    [
      'Finish what you need on the phone',
      'Quiet optional notifications',
      'Put the phone away from your resting space',
      'Step away from the screen',
      'Choose your quieter activity',
    ],
    'Create space for an evening activity that does not involve more scrolling.',
    'Person seated holding phone, silences it, places it on shelf away from bed, walks away empty-handed, sits calmly without phone.',
  ),
  reading: sequence(
    'flow-sleep',
    2,
    'A calmer activity',
    [
      'Choose a book you enjoy',
      'Find a comfortable place',
      'Open the book',
      'Read at your own pace',
      'Close it when you are ready',
    ],
    'Offer a simple quiet activity to try as part of your own wind-down.',
    'Person selects physical book, sits in armchair, opens book, reads under warm lamp, closes book and rests hands.',
  ),
  sleepNote: sequence(
    'flow-sleep',
    3,
    'Notice what helped',
    [
      'Pause the next morning',
      'Open a notebook if useful',
      'Think about the evening',
      'Note one thing that suited you',
      'Keep or adapt the idea',
    ],
    'Help recognise a repeatable cue without chasing a sleep score.',
    'Morning daylight at breakfast table: person sits with notebook, opens it, pauses thoughtfully, writes a short note, closes notebook.',
  ),
  plant: sequence(
    'flow-meals',
    0,
    'Chickpea & tofu bowl',
    [
      'Choose suitable ready-to-eat ingredients',
      'Combine cooked chickpeas and prepared tofu',
      'Add washed, chopped vegetables',
      'Season to your taste',
      'Serve when it fits your meal',
    ],
    'Make a familiar plant-based meal idea easier to recognise and repeat.',
    'Cooked chickpeas, ready-to-eat tofu and washed cucumber and tomato: person gathers ingredients, combines chickpeas and tofu, adds vegetables, adds lemon, serves completed bowl.',
  ),
  dairy: sequence(
    'flow-meals',
    1,
    'Curd & chickpea bowl',
    [
      'Choose suitable fresh ingredients',
      'Place cooked chickpeas in a bowl',
      'Add washed, chopped cucumber',
      'Add curd and season to taste',
      'Serve as part of your meal',
    ],
    'Show one familiar vegetarian-with-dairy meal option.',
    'Plain curd, cooked chickpeas and washed cucumber: person gathers ingredients, puts chickpeas in bowl, adds cucumber, spoons in curd and seasoning, serves completed mixed bowl.',
  ),
  eggs: sequence(
    'flow-meals',
    2,
    'Egg & chickpea bowl',
    [
      'Choose fully cooked eggs and cooked chickpeas',
      'Add chickpeas to your bowl',
      'Add washed, chopped vegetables',
      'Add the fully cooked eggs',
      'Season and serve',
    ],
    'Make an everyday egg-based food choice concrete rather than abstract.',
    'Peeled fully hard-boiled eggs, cooked chickpeas and washed vegetables: gather ingredients, add chickpeas, add vegetables, place halved cooked eggs, serve with lemon.',
  ),
  meal: sequence(
    'flow-meals',
    3,
    'Build a familiar meal',
    [
      'Choose a meal that fits your day',
      'Include a familiar starchy food',
      'Add vegetables you enjoy',
      'Include a suitable protein food',
      'Sit down with your chosen meal',
    ],
    'Turn a general food-choice idea into a practical meal you can adapt.',
    'Person picks plate, adds cooked rice, adds cooked vegetables, adds cooked lentils or beans, sits with completed varied meal.',
  ),
  snack: sequence(
    'flow-meals',
    4,
    'A familiar food option',
    [
      'Check what is familiar and suitable',
      'Choose an option you tolerate',
      'Prepare it simply',
      'Make it available for your planned break',
      'Use it if it fits your session plan',
    ],
    'Make a familiar food option available without requiring a supplement purchase.',
    'Person considers banana and toast on kitchen counter, chooses banana, peels it, places banana and toast on small plate, sits with snack ready.',
  ),
  water: sequence(
    'flow-meals',
    5,
    'Make water accessible',
    [
      'Choose a clean container',
      'Fill it with safe drinking water',
      'Close it if you are taking it along',
      'Put it within reach',
      'Drink comfortably when appropriate',
    ],
    'Make access to drinking water practical without imposing an intake target.',
    'Person picks clean drinking bottle, fills from safe drinking-water jug, closes lid, places beside bag, takes comfortable sip. No measured amounts.',
  ),
  kit: sequence(
    'flow-daily',
    0,
    'Prepare your kit',
    [
      'Choose the kit you already use',
      'Put clothing together',
      'Pack what you need',
      'Place shoes beside the bag',
      'Leave the kit ready',
    ],
    'Reduce last-minute preparation for an outing you already intend to do.',
    'Person by bench with ordinary workout clothing, folds shirt, places clothing in bag, puts shoes next to bag, closes bag by doorway.',
  ),
  plan: sequence(
    'flow-daily',
    1,
    'Choose your next step',
    [
      'Look at the time available',
      'Open your plan',
      'Choose one manageable action',
      'Make a brief reminder',
      'Leave the plan ready',
    ],
    'Make the next action visible and manageable.',
    'Person at desk looks at planner, opens it, selects one blank task panel, marks plan with pen, puts pen down with plan ready. No readable text.',
  ),
  note: sequence(
    'flow-daily',
    2,
    'Keep a useful note',
    [
      'Pause after the activity',
      'Open a note if useful',
      'Think about what fitted',
      'Record one useful observation',
      'Keep or change your next plan',
    ],
    'Keep a small record of what was practical for you.',
    'Person sits at table with notebook, opens notebook, pauses to reflect, writes one note, closes notebook and rests hands.',
  ),
  walk: sequence(
    'flow-daily',
    3,
    'A comfortable walking break',
    [
      'Choose a suitable place',
      'Get ready at the doorway',
      'Step out when conditions suit',
      'Walk at a comfortable effort',
      'Return and notice how it felt',
    ],
    'Offer an everyday movement break that can fit an existing routine.',
    'Person by door with comfortable shoes, stands ready, steps outside, walks comfortably on safe garden path, returns to doorway. No phone while walking.',
  ),
  deadBug: sequence(
    'flow-fitness',
    0,
    'Dead bug',
    [
      'Set up on your back',
      'Begin a small opposite-limb reach',
      'Stay within a controlled range',
      'Reverse the reach slowly',
      'Return to the starting position',
    ],
    'Practise trunk control while moving opposite limbs.',
    'Fixed wide side view whole person on mat: supine with arms up and bent hips and knees, slowly lowers right arm and opposite heel a little, controlled comfortable reach, reverses reach, returns to start. Back stays supported.',
  ),
  birdDog: sequence(
    'flow-fitness',
    1,
    'Bird dog',
    [
      'Begin on hands and knees',
      'Start an opposite-arm-and-leg reach',
      'Keep the reach controlled',
      'Return slowly',
      'Reset on hands and knees',
    ],
    'Practise a controlled opposite-limb reach with a steady trunk.',
    'Fixed wide side view: hands and knees on mat, begins extending right arm and left leg, small controlled opposite-limb reach with back level, returns slowly, all fours again.',
  ),
  kneePlank: sequence(
    'flow-fitness',
    2,
    'Forearm plank from knees',
    [
      'Place forearms and knees comfortably',
      'Move into a supported line',
      'Hold only while comfortable',
      'Ease out of the position',
      'Rest and reset',
    ],
    'Explore a supported trunk-control position.',
    'Fixed wide side view: on knees and forearms, shifts into comfortable knee-supported forearm plank with shoulder-to-knee line, holds naturally, eases back, rests with knees supported.',
  ),
  rope: sequence(
    'flow-fitness',
    3,
    'A controlled rope jump',
    [
      'Stand with a clear space',
      'Begin a small jump',
      'Let the rope pass beneath',
      'Land with control',
      'Reset before repeating',
    ],
    'Make the rope-jump sequence visible without chasing speed.',
    'Fixed wide full-body view: holds rope handles with rope behind, gentle small takeoff, single-under rope passes beneath, soft controlled landing, resets standing. Not double-unders.',
  ),
  sitUp: sequence(
    'flow-fitness',
    4,
    'A comfortable sit-up variation',
    [
      'Set up with knees bent',
      'Begin a small controlled rise',
      'Use only a comfortable range',
      'Lower slowly',
      'Return to rest',
    ],
    'Show the order of a controlled trunk movement, not a compulsory range.',
    'Fixed wide side view: supine knees bent feet planted arms across chest, raises torso a little, comfortable partial sit-up, lowers slowly, returns resting. Never pulls on neck.',
  ),
  treadmill: sequence(
    'flow-fitness',
    5,
    'A manageable treadmill walk',
    [
      'Set up before starting the belt',
      'Use the safety clip',
      'Begin at a manageable setting',
      'Walk comfortably',
      'Slow and stop safely',
    ],
    'Make the setup and safe stopping order visible.',
    'Fixed wide side view: person on stationary treadmill, attaches safety clip, starts easy setting, walks comfortably, slows and stands only after belt has stopped.',
  ),
  coach: sequence(
    'flow-fitness',
    6,
    'Review with your coach',
    [
      'Explain where you are starting',
      'Discuss what suits today',
      'Watch an appropriate option',
      'Try with suitable guidance',
      'Review before adding more',
    ],
    'Make communication and an appropriate scale part of preparing a session.',
    'Generic adult person faces generic coach by clear mat, explains with gesture, listens, coach shows small comfortable stance, person tries while coach watches, both pause to review. No weights or race claims.',
  ),
  belt: sequence(
    'flow-supports',
    0,
    'Check a lifting belt',
    [
      'Look at the belt',
      'Position it around your waist',
      'Fasten comfortably',
      'Check fit without lifting',
      'Remove it when finished',
    ],
    'Help recognise the fitting sequence for an optional support.',
    'Person holds loose lifting belt, places around waist, fastens comfortably, checks fit standing without lifting, unfastens and removes.',
  ),
  wraps: sequence(
    'flow-supports',
    1,
    'Check wrist wraps',
    [
      'Look at the wrap',
      'Position the fabric',
      'Wrap without excessive tightness',
      'Check comfort and movement',
      'Remove the wrap',
    ],
    'Make fit and comfort visible before considering loaded use.',
    'Person shows fabric wrist wrap, positions on wrist, wraps fabric gently, fastens and checks gentle movement, removes. No excessive tightness or load.',
  ),
  straps: sequence(
    'flow-supports',
    2,
    'Check lifting straps',
    [
      'Look at the strap',
      'Place the loop at your wrist',
      'Arrange it around an unloaded support',
      'Check a light grip',
      'Release and remove',
    ],
    'Show the basic setup order without implying a need for straps.',
    'Person holds fabric straps, places wrist loop, loops loose tail around unloaded dowel resting on support, checks light grip, releases and removes. No hanging or lifting load.',
  ),
  sleeves: sequence(
    'flow-supports',
    3,
    'Check knee sleeves',
    [
      'Choose a suitable sleeve',
      'Slide it over the lower leg',
      'Position it comfortably',
      'Check comfortable movement',
      'Sit and remove it',
    ],
    'Keep a fitting check separate from injury-prevention promises.',
    'Person seated with knee sleeve, slides over lower leg, positions at knee comfortably, stands gently to check fit, sits and removes. No extreme compression or weights.',
  ),
} satisfies Record<string, FlowFrameSequence>;
export type FlowSequenceId = keyof typeof flowFrameSequences;

export const animalFrameMedia = {
  'workout-animal-bear': { atlas: 'flow-animal' as const, row: 0 },
  'workout-animal-crab': { atlas: 'flow-animal' as const, row: 1 },
  'workout-animal-ape': { atlas: 'flow-animal' as const, row: 2 },
  'workout-animal-frog': { atlas: 'flow-animal' as const, row: 3 },
  'workout-animal-inchworm': { atlas: 'flow-animal' as const, row: 4 },
  'workout-animal-bird-dog': { atlas: 'flow-fitness' as const, row: 1 },
  'workout-animal-lateral-bear': { atlas: 'flow-animal-extra' as const, row: 0 },
  'workout-animal-crab-toe-touch': { atlas: 'flow-animal-extra' as const, row: 1 },
  'workout-animal-sit-through': { atlas: 'flow-animal-extra' as const, row: 2 },
  'workout-animal-duck': { atlas: 'flow-animal-extra' as const, row: 3 },
};

export function flowAtlasPrompt(atlas: FlowAtlas, gender: 'male' | 'female') {
  const rows = (
    atlas.startsWith('flow-gym-')
      ? gymTechniques
          .filter(card => card.atlas === atlas)
          .map(card => ({
            row: card.row,
            scene: `${card.title}. ${card.cue} Equipment: ${card.equipment}. Five stages in order: ${card.frames.join('; ')}.`,
          }))
      : atlas.startsWith('nutrition-')
        ? nutritionIdeas
            .filter(item => item.atlas === atlas)
            .map(item => ({
              row: item.row,
              scene: `${item.title}. One item only, not a recipe. Five visual moments: ${item.frames.join('; ')}.`,
            }))
        : Object.values(flowFrameSequences).filter(sequence => sequence.atlas === atlas)
  ).sort((a, b) => a.row - b.row);
  return `Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by ${rows.length} rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:${rows.length}. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult ${gender === 'male' ? 'man with short dark hair' : 'woman with tied-back dark hair'}, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.\n${rows.map((sequence, index) => `Row ${index + 1}: ${sequence.scene}`).join('\n')}`;
}
