import React from 'react';
import type { HabitFlow } from '../../shared/mobile';
import { gymExerciseId } from '../../shared/gym-flows';
import { ExerciseIcon, ExerciseVisual } from './ExerciseVisual';

export function FlowIllustration({ flow, cover = false }: { flow: HabitFlow; cover?: boolean }) {
  const gymId = gymExerciseId(flow.id);
  if (gymId) return <ExerciseVisual exerciseId={gymId} cover={cover} />;
  return <ExerciseIcon />;
}
