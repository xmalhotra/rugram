import { seededHowTos } from '../exercise-how-to';
import { setSchemes } from '../set-schemes-data';
import { knownFlowIds, parsePlan, parseSession, parseTrainingType, type TrainingPlan, type TrainingSession, type TrainingType } from '../training';

const caution =
  "Hard efforts and heat aren't right for everyone. Stop if you feel unwell and check with a doctor if you have a heart condition, are pregnant or have other health concerns.";

const types: TrainingType[] = [
  parseTrainingType({
    id: 'type-strength',
    title: 'Strength',
    about: 'Load and repetitions for each set, kept with your exercise records.',
    iconKey: 'barbell',
    blockFields: [
      { key: 'weight', label: 'Weight', input: 'number', unit: 'kg', required: true },
      { key: 'reps', label: 'Reps', input: 'number', unit: 'reps', required: true },
    ],
    sessionFields: [],
    canPost: true,
    usesExerciseRecords: true,
    status: 'live',
  }),
  parseTrainingType({
    id: 'type-bodyweight-reps',
    title: 'Bodyweight reps',
    about: 'Repetitions for a movement that uses your body as the load.',
    iconKey: 'body',
    blockFields: [{ key: 'reps', label: 'Reps', input: 'number', unit: 'reps', required: true }],
    sessionFields: [],
    canPost: true,
    usesExerciseRecords: true,
    status: 'live',
  }),
  parseTrainingType({
    id: 'type-holds',
    title: 'Holds',
    about: 'A timed hold for each set, kept with your exercise records.',
    iconKey: 'timer',
    blockFields: [{ key: 'seconds', label: 'Time', input: 'duration', required: true }],
    sessionFields: [],
    canPost: true,
    usesExerciseRecords: true,
    status: 'live',
  }),
  parseTrainingType({
    id: 'type-intervals',
    title: 'Intervals',
    about: 'Repeating efforts. Distance is optional. Say how hard the session felt at the end.',
    iconKey: 'repeat',
    blockFields: [
      { key: 'seconds', label: 'Time', input: 'duration', required: true },
      { key: 'metres', label: 'Distance', input: 'distance', required: false },
    ],
    sessionFields: [{ key: 'effort', label: 'How hard it felt', input: 'rating', required: false }],
    canPost: true,
    usesExerciseRecords: false,
    status: 'live',
  }),
  parseTrainingType({
    id: 'type-steady',
    title: 'Steady cardio',
    about: 'One continuous effort. Distance is optional. Say how hard it felt at the end.',
    iconKey: 'heart',
    blockFields: [
      { key: 'metres', label: 'Distance', input: 'distance', required: false },
      { key: 'seconds', label: 'Time', input: 'duration', required: true },
    ],
    sessionFields: [{ key: 'effort', label: 'How hard it felt', input: 'rating', required: false }],
    canPost: true,
    usesExerciseRecords: false,
    status: 'live',
  }),
  parseTrainingType({
    id: 'type-recovery',
    title: 'Recovery',
    about: 'Easy time on the clock, or a simple check that you did the block.',
    iconKey: 'leaf',
    blockFields: [
      { key: 'seconds', label: 'Time', input: 'duration', required: false },
      { key: 'done', label: 'Done', input: 'check', required: false },
    ],
    sessionFields: [],
    canPost: false,
    usesExerciseRecords: false,
    status: 'live',
  }),
];

function lift(id: string, exerciseId: string, sets: number, min: number, max: number, restSeconds = 90, scheme: 'pyramid' | 'descending' = 'pyramid') {
  return { id, exerciseId, sets, restSeconds, scheme, targets: { reps: { min, max } } };
}

