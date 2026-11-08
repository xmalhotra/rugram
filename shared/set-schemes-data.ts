/** Seeded patterns. A new pattern is another object here, or one added by an admin. */
export const setSchemes = [
  {
    id: 'straight',
    title: 'Straight sets',
    about: 'Same reps and weight on every set.',
    amount: 'hold' as const,
    load: 'hold' as const,
  },
  {
    id: 'pyramid',
    title: 'Pyramid',
    about: 'Weight goes up and reps come down each set.',
    amount: 'down' as const,
    load: 'up' as const,
  },
  {
    id: 'reverse-pyramid',
    title: 'Reverse pyramid',
    about: 'The heaviest set comes first, then lighter sets with more reps.',
    amount: 'up' as const,
    load: 'down' as const,
  },
  {
    id: 'descending',
    title: 'Falling reps',
    about: 'The weight stays put, and the reps or time come down as you tire.',
    amount: 'down' as const,
    load: 'hold' as const,
  },
  {
    id: 'drop-set',
    title: 'Drop sets',
    about: 'The weight drops by two steps each set, and the reps stay up.',
    amount: 'hold' as const,
    load: 'down' as const,
    loadSteps: 2,
  },
];
