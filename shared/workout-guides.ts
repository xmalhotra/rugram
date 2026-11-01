import type { HabitFlow } from './mobile';

export type WorkoutGuide = {
  collection?: string;
  label: string;
  format: string;
  equipment: string;
  reviewedOn: string;
  attribution?: { label: string; url: string };
  cards: {
    id: string;
    title: string;
    metric: string;
    body: string;
    illustration:
      'workout' | 'running' | 'crossfit' | import('./animal-movements').AnimalIllustration;
  }[];
};

const safety =
  'General workout education, not a personal prescription. Choose a suitable scale with a qualified coach and leave room for recovery. Do not add a hard session on top of existing hard training. Stop for pain, dizziness or unusual breathlessness; seek medical advice for health conditions or returning after illness.';

export function guide(
  id: string,
  title: string,
  description: string,
  level: string,
  sessionGuide: WorkoutGuide,
  sources: NonNullable<HabitFlow['sources']>,
): HabitFlow & { sessionGuide: WorkoutGuide } {
  return {
    id,
    title,
    description,
    area: 'Fitness',
    pathId: 'workout',
    goal: 'Workout',
    level,
    rhythm: 'A session option, not a daily challenge',
    milestone: 'Understand the format and choose an appropriate version.',
    review: 'Did the scale suit your technique, energy and recovery?',
    guidance: safety,
    sessionGuide,
    ...(sessionGuide.collection === 'Cindy'
      ? { relatedFlowIds: ['cindy-pull-up', 'cindy-push-up', 'cindy-squat'] }
      : {}),
    sources,
    steps: [
      {
        id: 'prepare',
        title: 'Choose your version',
        cue: 'Review the guide and fit this session around your existing training and recovery.',
        duration: 'Before a planned session',
      },
      {
        id: 'practice',
        title: 'Move with control',
        cue: 'Use the chosen scale. Rest or stop before technique breaks down.',
        duration: 'At your own level',
      },
      {
        id: 'recover',
        title: 'Leave room to recover',
        cue: 'Cool down comfortably and consider how you feel before your next training day.',
        duration: 'After the session',
      },
    ],
  };
}

