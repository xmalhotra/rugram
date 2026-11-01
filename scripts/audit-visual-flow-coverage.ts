import { readFileSync } from 'node:fs';
import { flows } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { fitnessMedia } from '../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import { imageSize } from './image-size';

const issues: string[] = [];
const report = flows.map(flow => {
  const resolved = resolveVisualFlow(flow, flows);
  if (!resolved.cards.length) issues.push(`${flow.id}: no cards`);
  const cards = resolved.cards.map(card => {
    const media = card.visualCard?.media ?? fitnessMedia[card.id];
    if (!media) {
      issues.push(`${card.id}: no image sequence`);
      return { id: card.id, frames: 0 };
    }
    const frameCount = fitnessAtlasLayouts[media.atlas].male.columns;
    if (frameCount < 5) issues.push(`${card.id}: fewer than five frames`);
    for (const gender of ['male', 'female'] as const) {
      const atlas = fitnessAtlasLayouts[media.atlas][gender];
      if (media.row < 0 || media.row >= atlas.rows.length - 1)
        issues.push(`${card.id}: invalid row`);
      const folder = media.atlas.startsWith('flow-')
        ? 'flows'
        : media.atlas.startsWith('nutrition-')
          ? 'nutrition'
          : media.atlas.startsWith('coding-')
            ? 'coding'
            : media.atlas === 'morning'
              ? 'lifestyle'
              : media.atlas === 'supplements'
                ? 'supplements'
                : 'fitness';
      try {
        const source = readFileSync(`mobile/assets/${folder}/${media.atlas}-${gender}-v1.jpg`);
        if (imageSize(source).width !== atlas.width || imageSize(source).height !== atlas.height)
          issues.push(`${card.id}: ${gender} dimensions`);
      } catch {
        issues.push(`${card.id}: ${gender} file missing`);
      }
      for (let frame = 0; frame < atlas.columns; frame++) {
        const crop = fitnessCrop(media, gender, frame / (atlas.columns - 1));
        if (
          crop.x < 0 ||
          crop.y < 0 ||
          crop.x + crop.width > atlas.width ||
          crop.y + crop.height > atlas.height
        )
          issues.push(`${card.id}: out-of-bounds crop`);
      }
    }
    return {
      id: card.id,
      title: card.title,
      atlas: media.atlas,
      row: media.row,
      frames: frameCount,
    };
  });
  return { id: flow.id, title: flow.title, convertedFromLegacy: resolved.adapted, cards };
});
console.log(
  JSON.stringify(
    {
      checkedOn: '2026-10-24',
      totalFlows: report.length,
      convertedFlows: report.filter(flow => flow.convertedFromLegacy).length,
      textOnlyFlows: report.filter(flow => !flow.cards.length).length,
      issues,
      flows: report,
    },
    null,
    2,
  ),
);
if (issues.length) process.exitCode = 1;
