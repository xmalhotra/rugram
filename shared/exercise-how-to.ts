import { exercise } from './exercises';

export type ExerciseHowTo = {
  exerciseId: string;
  steps: string[];
  feel: string;
  mistake: string;
  note?: string;
  /** A real person doing the move. Only YouTube links; picked for the right move, a reputable coach or clinic, and checked live. Left empty when no good match, so the button searches YouTube. */
  videoUrl?: string;
  status: 'draft' | 'live';
};

/** Shown with every how-to page. The words live here so a change does not need an app release. */
export const howToGeneral = 'General guidance, not medical advice. Stop if something hurts.';

const seed: ExerciseHowTo[] = [
  {
    exerciseId: 'push-up',
    steps: [
      'Hands under your shoulders, body straight from head to heels.',
      'Bend your elbows and lower your chest close to the floor.',
      'Push back up until your arms are straight.',
    ],
    feel: 'Chest and the back of your arms.',
    mistake: 'Letting your hips sag or stick up.',
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    status: 'live',
  },
  {
    exerciseId: 'v-taps',
    steps: [
      'Start in a push-up position, then walk your feet in so your hips are high.',
      'Keep your arms straight and your head between them.',
      'Tap one hand to the opposite shoulder, and put it back.',
      'Switch sides. One tap is one rep.',
    ],
    feel: 'Shoulders and the back of your arms.',
    mistake: 'Letting your hips sway side to side.',
    videoUrl: 'https://www.youtube.com/watch?v=dvbkMf09PD0',
    status: 'live',
  },
  {
    exerciseId: 'superman-hold',
    steps: [
      'Lie face down, arms stretched out in front.',
      'Lift your chest, arms and thighs off the floor together.',
      'Look at the floor and hold still. Keep breathing.',
    ],
    feel: 'Lower back and glutes.',
    mistake: 'Craning your neck to look forward.',
    videoUrl: 'https://www.youtube.com/watch?v=uexOGyxLr7E',
    status: 'live',
  },
  {
    exerciseId: 'seated-leg-lift',
    steps: [
      'Sit with your legs straight, hands on the floor beside your hips.',
      'Lean back slightly and keep your chest tall.',
      'Lift both straight legs off the floor, then lower them with control.',
    ],
    feel: 'Front of your hips and lower stomach.',
    mistake: 'Bending your knees to get higher.',
    videoUrl: 'https://www.youtube.com/watch?v=ALj1_7gQLmk',
    status: 'live',
  },
  {
    exerciseId: 'straight-arm-plank',
    steps: [
      'Hands under your shoulders, arms straight.',
      'Step your feet back so your body is one straight line.',
      'Squeeze your stomach and glutes, and hold.',
    ],
    feel: 'Stomach and shoulders.',
    mistake: 'Letting your hips drop.',
    videoUrl: 'https://www.youtube.com/watch?v=MDxfAuBbHHA',
    status: 'live',
  },
  {
    exerciseId: 'explosive-push-up',
    steps: [
      'Start like a push-up, and lower your chest with control.',
      'Push hard so your hands leave the floor.',
      'Land softly with bent elbows, and go straight into the next one.',
    ],
    feel: 'Chest and the back of your arms.',
    mistake: 'Landing with locked elbows.',
    note: 'Master normal push-ups first. Stop if your wrists hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=0iGb_qLtTLU',
    status: 'live',
  },
  {
    exerciseId: 'pike-push-up',
    steps: [
      'Make an upside-down V, with hips high and arms straight.',
      'Bend your elbows and lower the top of your head toward the floor.',
      'Push back up until your arms are straight.',
    ],
    feel: 'Shoulders and the back of your arms.',
    mistake: 'Dropping your hips into a push-up shape.',
    videoUrl: 'https://www.youtube.com/watch?v=2b5t0Cu2nQI',
    status: 'live',
  },
  {
    exerciseId: 'no-bar-back-row',
    steps: [
      'Lie on your back with your elbows bent at your sides.',
      'Drive your elbows into the floor to lift your chest.',
      'Squeeze your shoulder blades together, then lower slowly.',
    ],
    feel: 'Upper back.',
    mistake: 'Pushing with your hands in place of your elbows.',
    status: 'live',
  },
  {
    exerciseId: 'wall-handstand',
    steps: [
      'Hands on the floor, facing away from the wall, feet against it.',
      'Walk your feet up the wall as you walk your hands in.',
      'Stop when your chest is close to the wall. Arms straight, body straight.',
      'To come down, walk your hands away and your feet down, slowly.',
    ],
    feel: 'Shoulders and stomach.',
    mistake: 'Arching your lower back.',
    note: "Keep the floor around you clear, and go only as high as you control. Don't do this with wrist, shoulder or blood pressure problems without checking with a doctor.",
    videoUrl: 'https://www.youtube.com/watch?v=fj6lKSg5bSM',
    status: 'live',
  },
  {
    exerciseId: 'l-sit',
    steps: [
      'Sit with your legs straight, hands flat beside your hips.',
      'Press down hard so your shoulders lift away from your ears.',
      'Lift your hips and straight legs off the floor, and hold.',
      'Start with one leg or bent knees if you need to.',
    ],
    feel: 'Front of your hips, stomach and shoulders.',
    mistake: 'Shrugging your shoulders up.',
    note: 'Stop if your wrists hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=j-w-eS2i2cE',
    status: 'live',
  },
  {
    exerciseId: 'forearm-plank',
    steps: [
      'Elbows under your shoulders, forearms on the floor.',
      'Step your feet back so your body is one straight line.',
      'Squeeze your stomach and glutes, and hold.',
    ],
    feel: 'Stomach.',
    mistake: 'Letting your hips drop or holding your breath.',
    videoUrl: 'https://www.youtube.com/watch?v=gSDNblPRh1U',
    status: 'live',
  },
  {
    exerciseId: 'single-arm-lat-pulldown',
    steps: [
      'Set the thigh pad snug so it holds you in the seat.',
      'Grip one handle and pull it down toward your shoulder.',
      'Pause, then let your arm rise until it is nearly straight.',
    ],
    feel: 'Sides of your back.',
    mistake: 'Leaning far back to pull the weight down.',
    videoUrl: 'https://www.youtube.com/watch?v=FcUwVwrSrtc',
    status: 'live',
  },
  {
    exerciseId: 'mid-width-lat-pulldown',
    steps: [
      'Set the thigh pad so it holds you in the seat.',
      'Grip the bar about shoulder width and pull it to your upper chest.',
      'Squeeze your back, then let the bar rise with control.',
    ],
    feel: 'Sides of your back.',
    mistake: 'Pulling the bar down behind your neck.',
    videoUrl: 'https://www.youtube.com/watch?v=oMJmAHRZXBk',
    status: 'live',
  },
  {
    exerciseId: 'mid-width-cable-row',
    steps: [
      'Sit with your feet on the pads and a slight bend in your knees.',
      'Grip the handle about shoulder width, with your arms straight.',
      'Pull the handle to your stomach, then reach forward slowly.',
    ],
    feel: 'Upper back.',
    mistake: 'Jerking your torso back to move the weight.',
    videoUrl: 'https://www.youtube.com/watch?v=f_r95UajQcg',
    status: 'live',
  },
  {
    exerciseId: 'dual-pulley-straight-arm-pulldown',
    steps: [
      'Set the pulleys high and hold one handle in each hand.',
      'Stand tall with a slight forward lean and your arms nearly straight.',
      'Pull the handles down toward your thighs, then let them rise.',
    ],
    feel: 'Sides of your back.',
    mistake: 'Bending your elbows and turning it into a curl.',
    videoUrl: 'https://www.youtube.com/watch?v=98W63pVdW38',
    status: 'live',
  },
  {
    exerciseId: 'reverse-pec-deck-fly',
    steps: [
      'Sit facing the pad and set the seat so the handles sit at shoulder height.',
      'Hold the handles with a soft bend in your arms.',
      'Open your arms wide, squeeze your shoulder blades, then return slowly.',
    ],
    feel: 'Back of your shoulders.',
    mistake: 'Shrugging your shoulders up as you open your arms.',
    videoUrl: 'https://www.youtube.com/watch?v=5OI1CFf1oc8',
    status: 'live',
  },
  {
    exerciseId: 'rope-hammer-curl',
    steps: [
      'Set the cable low and hold the rope with your thumbs up.',
      'Keep your elbows tucked at your sides.',
      'Curl the rope up, then lower it until your arms are straight.',
    ],
    feel: 'Front of your upper arms.',
    mistake: 'Swinging your shoulders to lift the rope.',
    videoUrl: 'https://www.youtube.com/watch?v=BnFjdVxV8hw',
    status: 'live',
  },
  {
    exerciseId: 'reverse-cable-curl',
    steps: [
      'Set the cable low and hold the bar with your palms down.',
      'Keep your elbows tucked at your sides.',
      'Curl the bar up, then lower it with control.',
    ],
    feel: 'Forearms.',
    mistake: 'Letting your elbows drift forward.',
    videoUrl: 'https://www.youtube.com/watch?v=fZJTIydOIxg',
    status: 'live',
  },
  {
    exerciseId: 'cable-curl',
    steps: [
      'Set the cable low and hold the handle with your palms up.',
      'Keep your elbows tucked at your sides.',
      'Curl the handle up, then lower it until your arms are straight.',
    ],
    feel: 'Front of your upper arms.',
    mistake: 'Swinging your body to help lift the weight.',
    videoUrl: 'https://www.youtube.com/watch?v=pEVXvlVKm80',
    status: 'live',
  },
  {
    exerciseId: 'rope-pushdown',
    steps: [
      'Set the cable high and hold the rope with your thumbs up.',
      'Keep your elbows tucked at your sides.',
      'Push the rope down until your arms are straight, then let it rise.',
    ],
    feel: 'Back of your arms.',
    mistake: 'Letting your elbows swing forward.',
    videoUrl: 'https://www.youtube.com/watch?v=vPeQu_L-1n0',
    status: 'live',
  },
  {
    exerciseId: 'barbell-back-squat',
    steps: [
      'Set the bar on the rack at about shoulder height.',
      'Step under the bar, stand up, and walk back into your stance.',
      'Sit your hips down until your thighs are about level, then stand.',
    ],
    feel: 'Front of your thighs and glutes.',
    mistake: 'Letting your knees cave in.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=T_t85kQEDWk',
    status: 'live',
  },
  {
    exerciseId: 'romanian-deadlift',
    steps: [
      'Hold the bar in front of your thighs, with your feet about hip width.',
      'Push your hips back and slide the bar down your legs.',
      'Stop when the back of your thighs tighten, then stand tall.',
    ],
    feel: 'Back of your thighs and glutes.',
    mistake: 'Rounding your lower back.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=_oyxCn2iSjU',
    status: 'live',
  },
  {
    exerciseId: 'hip-thrust',
    steps: [
      'Set your upper back against a bench, with the bar over your hips.',
      'Plant your feet and bend your knees.',
      'Drive your hips up until your body is straight, then lower.',
    ],
    feel: 'Glutes.',
    mistake: 'Overarching your lower back at the top.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=S_uZP4UH6J0',
    status: 'live',
  },
  {
    exerciseId: 'barbell-bench-press',
    steps: [
      'Lie on the bench with your feet flat and your eyes under the bar.',
      'Grip a little wider than your shoulders and lift the bar off the rack.',
      'Lower the bar to your mid chest, then press it back up.',
    ],
    feel: 'Chest.',
    mistake: 'Bouncing the bar off your chest.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=CCz1_8Xoioo',
    status: 'live',
  },
  {
    exerciseId: 'barbell-bent-over-row',
    steps: [
      'Hinge until your chest faces the floor and hold the bar under your shoulders.',
      'Keep your back flat and your knees softly bent.',
      'Pull the bar to your stomach, then lower it with control.',
    ],
    feel: 'Sides of your back and upper back.',
    mistake: 'Jerking your torso up to move the bar.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=-xlBxIMqh3A',
    status: 'live',
  },
  {
    exerciseId: 'barbell-overhead-press',
    steps: [
      'Set the bar on the rack at shoulder height and hold it at your shoulders.',
      'Brace your stomach and stand tall.',
      'Press the bar overhead until your arms are straight, then lower it.',
    ],
    feel: 'Shoulders.',
    mistake: 'Leaning back to get the bar up.',
    note: 'Use a weight you control. Ask a trainer to check your form the first time.',
    videoUrl: 'https://www.youtube.com/watch?v=GlyABLsPk-Q',
    status: 'live',
  },
  {
    exerciseId: 'leg-press',
    steps: [
      'Set the seat so your knees are bent and your hips stay on the pad.',
      'Place your feet on the platform about shoulder width.',
      'Push until your legs are nearly straight, then lower with control.',
    ],
    feel: 'Front of your thighs.',
    mistake: 'Locking your knees hard at the top.',
    videoUrl: 'https://www.youtube.com/watch?v=GutQSsdFxPE',
    status: 'live',
  },
  {
    exerciseId: 'single-leg-leg-press',
    steps: [
      'Set the seat so your knee is bent and your hip stays on the pad.',
      'Place one foot on the platform and leave the other foot off.',
      'Push until that leg is nearly straight, then lower with control.',
    ],
    feel: 'Front of your thighs.',
    mistake: 'Letting your knee cave in.',
    videoUrl: 'https://www.youtube.com/watch?v=PXQGlgQJwUw',
    status: 'live',
  },
  {
    exerciseId: 'lying-leg-curl',
    steps: [
      'Lie face down and set the pad just above your heels.',
      'Line the machine pivot up with your knees.',
      'Curl your heels toward your glutes, then lower them slowly.',
    ],
    feel: 'Back of your thighs.',
    mistake: 'Lifting your hips off the pad.',
    videoUrl: 'https://www.youtube.com/watch?v=kLJlqfn_bDM',
    status: 'live',
  },
  {
    exerciseId: 'seated-leg-curl',
    steps: [
      'Sit down and set the thigh pad snug, with the lower pad above your heels.',
      'Line your knees up with the machine pivot.',
      'Curl your heels under the seat, then let them rise slowly.',
    ],
    feel: 'Back of your thighs.',
    mistake: 'Lifting your hips as you curl.',
    videoUrl: 'https://www.youtube.com/watch?v=G5iP_YcDQdE',
    status: 'live',
  },
  {
    exerciseId: 'standing-calf-raise',
    steps: [
      'Set the shoulder pads so you stand tall, with the balls of your feet on the step.',
      'Rise onto your toes as high as you can.',
      'Lower your heels below the step with control.',
    ],
    feel: 'Calves.',
    mistake: 'Bouncing out of the bottom.',
    videoUrl: 'https://www.youtube.com/watch?v=KRJIKsY02nE',
    status: 'live',
  },
  {
    exerciseId: 'incline-dumbbell-press',
    steps: [
      'Set the bench to a shallow incline and sit with the dumbbells at your shoulders.',
      'Plant your feet and keep your back on the pad.',
      'Press the dumbbells up, then lower them toward your chest.',
    ],
    feel: 'Upper chest.',
    mistake: 'Flaring your elbows straight out to the sides.',
    videoUrl: 'https://www.youtube.com/watch?v=sh5ZsRpEZCw',
    status: 'live',
  },
  {
    exerciseId: 'chest-supported-dumbbell-row',
    steps: [
      'Set an incline bench and lie with your chest on the pad, dumbbells hanging.',
      'Pull the dumbbells toward your hips.',
      'Squeeze your shoulder blades, then lower the weights slowly.',
    ],
    feel: 'Upper back.',
    mistake: 'Shrugging your shoulders up as you pull.',
    videoUrl: 'https://www.youtube.com/watch?v=ro2vfHfD0DQ',
    status: 'live',
  },
  {
    exerciseId: 'seated-dumbbell-shoulder-press',
    steps: [
      'Set the bench upright and sit with the dumbbells at your shoulders.',
      'Keep your feet flat and your back against the pad.',
      'Press the dumbbells overhead, then lower them to your shoulders.',
    ],
    feel: 'Shoulders.',
    mistake: 'Arching your lower back to press the weights up.',
    videoUrl: 'https://www.youtube.com/watch?v=SSXS4Z8OkCg',
    status: 'live',
  },
  {
    exerciseId: 'dumbbell-lateral-raise',
    steps: [
      'Stand tall with a dumbbell in each hand, palms facing in.',
      'Raise your arms out to the sides, up to about shoulder height.',
      'Lower them back down slowly.',
    ],
    feel: 'Sides of your shoulders.',
    mistake: 'Swinging the weights up with your body.',
    videoUrl: 'https://www.youtube.com/watch?v=Y29xKcze8Ik',
    status: 'live',
  },
  {
    exerciseId: 'dumbbell-rear-delt-fly',
    steps: [
      'Hinge at your hips until your chest faces the floor.',
      'Hold the dumbbells under your shoulders with your palms facing in.',
      'Raise your arms out wide, then lower them with control.',
    ],
    feel: 'Back of your shoulders.',
    mistake: 'Standing up as you lift the weights.',
    videoUrl: 'https://www.youtube.com/watch?v=UO_v23hHAdM',
    status: 'live',
  },
  {
    exerciseId: 'skull-crusher',
    steps: [
      'Lie on a bench and hold the bar above your chest, arms straight.',
      'Bend your elbows and lower the bar toward your forehead.',
      'Straighten your arms again without moving your upper arms.',
    ],
    feel: 'Back of your arms.',
    mistake: 'Letting your elbows flare out to the sides.',
    note: 'Point your elbows at the ceiling. Stop if they hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=4re6CJ0XNF8',
    status: 'live',
  },
  {
    exerciseId: 'bulgarian-split-squat',
    steps: [
      'Stand a stride in front of a bench and rest the top of one foot on it.',
      'Lower your back knee toward the floor.',
      'Push through the front foot to stand, then switch sides.',
    ],
    feel: 'Front of your thighs and glutes.',
    mistake: 'Letting your front knee cave in.',
    note: 'Hold a wall or a rack if you need help with balance.',
    videoUrl: 'https://www.youtube.com/watch?v=VPhhE6bBzZE',
    status: 'live',
  },
  {
    exerciseId: 'ab-crunch-machine',
    steps: [
      'Set the seat so the chest pad meets your upper chest.',
      'Hold the handles and keep your hips on the seat.',
      'Curl your ribs toward your hips, then return slowly.',
    ],
    feel: 'Upper stomach.',
    mistake: 'Pulling the pad down with your arms.',
    videoUrl: 'https://www.youtube.com/watch?v=0kLWho-pEdQ',
    status: 'live',
  },
  {
    exerciseId: 'tibialis-raise',
    steps: [
      'Stand with your heels a little out from a wall, back resting on it.',
      'Lift your toes toward your shins.',
      'Lower your toes back down with control.',
    ],
    feel: 'Front of your shins.',
    mistake: 'Leaning off the wall to make the lift easier.',
    videoUrl: 'https://www.youtube.com/watch?v=UmHbtN0iFMg',
    status: 'live',
  },
  {
    exerciseId: 'worlds-greatest-stretch',
    steps: [
      'Step into a deep lunge, and drop the back knee if you need to.',
      'Place the same-side hand on the floor inside your front foot.',
      'Rotate your chest and reach the other arm toward the ceiling.',
      'Step back and switch sides.',
    ],
    feel: 'Front of your hips and the back of your thighs.',
    mistake: 'Rounding your back instead of opening the hip.',
    videoUrl: 'https://www.youtube.com/watch?v=uIFKmkvgw8w',
    status: 'live',
  },
  {
    exerciseId: 'pogo-jumps',
    steps: [
      'Stand tall with a soft bend in your knees.',
      'Bounce on the balls of your feet, barely leaving the ground.',
      'Keep each landing quiet, with your heels staying light.',
    ],
    feel: 'Calves.',
    mistake: 'Bending deep into a squat on every bounce.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=j0nl5dWuqN4',
    status: 'live',
  },
  {
    exerciseId: 'side-to-side-hops',
    steps: [
      'Stand on both feet with soft knees.',
      'Hop from side to side on the balls of your feet.',
      'Keep the hops small and land quietly.',
    ],
    feel: 'Calves and outer hips.',
    mistake: 'Hopping so wide that you lose your balance.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=H5Ymsy8s6SE',
    status: 'live',
  },
  {
    exerciseId: 'single-leg-side-to-side',
    steps: [
      'Stand on one foot with a soft knee.',
      'Hop from side to side on that foot.',
      'Stay tall, then switch feet and repeat.',
    ],
    feel: 'Calves and outer hips.',
    mistake: 'Letting your knee cave in as you land.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=xayXw7a5qlY',
    status: 'live',
  },
  {
    exerciseId: 'skater-jump',
    steps: [
      'Stand on one leg with a soft knee.',
      'Leap sideways onto the other foot and let the back leg sweep behind.',
      'Stick the landing, then leap back the other way.',
    ],
    feel: 'Glutes and outer hips.',
    mistake: 'Landing on a straight, stiff leg.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=dzVTuvRojzA',
    status: 'live',
  },
  {
    exerciseId: 'jumping-lunge',
    steps: [
      'Start in a lunge with your back knee lowered.',
      'Jump and switch your legs in the air.',
      'Land in the other lunge with soft knees.',
    ],
    feel: 'Front of your thighs and glutes.',
    mistake: 'Landing with your knees locked straight.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=_5kDxC0flg0',
    status: 'live',
  },
  {
    exerciseId: 'lunge-to-high-knee',
    steps: [
      'Step into a lunge and lower with control.',
      'Push off the front foot and drive the back knee up.',
      'Place that foot down and switch sides.',
    ],
    feel: 'Front of your thighs, glutes and the front of your hips.',
    mistake: 'Letting your front knee cave in.',
    note: 'Land softly. Stop if your knees or ankles hurt.',
    videoUrl: 'https://www.youtube.com/watch?v=-4WL_JWLDAQ',
    status: 'live',
  },
];

