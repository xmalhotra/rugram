import type { RoutineCheckpoint, RoutineTypeFilter } from '../../shared/routines';

/** Which routine screen is open. Shared by Daily and the Flows tab. */
export type RoutineRoute = {
  checkpoint: RoutineCheckpoint | null;
  search: boolean;
  routineId: string | null;
  fromCheckpoint: RoutineCheckpoint | null;
  swapDailyId: string | null;
  type: RoutineTypeFilter;
  /** Bumps when Daily asks the catalog to show the Routine section. */
  section: number;
};

export const emptyRoutineRoute: RoutineRoute = {
  checkpoint: null,
  search: false,
  routineId: null,
  fromCheckpoint: null,
  swapDailyId: null,
  type: 'All',
  section: 0,
};

export function checkpointRoute(checkpoint: RoutineCheckpoint, swapDailyId?: string): RoutineRoute {
  return {
    ...emptyRoutineRoute,
    checkpoint,
    fromCheckpoint: checkpoint,
    swapDailyId: swapDailyId ?? null,
  };
}

export function sectionRoute(): RoutineRoute {
  return { ...emptyRoutineRoute, section: Date.now() };
}
