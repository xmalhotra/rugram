/** Checkpoints, in the order a day uses them. */
export const routineCheckpoints = [
  'Wake up',
  'Morning',
  'Mid-morning',
  'Lunch',
  'Afternoon',
  'Pre-workout',
  'Post-workout',
  'Dinner',
  'Before bed',
] as const;

export const routineTypes = ['Drink', 'Food', 'Supplement', 'Habit'] as const;

export type RoutineCheckpoint = (typeof routineCheckpoints)[number];
export type RoutineType = (typeof routineTypes)[number];

export type RoutineItem = {
  id: string;
  name: string;
  aliases: string[];
  type: RoutineType;
  serving: string | null;
};

export type RoutinePart = {
  itemId: string;
  amount: string | null;
  position: number;
};

export type Routine = {
  id: string;
  title: string;
  aliases: string[];
  type: RoutineType;
  mainCheckpoint: RoutineCheckpoint;
  checkpoints: RoutineCheckpoint[];
  region: string;
  rank: number;
  parts: RoutinePart[];
};

/** What the app shows for one routine. Amounts describe the routine. */
export type RoutineCard = {
  id: string;
  title: string;
  type: RoutineType;
  mainCheckpoint: RoutineCheckpoint;
  checkpoints: RoutineCheckpoint[];
  parts: { name: string; amount: string | null }[];
};

export const routineTypeFilters = [
  { id: 'All', label: 'All' },
  { id: 'Drink', label: 'Drinks' },
  { id: 'Food', label: 'Food' },
  { id: 'Supplement', label: 'Supplements' },
  { id: 'Habit', label: 'Habits' },
] as const;

export type RoutineTypeFilter = (typeof routineTypeFilters)[number]['id'];

export function routineSlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
