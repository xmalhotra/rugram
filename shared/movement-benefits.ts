export type MovementBenefit = { title: string; description: string };
import { animalCrawlSource, duckWalkSource, crabToeTouchSource } from './animal-movement-context';
type Benefits = { items: MovementBenefit[]; sourceUrls: string[] };

const strength = 'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/';
const running = 'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/';
const exerciseLibrary = 'https://www.acefitness.org/resources/everyone/exercise-library/';
const animalFlow =
  'https://animalflow.com/wp-content/uploads/2022/10/AF-Manual-L1-A4-Eng-2021-Student-Download.pdf';
const make = (sourceUrls: string[], ...items: [string, string][]): Benefits => ({
  items: items.map(([title, description]) => ({ title, description })),
  sourceUrls,
});

// Training aims, not guaranteed outcomes, treatment claims or approval of the illustrated frames.
const benefits: Record<string, Benefits> = {
  'cindy-squat': make(
    [exerciseLibrary, strength],
    ['Leg strength', 'Works your thighs and buttocks using your body weight.'],
    [
      'Lower-body control',
      'Practises balance and controlled movement through your hips and knees.',
    ],
    [
      'Everyday movement',
      'Trains the leg muscles used for getting up from a chair and climbing stairs.',
    ],
  ),
  'cindy-push-up': make(
    ['https://www.nasm.org/resource-center/exercise-library/push-up'],
    ['Upper-body strength', 'Works your chest, shoulders and the backs of your arms.'],
    ['Core control', 'Trains your trunk to stay steady while your arms move.'],
    ['Pushing endurance', 'Builds practice supporting and pressing your body weight.'],
  ),
  'cindy-pull-up': make(
    [
      'https://www.nasm.org/resource-center/blog/training/chin-ups-vs-pull-ups-the-difference-the-benefits-muscles-worked',
    ],
    ['Pulling strength', 'Works your back and arms as you lift your body.'],
    ['Grip strength', 'Challenges your hands and forearms while holding the bar.'],
    ['Body control', 'Practises coordinating your shoulders, arms and trunk.'],
  ),
  'workout-animal-bear': make(
    [
      'https://www.acefitness.org/about-ace/press-room/in-the-news/8226/how-to-do-the-bear-crawl-exercise-to-boost-strength-and-coordination-shape/',
    ],
    ['Core endurance', 'Challenges your trunk to stay steady as you move.'],
    ['Shoulder endurance', 'Works your shoulders and arms while supporting your weight.'],
    ['Coordination', 'Practises moving an opposite hand and foot together.'],
  ),
  'workout-animal-crab': make(
    [exerciseLibrary],
    ['Arm support', 'Challenges your arms and shoulders to support your body.'],
    ['Hip and trunk control', 'Practises holding your hips up while shifting your weight.'],
    ['Coordination', 'Trains alternating hand-and-foot movement in a face-up position.'],
  ),
  'workout-animal-ape': make(
    [animalFlow],
    ['Sideways control', 'Practises moving your body from side to side.'],
    ['Hip mobility practice', 'Explores a comfortable squat range while changing position.'],
    ['Weight-transfer skill', 'Coordinates your hands and feet as your support changes.'],
  ),
  'workout-animal-frog': make(
    [animalFlow],
    ['Whole-body coordination', 'Links a squat, hand support and forward travel.'],
    ['Hip and ankle control', 'Practises changing position through a comfortable squat range.'],
    ['Supported movement', 'Challenges your arms and trunk during weight transfer.'],
  ),
  'workout-animal-inchworm': make(
    [exerciseLibrary],
    ['Core control', 'Practises keeping your trunk steady during a walkout.'],
    ['Upper-body support', 'Works your shoulders and arms in the supported position.'],
    ['Movement coordination', 'Links a hip hinge with controlled hand steps.'],
  ),
  'workout-animal-bird-dog': make(
    ['https://www.nasm.org/resource-center/exercise-library/bird-dog'],
    ['Core stability', 'Challenges your trunk to resist twisting as limbs move.'],
    ['Balance', 'Practises staying steady with fewer points of support.'],
    ['Coordination', 'Trains an opposite arm and leg to work together.'],
  ),
  'workout-animal-lateral-bear': make(
    [animalCrawlSource.url],
    [
      'Sideways coordination',
      'Practises moving hand and foot supports sideways without turning the body.',
    ],
    ['Trunk control', 'Challenges your trunk to stay steady during lateral weight shifts.'],
    ['Shoulder support', 'Works your arms and shoulders while the support points change.'],
  ),
  'workout-animal-crab-toe-touch': make(
    [crabToeTouchSource.url],
    [
      'Opposite-side coordination',
      'Practises bringing an opposite hand and foot toward one another.',
    ],
    ['Supported balance', 'Challenges your balance as you lift two points of support.'],
    [
      'Trunk and shoulder control',
      'Uses your supporting arm and trunk to keep the low crab position steady.',
    ],
  ),
  'workout-animal-sit-through': make(
    [animalCrawlSource.url],
    ['Rotational control', 'Practises turning your body while maintaining a supported position.'],
    ['Hip movement', 'Explores a controlled leg-threading range through the hips.'],
    [
      'Shoulder and core support',
      'Challenges your supporting arm and trunk as you change position.',
    ],
  ),
  'workout-animal-duck': make(
    [duckWalkSource.url],
    ['Low-position strength', 'Challenges your legs while maintaining a squat position.'],
    ['Hip and ankle range', 'Explores a squat range that is comfortable for your own joints.'],
    [
      'Weight-shift balance',
      'Practises transferring your weight between your feet during small steps.',
    ],
  ),
  'running-style-run-walk': make(
    [running],
    ['Aerobic fitness', 'Builds practice sustaining activity with walking breaks.'],
    ['Manageable progression', 'Lets you gradually increase the time you spend running.'],
    ['Effort awareness', 'Helps you practise alternating effort and recovery.'],
  ),
  'running-style-easy': make(
    [running],
    ['Stamina', 'Trains your ability to keep moving at a comfortable effort.'],
    ['Aerobic base', 'Adds steady cardiovascular training to your routine.'],
    ['Pacing', 'Practises holding back rather than making every run hard.'],
  ),
  'running-style-tempo': make(
    [running, strength],
    ['Sustained effort', 'Trains holding a controlled, harder running pace.'],
    ['Pace awareness', 'Practises finding a steady effort instead of sprinting.'],
    ['Running endurance', 'Challenges your ability to maintain pace over time.'],
  ),
  'running-style-intervals': make(
    [running],
    ['Faster running practice', 'Gives you short opportunities to work at a faster pace.'],
    ['Repeat-effort fitness', 'Alternates demanding efforts with easier recovery.'],
    ['Pace control', 'Practises changing speed deliberately.'],
  ),
  'running-style-hills': make(
    [running, strength],
    ['Leg effort', 'Challenges your legs against an uphill slope.'],
    ['Cardiovascular fitness', 'Adds an aerobic challenge without chasing flat-ground speed.'],
    ['Effort-based pacing', 'Practises adjusting your effort to changing terrain.'],
  ),
  ski: make(
    ['https://www.concept2.com/blog/skiergthe-complementary-workout'],
    ['Aerobic fitness', 'Trains sustained effort using the ski-pull pattern.'],
    ['Upper-body endurance', 'Works your arms, shoulders and trunk through repeated pulls.'],
    ['Coordination', 'Links arm movement with a controlled hip hinge.'],
  ),
  'sled-push': make(
    [strength],
    ['Leg drive', 'Challenges your legs to push against resistance.'],
    ['Trunk control', 'Trains holding a steady body position while applying force.'],
    ['Work capacity', 'Practises sustaining repeated loaded steps.'],
  ),
  'sled-pull': make(
    [strength],
    ['Pulling strength', 'Challenges your back and arms against resistance.'],
    ['Grip endurance', 'Works your hands and forearms through repeated rope pulls.'],
    ['Whole-body coordination', 'Links your pull with stable footwork and trunk control.'],
  ),
  burpee: make(
    [exerciseLibrary, strength],
    ['Full-body conditioning', 'Links floor movement, standing and jumping into repeated effort.'],
    ['Leg power practice', 'Challenges your legs to produce a controlled forward jump.'],
    ['Coordination', 'Practises changing between different body positions.'],
  ),
  row: make(
    ['https://www.concept2.com/training/articles/rowing-muscles-used'],
    ['Aerobic fitness', 'Trains your ability to sustain repeated rowing strokes.'],
    ['Whole-body endurance', 'Works your legs, trunk, back and arms together.'],
    ['Movement coordination', 'Practises linking the leg drive, hip movement and arm pull.'],
  ),
  carry: make(
    [strength],
    ['Grip strength', 'Challenges your hands and forearms to hold a load.'],
    ['Trunk stability', 'Practises staying upright while walking with resistance.'],
    ['Everyday carrying', 'Trains the loaded-walking pattern used to carry bags or equipment.'],
  ),
  lunge: make(
    [exerciseLibrary, strength],
    ['Leg strength', 'Works your thighs and buttocks one step at a time.'],
    ['Balance', 'Practises controlling your body in a split stance.'],
    ['Loaded movement', 'Challenges trunk control while stepping with resistance.'],
  ),
  'wall-ball': make(
    [exerciseLibrary, strength],
    ['Leg and shoulder endurance', 'Combines repeated squats with an overhead throw.'],
    ['Whole-body coordination', 'Links leg drive with releasing and receiving the ball.'],
    ['Work capacity', 'Practises repeating a full-body movement at a controlled effort.'],
  ),
};

/** Full and half HYROX use the same movement aims, not multiplied benefit claims. */
export function movementBenefits(flowId: string): Benefits | null {
  if (/^hyrox-(full|half)-run-[1-8]$/.test(flowId)) return benefits['running-style-easy'];
  const station = /^hyrox-(?:full|half)-(.+)$/.exec(flowId)?.[1];
  return benefits[flowId] ?? (station ? benefits[station] : null) ?? null;
}