/** How-to text for the gym catalogue. No video is attached; the page can search. */
const catalogueHowTos: ExerciseHowTo[] = [
  guide('incline-dumbbell-curl', ['Sit on an incline bench with your arms hanging.', 'Curl the dumbbells up without swinging.', 'Lower until your arms are straight again.'], 'Front of your upper arms, in the stretched position.', 'Swinging your shoulders to lift the weight.'),
  guide('close-grip-seated-row', ['Sit at the row machine and take a narrow grip.', 'Pull the handle to your stomach, then reach forward.', 'Keep your chest on the pad if the machine has one.'], 'Middle of your back.', 'Shrugging the weight up instead of pulling it in.'),
  guide('face-pull', ['Set a rope at about face height.', 'Pull the rope toward your face and separate the ends.', 'Pause, then let your arms reach forward.'], 'Rear of your shoulders.', 'Pulling the rope down to your chest.'),
  guide('wide-grip-lat-pulldown', ['Sit with your thighs under the pads and take a wide grip.', 'Pull the bar to your upper chest.', 'Let the bar rise until your arms are straight.'], 'Sides of your back.', 'Leaning back to heave the bar down.'),
  guide('machine-seated-row', ['Sit tall, chest toward the pad, and take the handles.', 'Pull the handles to your ribs.', 'Reach forward until your arms are straight.'], 'Middle of your back.', 'Rounding your back to reach farther.'),
  guide('straight-arm-cable-pulldown', ['Stand facing a high cable with straight arms.', 'Pull the bar down to your thighs without bending your elbows.', 'Let it rise back to about shoulder height.'], 'Sides of your back.', 'Bending your elbows and turning it into a row.'),
  guide('pull-up', ['Hang from a bar with your hands just outside your shoulders.', 'Pull until your chin is over the bar.', 'Lower until your arms are straight.'], 'Sides of your back and your arms.', 'Kipping or half-lowering the reps.'),
  guide('chest-supported-t-bar-row', ['Lie chest-down on the pad and take the handles.', 'Pull the weight toward your ribs.', 'Lower until your arms are straight.'], 'Middle of your back.', 'Lifting your chest off the pad.'),
  guide('weighted-pull-up', ['Hang from a bar with a belt or dumbbell held between your feet.', 'Pull until your chin is over the bar.', 'Lower until your arms are straight.'], 'Sides of your back.', 'Cutting the lower half of the rep short.'),
  guide('pendlay-row', ['Set the bar on the floor and hinge until your back is about flat.', 'Pull the bar to your lower ribs, then set it down.', 'Reset your position before the next rep.'], 'Middle of your back.', 'Jerking the bar up with your hips.'),
  guide('machine-biceps-curl', ['Sit at the curl machine with your upper arms on the pad.', 'Curl the handles up.', 'Lower until your arms are nearly straight.'], 'Front of your upper arms.', 'Lifting your elbows off the pad.'),
  guide('hammer-curl', ['Stand with dumbbells at your sides, thumbs forward.', 'Curl without twisting your wrists.', 'Lower until your arms are straight.'], 'Front of your upper arms and forearms.', 'Swinging the dumbbells up.'),
  guide('ez-bar-curl', ['Hold the EZ bar with your hands on the angled grips.', 'Curl the bar up, keeping your elbows still.', 'Lower until your arms are straight.'], 'Front of your upper arms.', 'Leaning back to start the curl.'),
  guide('cable-preacher-curl', ['Set the cable low and rest your upper arms on the preacher pad.', 'Curl the handle up.', 'Lower until your arm is straight.'], 'Front of your upper arms.', 'Letting your elbow lift off the pad.'),
  guide('chin-up', ['Hang from a bar with your palms facing you.', 'Pull until your chin is over the bar.', 'Lower until your arms are straight.'], 'Sides of your back and the front of your arms.', 'Swinging your knees to get over the bar.'),
  guide('barbell-curl', ['Stand and hold the bar in front of your thighs.', 'Curl the bar up, elbows still.', 'Lower until your arms are straight.'], 'Front of your upper arms.', 'Swinging your hips to start the bar.'),
  guide('preacher-curl', ['Rest your upper arms on the preacher pad.', 'Curl the bar up.', 'Lower until your arms are nearly straight.'], 'Front of your upper arms.', 'Bouncing the bar out of the bottom.'),
  guide('machine-chest-press', ['Sit with the handles at chest height.', 'Press until your arms are straight.', 'Bring the handles back to your chest.'], 'Chest.', 'Letting your shoulders shrug up toward your ears.'),
  guide('incline-machine-chest-press', ['Sit on the incline press with the handles at your upper chest.', 'Press until your arms are straight.', 'Lower the handles with control.'], 'Upper chest.', 'Flaring your elbows straight out to the sides.'),
  guide('pec-deck', ['Sit with your forearms on the pads, elbows about shoulder height.', 'Bring the pads together in front of your chest.', 'Open your arms until you feel a stretch.'], 'Chest.', 'Pushing the pads with your hands instead of your forearms.'),
  guide('incline-cable-fly', ['Set the cables low and stand or sit on an incline.', 'Bring your hands together above your chest with a soft elbow.', 'Open your arms back to a stretch.'], 'Upper chest.', 'Bending your elbows and turning it into a press.'),
  guide('incline-barbell-press', ['Lie on an incline bench and take a grip just outside your shoulders.', 'Lower the bar to your upper chest.', 'Press it up until your arms are straight.'], 'Upper chest.', 'Bouncing the bar off your chest.'),
  guide('dumbbell-fly', ['Lie on a bench with dumbbells above your chest, elbows soft.', 'Open your arms out to the sides.', 'Bring the dumbbells back together.'], 'Chest.', 'Dropping the dumbbells below the bench with straight elbows.'),
  guide('incline-dumbbell-fly', ['Lie on an incline bench with dumbbells above your chest.', 'Open your arms out and slightly down.', 'Bring the dumbbells back together.'], 'Upper chest.', 'Using a straight elbow and straining the shoulder.'),
  guide('overhead-cable-extension', ['Face away from a low cable and hold the rope behind your head.', 'Straighten your elbows overhead.', 'Bend them until you feel a stretch.'], 'Back of your upper arms.', 'Flaring your elbows wide.'),
  guide('dumbbell-kickback', ['Hinge forward and pin your upper arm to your side.', 'Straighten your elbow until your arm is in line with your body.', 'Bend the elbow back to about a right angle.'], 'Back of your upper arm.', 'Swinging the upper arm instead of bending the elbow.'),
  guide('close-grip-bench-press', ['Lie on a bench and take a grip about shoulder width.', 'Lower the bar to your lower chest.', 'Press it up until your arms are straight.'], 'Back of your upper arms.', 'Taking such a narrow grip that your wrists bend.'),
  guide('triceps-dip', ['Support yourself on parallel bars with your torso upright.', 'Bend your elbows until your upper arms are about level.', 'Press back up until your arms are straight.'], 'Back of your upper arms.', 'Swinging your legs to get out of the bottom.'),
  guide('machine-shoulder-press', ['Sit with the handles at shoulder height.', 'Press overhead until your arms are straight.', 'Lower the handles to about ear height.'], 'Shoulders.', 'Arching your lower back to finish the press.'),
  guide('cable-lateral-raise', ['Stand side-on to a low cable.', 'Raise your arm out to the side until it is about level.', 'Lower it with control.'], 'Side of your shoulder.', 'Shrugging the shoulder up as the arm rises.'),
  guide('dumbbell-romanian-deadlift', ['Hold dumbbells in front of your thighs.', 'Hinge your hips back until you feel your hamstrings.', 'Stand tall and squeeze your glutes.'], 'Hamstrings and glutes.', 'Rounding your back to reach the floor.'),
  guide('hip-thrust-machine', ['Sit into the machine with the pad across your hips.', 'Drive your hips up until your body is straight.', 'Lower the pad with control.'], 'Glutes.', 'Arching your lower back at the top.'),
  guide('leg-extension', ['Sit with the pad on your lower shins.', 'Straighten your knees.', 'Lower until your knees are bent again.'], 'Front of your thighs.', 'Swinging the weight up with your hips.'),
  guide('walking-lunge', ['Hold dumbbells at your sides.', 'Step forward and lower your back knee.', 'Push through the front foot and step through.'], 'Front of your thighs and glutes.', 'Letting the front knee cave in.'),
  guide('conventional-deadlift', ['Stand with the bar over your mid-foot and hinge to grip it.', 'Push the floor away and stand tall.', 'Hinge the bar back down along your legs.'], 'Glutes, hamstrings and your back.', 'Rounding your back as the bar leaves the floor.'),
  guide('dead-bug', ['Lie on your back with your arms up and your knees bent.', 'Reach one arm and the opposite leg away.', 'Bring them back and switch sides.'], 'The front of your trunk.', 'Arching your lower back off the floor.'),
  guide('bird-dog', ['Start on your hands and knees.', 'Reach one arm and the opposite leg out.', 'Bring them back and switch sides.'], 'Glutes and the back of your trunk.', 'Twisting your hips as the leg lifts.'),
  guide('pallof-press', ['Stand side-on to a cable at chest height.', 'Hold the handle at your chest, then press it straight out.', 'Bring it back to your chest without turning.'], 'The sides of your trunk.', 'Letting the cable rotate you toward the stack.'),
  guide('ab-wheel-rollout', ['Kneel and hold the wheel under your shoulders.', 'Roll forward as far as you can keep your back flat.', 'Pull the wheel back to your knees.'], 'The front of your trunk.', 'Letting your hips sag as you roll out.'),
  guide('cable-woodchop', ['Set a cable high and stand side-on to it.', 'Pull the handle down and across your body.', 'Return it with control and switch sides.'], 'The sides of your trunk.', 'Twisting only your arms and not your trunk.'),
  guide('cable-crunch', ['Kneel facing a high cable and hold the rope by your head.', 'Curl your ribs toward your hips.', 'Return until your trunk is tall again.'], 'The front of your trunk.', 'Pulling the rope with your arms.'),
  guide('hanging-leg-raise', ['Hang from a bar with straight arms.', 'Raise your legs in front of you without swinging.', 'Lower them with control.'], 'The lower front of your trunk.', 'Using a swing to get the legs up.'),
  guide('side-plank', ['Lie on your side with your elbow under your shoulder.', 'Lift your hips so your body is a straight line.', 'Hold, then switch sides.'], 'The side of your trunk.', 'Letting your hips drop toward the floor.'),
  guide('seated-dumbbell-curl', ['Sit tall with dumbbells at your sides.', 'Curl them up without swinging.', 'Lower until your arms are straight.'], 'Front of your upper arms.', 'Rocking your torso to help the curl.'),
  guide('cross-body-hammer-curl', ['Stand with dumbbells at your sides, thumbs forward.', 'Curl one dumbbell across your body toward the opposite shoulder.', 'Lower it and switch sides.'], 'Front of your upper arms.', 'Turning the dumbbell into a regular curl.'),
  guide('single-arm-pushdown', ['Stand at a high cable and hold one handle.', 'Pin your elbow to your side and straighten your arm.', 'Let the handle rise to about chest height.'], 'Back of your upper arm.', 'Letting the elbow drift forward.'),
  guide('hanging-knee-raise', ['Hang from a bar with straight arms.', 'Draw your knees up in front of you.', 'Lower them without swinging.'], 'The lower front of your trunk.', 'Kipping your hips to lift the knees.'),
  guide('dumbbell-goblet-squat', ['Hold one dumbbell at your chest.', 'Sit your hips down between your heels.', 'Stand back up.'], 'Front of your thighs and glutes.', 'Letting your heels lift.'),
  guide('dumbbell-bench-press', ['Lie on a bench with dumbbells at your chest.', 'Press them up until your arms are straight.', 'Lower them to the sides of your chest.'], 'Chest.', 'Bouncing the dumbbells off your chest.'),
  guide('single-arm-dumbbell-row', ['Support one hand on a bench and hold a dumbbell in the other.', 'Pull the dumbbell to your hip.', 'Lower it until your arm is straight.'], 'Side of your back.', 'Twisting your torso to heave the dumbbell.'),
  guide('close-grip-lat-pulldown', ['Sit at the pulldown and take a narrow grip.', 'Pull the bar to your upper chest.', 'Let it rise until your arms are straight.'], 'Sides of your back.', 'Leaning far back to finish the pull.'),
  guide('front-squat', ['Rest the bar on the front of your shoulders and lift your elbows.', 'Sit down until your thighs are about level.', 'Stand back up, keeping your elbows high.'], 'Front of your thighs.', 'Letting your elbows drop so the bar rolls.'),
  guide('kettlebell-calf-raise', ['Hold a kettlebell in front of you and stand tall.', 'Rise onto the balls of your feet.', 'Lower your heels under control.'], 'Calves.', 'Bouncing at the bottom.'),
  guide('hack-squat', ['Set your shoulders under the pads and your feet on the platform.', 'Lower until your thighs are about level.', 'Press the platform away to stand.'], 'Front of your thighs.', 'Letting your knees cave in.'),
  guide('stationary-bike', ['Set the seat so your knee is slightly bent at the bottom.', 'Pedal at the pace the session asks for.', 'Keep your trunk still and your hands light on the bars.'], 'Front of your thighs.', 'Bouncing in the saddle.'),
];

