import { exerciseMuscles } from './muscle-map';

/** Flows whose exercises must have a loop, an icon, how-to text and a focus area. */
export const completeCollections = ['cal-upper-beginner', 'cal-upper-intermediate'];

export const standardPartNames = {
  loop: 'Loop',
  icon: 'Icon',
  howTo: 'How to do it',
  video: 'Video',
  focus: 'Focus area',
} as const;

export type ExerciseStandard = {
  loop: boolean;
  icon: boolean;
  howTo: boolean;
  video: boolean;
  focus: boolean;
  missing: string[];
};

export type HowToPresence = {
  exerciseId: string;
  videoUrl?: string | null;
  status?: 'draft' | 'live';
};

function listed(ids: ReadonlySet<string> | readonly string[], id: string) {
  for (const item of ids) if (item === id) return true;
  return false;
}

/** Keys of a picture map, read from the source so `require` is never run. */
export function resourceIds(source: string) {
  const ids = new Set<string>();
  for (const match of source.matchAll(/^\s*'([^']+)'\s*:/gm)) {
    if (match[1]) ids.add(match[1]);
  }
  return ids;
}

/** Which parts of the standard this exercise has. `video` needs a videoUrl on the how-to. */
export function exerciseStandard(
  exerciseId: string,
  sources: {
    frameIds: ReadonlySet<string> | readonly string[];
    iconIds: ReadonlySet<string> | readonly string[];
    howTos: readonly HowToPresence[];
  },
): ExerciseStandard {
  const howTo = sources.howTos.find(row => row.exerciseId === exerciseId && row.status !== 'draft');
  const focus = (exerciseMuscles[exerciseId]?.main.length ?? 0) > 0;
  const parts = {
    loop: listed(sources.frameIds, exerciseId),
    icon: listed(sources.iconIds, exerciseId),
    howTo: Boolean(howTo),
    video: Boolean(howTo?.videoUrl),
    focus,
  };
  const missing: string[] = [];
  if (!parts.loop) missing.push(standardPartNames.loop);
  if (!parts.icon) missing.push(standardPartNames.icon);
  if (!parts.howTo) missing.push(standardPartNames.howTo);
  if (!parts.video) missing.push(standardPartNames.video);
  if (!parts.focus) missing.push(standardPartNames.focus);
  return { ...parts, missing };
}