export const popularWorkoutFlows = [
  guide(
    'workout-cindy',
    'Cindy',
    'Three bodyweight movements. Learn the original benchmark and a more approachable scale.',
    'Scalable · demanding',
    {
      collection: 'Cindy',
      label: 'In the spotlight',
      format: '20-minute AMRAP',
      equipment: 'Secure pull-up bar · floor space',
      reviewedOn: '2026-10-21',
      attribution: {
        label:
          'Tom Holland discussed Cindy in a Men’s Health interview. It is a CrossFit benchmark, not his invention or an endorsement of this app.',
        url: 'https://www.menshealth.nl/nieuws/zo-fit-als-spider-man-tom-holland-doe-zijn-bizarre-crossfit-workout-cindy',
      },
      cards: [
        {
          id: 'format',
          title: 'A simple loop. Not an easy one.',
          metric: '5 pull-ups · 10 push-ups · 15 squats',
          body: 'Repeat for 20 minutes. AMRAP means as many rounds and reps as possible, with sound technique. Rest when needed; a celebrity score is not your target.',
          illustration: 'crossfit',
        },
        {
          id: 'pull',
          title: 'Pull with control',
          metric: '5 pull-ups',
          body: 'Use a secure bar and a controlled range you can manage. Learn technique with a coach; do not improvise kipping. A ring row is a scaling option.',
          illustration: 'crossfit',
        },
        {
          id: 'push',
          title: 'Keep the body together',
          metric: '10 push-ups',
          body: 'Brace your trunk, lower under control and press without letting your hips sag. Use an incline or assisted version when needed.',
          illustration: 'workout',
        },
        {
          id: 'squat',
          title: 'Find a comfortable squat',
          metric: '15 air squats',
          body: 'Keep your feet grounded and knees tracking with your toes. Use a depth you control; a suitable target can help. No added weight required.',
          illustration: 'workout',
        },
        {
          id: 'scale',
          title: 'Start smaller',
          metric: '12 minutes · 3 / 6 / 9',
          body: 'CrossFit’s beginner version uses 3 ring rows, 6 assisted push-ups and 9 squats. Warm up first. Choose the scale before the clock, not after technique fails.',
          illustration: 'crossfit',
        },
      ],
    },
    [
      {
        title: 'CrossFit: Cindy format and scaling',
        url: 'https://www.crossfit.com/benchmark/cindy',
      },
      {
        title: 'Men’s Health: Tom Holland and Cindy',
        url: 'https://www.menshealth.nl/nieuws/zo-fit-als-spider-man-tom-holland-doe-zijn-bizarre-crossfit-workout-cindy',
      },
    ],
  ),
  guide(
    'workout-12-3-30',
    '12-3-30 · incline walking',
    'The social-media treadmill format, with a gentler starting option.',
    'Adjustable · steep incline',
    {
      label: 'Social-media favourite',
      format: '12% · 3 mph · 30 min',
      equipment: 'Incline treadmill · walking shoes',
      reviewedOn: '2026-10-21',
      cards: [
        {
          id: 'format',
          title: 'Decode the numbers',
          metric: '12% incline · 4.8 km/h · 30 min',
          body: 'The original uses 3 miles per hour, approximately 4.8 km/h—not 3 km/h. Lauren Giraldo popularised this format. These numbers describe it; they are not a starting requirement.',
          illustration: 'running',
        },
        {
          id: 'technique',
          title: 'Walk, don’t hang on',
          metric: 'A pace you can control',
          body: 'Warm up with easy walking. Walk naturally and use the treadmill safety clip. If you need to pull on the rails to keep up, reduce the incline or speed.',
          illustration: 'running',
        },
        {
          id: 'scale',
          title: 'The incline is optional',
          metric: 'Lower · slower · shorter',
          body: 'Start flatter, slower or for less time. A steep incline is demanding; adapt for your fitness and any joint symptoms. No guaranteed weight loss or need to repeat it every day.',
          illustration: 'running',
        },
      ],
    },
    [
      {
        title: 'Cleveland Clinic: 12-3-30 origins, technique and adaptations',
        url: 'https://health.clevelandclinic.org/12-3-30-workout',
      },
    ],
  ),
  guide(
    'workout-norwegian-4x4',
    'Norwegian 4×4 · aerobic intervals',
    'Understand the interval format before deciding whether hard cardio fits your training.',
    'Experienced · high intensity',
    {
      label: 'Research-led format',
      format: '4 × 4-minute intervals',
      equipment: 'Running route, bike or rower · optional heart-rate monitor',
      reviewedOn: '2026-10-21',
      cards: [
        {
          id: 'format',
          title: 'Four efforts. Recovery between.',
          metric: '4 min effort · 3 min active recovery',
          body: 'NTNU’s format uses four four-minute efforts, with three minutes of easier movement between them. This is controlled hard aerobic work, not an all-out sprint.',
          illustration: 'running',
        },
        {
          id: 'prepare',
          title: 'Don’t skip the easy parts',
          metric: '10 min warm-up · 10 min cool-down',
          body: 'NTNU describes building toward 90–95% of maximum heart rate during the latter half of each effort. Estimated heart-rate zones are imperfect; get guidance rather than chasing a watch reading.',
          illustration: 'running',
        },
        {
          id: 'scale',
          title: 'Build the base first',
          metric: 'Not a beginner fitness test',
          body: 'If you are new, returning after illness or have cardiovascular concerns, discuss intensity with a qualified professional. Start with manageable easy activity; do not force four hard intervals.',
          illustration: 'running',
        },
      ],
    },
    [
      {
        title: 'NTNU CERG: 4×4 protocol and heart-rate guidance',
        url: 'https://www.ntnu.edu/cerg/hrmax',
      },
    ],
  ),
  guide(
    'workout-annie',
    'Annie · rope & core',
    'A classic benchmark for people curious about skipping and coordinated movement.',
    'Skill-based · scalable',
    {
      label: 'Community classic',
      format: '50–40–30–20–10',
      equipment: 'Skipping rope · comfortable floor or mat',
      reviewedOn: '2026-10-21',
      cards: [
        {
          id: 'format',
          title: 'Two movements. Descending rounds.',
          metric: 'Double-unders + sit-ups',
          body: 'The original pairs 50 of each, then 40, 30, 20 and 10, for time. A double-under means the rope passes under your feet twice per jump. Learn the skill before adding speed.',
          illustration: 'crossfit',
        },
        {
          id: 'technique',
          title: 'Smooth beats frantic',
          metric: 'Relaxed rope rhythm',
          body: 'Keep jumps controlled and practise the rope separately. Use a comfortable sit-up range without yanking your neck. Do not race through pain or force a movement that does not suit you.',
          illustration: 'workout',
        },
        {
          id: 'scale',
          title: 'Single-unders count as a start',
          metric: '35–25–15–10–5',
          body: 'CrossFit’s beginner version pairs single-unders with sit-ups using these smaller rounds. Reduce further with coaching if needed. It is a conditioning benchmark, not a belly-fat remedy.',
          illustration: 'crossfit',
        },
      ],
    },
    [
      {
        title: 'CrossFit: Annie format and beginner variation',
        url: 'https://www.crossfit.com/benchmark/annie',
      },
    ],
  ),
];
