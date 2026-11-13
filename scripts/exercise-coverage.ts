import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { seededHowTos } from '../shared/exercise-how-to';
import { exerciseStandard, resourceIds, standardPartNames } from '../shared/exercise-standard';
import { usedExerciseIds } from '../shared/exercise-usage';

const partNames = [
  standardPartNames.loop,
  standardPartNames.icon,
  standardPartNames.howTo,
  standardPartNames.video,
  standardPartNames.focus,
];

export function coverageReport() {
  const frameIds = resourceIds(readFileSync('mobile/src/how-to-frames.ts', 'utf8'));
  const iconIds = resourceIds(readFileSync('mobile/src/exercise-icons.ts', 'utf8'));
  const howTos = seededHowTos();
  const ids = usedExerciseIds();
  const counts = new Map<string, number>(partNames.map(part => [part, 0]));
  const lines = ids.map(id => {
    const result = exerciseStandard(id, { frameIds, iconIds, howTos });
    for (const part of result.missing) counts.set(part, (counts.get(part) ?? 0) + 1);
    return `${id}: ${result.missing.length ? result.missing.join(', ') : 'none'}`;
  });
  const summary = `Summary: ${ids.length} exercises. Missing ${partNames.map(part => `${part} ${counts.get(part) ?? 0}`).join(', ')}.`;
  return [...lines, summary].join('\n');
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  process.stdout.write(`${coverageReport()}\n`);
}