function guide(exerciseId: string, steps: string[], feel: string, mistake: string): ExerciseHowTo {
  return { exerciseId, steps, feel, mistake, status: 'live' };
}

const allowedKeys = new Set(['exerciseId', 'steps', 'feel', 'mistake', 'note', 'videoUrl', 'status']);

/** Only YouTube watch, short and short-link addresses over https. */
export function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    return host === 'youtube.com' || host === 'youtu.be';
  } catch {
    return false;
  }
}

/** Where a person goes to watch someone do this move: the chosen video, or a YouTube search. */
export function exerciseVideoUrl(name: string, videoUrl?: string | null) {
  if (videoUrl && isYouTubeUrl(videoUrl)) return videoUrl;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise proper form`)}`;
}

function line(value: unknown, message: string, max: number) {
  if (typeof value !== 'string') throw new Error(message);
  const text = value.trim();
  if (!text || text.length > max) throw new Error(message);
  return text;
}

/** Accepts one how-to only when the exercise exists and the steps stay short. */
export function parseHowTo(value: unknown): ExerciseHowTo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Check the how-to and try again.');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !allowedKeys.has(key))) throw new Error('Check the how-to and try again.');
  const exerciseId = record.exerciseId;
  if (typeof exerciseId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,78}$/.test(exerciseId) || !exercise(exerciseId))
    throw new Error('Unknown exercise.');
  if (!Array.isArray(record.steps) || record.steps.length < 2 || record.steps.length > 5) throw new Error('Use 2 to 5 steps.');
  const steps = record.steps.map(step => line(step, 'Keep each step to 90 characters.', 90));
  const feel = line(record.feel, 'Say where to feel it.', 160);
  const mistake = line(record.mistake, 'Name the common mistake.', 160);
  let note: string | undefined;
  if (record.note != null) note = line(record.note, 'Check the how-to and try again.', 280);
  let videoUrl: string | undefined;
  if (record.videoUrl != null) {
    if (typeof record.videoUrl !== 'string' || !isYouTubeUrl(record.videoUrl)) throw new Error('Use a YouTube link for the video.');
    videoUrl = record.videoUrl;
  }
  if (record.status !== 'draft' && record.status !== 'live') throw new Error('Check the how-to and try again.');
  return { exerciseId, steps, feel, mistake, ...(note ? { note } : {}), ...(videoUrl ? { videoUrl } : {}), status: record.status };
}

export function seededHowTos(): ExerciseHowTo[] {
  return [...seed, ...catalogueHowTos].map(row => parseHowTo(row));
}