const sessionInputs = [
  {
    id: 'lower-body',
    typeId: 'type-strength',
    title: 'Lower Body',
    goal: 'Squat, hinge and press the legs, then finish with the calves.',
    level: 'Intermediate',
    note: caution,
    status: 'live' as const,
    blocks: [
      lift('squat', 'barbell-back-squat', 4, 6, 8),
      lift('hinge', 'romanian-deadlift', 3, 8, 10),
      lift('press', 'leg-press', 3, 10, 12),
      lift('curl', 'lying-leg-curl', 3, 10, 12, 90, 'descending'),
      lift('thrust', 'hip-thrust', 3, 8, 10),
      lift('calves', 'standing-calf-raise', 3, 12, 15, 90, 'descending'),
    ],
  },
  {
    id: 'upper-body-a',
    typeId: 'type-strength',
    title: 'Upper Body A',
    goal: 'Press, row and raise, with a pulldown and a pushdown to balance the arms.',
    level: 'Intermediate',
    note: caution,
    status: 'live' as const,
    blocks: [
      lift('bench', 'barbell-bench-press', 4, 6, 8),
      lift('row', 'barbell-bent-over-row', 4, 6, 8),
      lift('press', 'barbell-overhead-press', 3, 6, 8),
      lift('pulldown', 'mid-width-lat-pulldown', 3, 8, 12),
      lift('raise', 'dumbbell-lateral-raise', 3, 10, 15, 90, 'descending'),
      lift('pushdown', 'rope-pushdown', 3, 10, 12, 90, 'descending'),
    ],
  },
  {
    id: 'upper-body-b',
    typeId: 'type-strength',
    title: 'Upper Body B',
    goal: 'A second upper day: incline pressing, a chest-supported row, and curls.',
    level: 'Intermediate',
    note: caution,
    status: 'live' as const,
    blocks: [
      lift('incline', 'incline-dumbbell-press', 4, 8, 10),
      lift('supported-row', 'chest-supported-dumbbell-row', 4, 8, 10),
      lift('shoulder', 'seated-dumbbell-shoulder-press', 3, 8, 10),
      lift('rear', 'dumbbell-rear-delt-fly', 3, 12, 15, 90, 'descending'),
      lift('curl', 'cable-curl', 3, 10, 12, 90, 'descending'),
      lift('extension', 'skull-crusher', 3, 8, 12, 90, 'descending'),
    ],
  },
  {
    id: 'run-specific',
    typeId: 'type-strength',
    title: 'Run-Specific Strength',
    goal: 'Single-leg work, calves, the front of the shin, hamstrings and a little trunk.',
    level: 'Intermediate',
    note: caution,
    status: 'live' as const,
    blocks: [
      lift('split', 'bulgarian-split-squat', 3, 8, 10),
      lift('single-press', 'single-leg-leg-press', 3, 8, 12),
      lift('hamstrings', 'seated-leg-curl', 3, 10, 12, 90, 'descending'),
      lift('calves', 'standing-calf-raise', 3, 12, 15, 90, 'descending'),
      lift('shin', 'tibialis-raise', 3, 12, 15, 90, 'descending'),
      lift('trunk', 'ab-crunch-machine', 3, 10, 15, 90, 'descending'),
    ],
  },
  {
    id: 'vo2-intervals',
    typeId: 'type-intervals',
    title: 'VO2 Max Intervals',
    goal: 'An easy start, four hard minutes with three easy minutes between them, then an easy finish.',
    level: 'Intermediate',
    note: caution,
    status: 'live' as const,
    blocks: [
      { id: 'warm-up', label: 'Warm up', sets: 1, scheme: 'straight', intensity: 'easy' as const, targets: { seconds: { min: 600, max: 600 } } },
      { id: 'hard', label: 'Hard', sets: 4, restSeconds: 180, scheme: 'straight', intensity: 'interval' as const, targets: { seconds: { min: 240, max: 240 } } },
      { id: 'cool-down', label: 'Cool down', sets: 1, scheme: 'straight', intensity: 'easy' as const, targets: { seconds: { min: 480, max: 600 } } },
    ],
  },
  {
    id: 'easy-run',
    typeId: 'type-steady',
    title: 'Easy Run',
    goal: 'A conversational run you could repeat tomorrow.',
    level: 'All levels',
    status: 'live' as const,
    blocks: [{ id: 'run', label: 'Easy run', sets: 1, intensity: 'easy' as const, targets: { seconds: { min: 1800, max: 2700 } } }],
  },
  {
    id: 'recovery-day',
    typeId: 'type-recovery',
    title: 'Recovery Day',
    goal: 'Move gently, then sit in the heat only if it suits you.',
    level: 'All levels',
    note: caution,
    status: 'live' as const,
    blocks: [
      { id: 'mobility', label: 'Mobility', exerciseId: 'worlds-greatest-stretch', sets: 1, scheme: 'straight' },
      { id: 'sauna', label: 'Sauna', sets: 1, scheme: 'straight', targets: { seconds: { min: 600, max: 900 } } },
    ],
  },
  {
    id: 'plyometrics-for-runners',
    typeId: 'type-holds',
    title: 'Plyometrics for Runners',
    goal: 'Build springy, reactive legs that snap back quickly under you when you run.',
    level: 'Intermediate',
    note: 'Jumping is high impact. Build up gradually, land softly, and stop if your shins or joints hurt.',
    catalogTiles: ['run-drills'],
    status: 'live' as const,
    blocks: [
      { id: 'pogos', exerciseId: 'pogo-jumps', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
      { id: 'side-hops', exerciseId: 'side-to-side-hops', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
      { id: 'single-side', exerciseId: 'single-leg-side-to-side', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
      { id: 'skates', label: 'Side Skates', exerciseId: 'skater-jump', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
      { id: 'lunge-jumps', label: 'Lunge Jumps', exerciseId: 'jumping-lunge', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
      { id: 'knee-drive', exerciseId: 'lunge-to-high-knee', sets: 3, restSeconds: 60, scheme: 'straight', targets: { seconds: { min: 30, max: 30 } } },
    ],
  },
];

const sessions: TrainingSession[] = sessionInputs.map(input => parseSession(input, types));

const planInputs = [
  {
    id: 'hybrid-week',
    title: 'Hybrid Week',
    goal: 'Lift, run hard once, recover, and keep one day easy.',
    level: 'Intermediate',
    weeks: 1,
    status: 'live' as const,
    slots: [
      { week: 1, weekday: 1, items: [{ kind: 'session' as const, id: 'lower-body' }] },
      { week: 1, weekday: 2, items: [{ kind: 'session' as const, id: 'upper-body-a' }] },
      { week: 1, weekday: 3, items: [{ kind: 'session' as const, id: 'vo2-intervals' }] },
      { week: 1, weekday: 4, items: [{ kind: 'session' as const, id: 'recovery-day' }] },
      { week: 1, weekday: 5, items: [{ kind: 'session' as const, id: 'run-specific' }] },
      { week: 1, weekday: 6, items: [{ kind: 'session' as const, id: 'upper-body-b' }] },
      { week: 1, weekday: 7, items: [{ kind: 'session' as const, id: 'easy-run' }] },
    ],
  },
];

const plans: TrainingPlan[] = planInputs.map(input => parsePlan(input, { sessions, types, flowIds: knownFlowIds() }));

export function trainingCatalog() {
  return { types, sessions, plans, schemes: setSchemes, howTos: seededHowTos() };
}

export { howToGeneral, seededHowTos } from '../exercise-how-to';
