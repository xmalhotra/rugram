import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  fitnessAtlasLayouts,
  fitnessCrop,
  fitnessFrameCount,
} from '../shared/fitness-media-layout';
import type { FitnessMedia } from '../shared/fitness-guides';

// QA renders only. Does not alter any source atlas or production image.
async function main() {
  const output = resolve(process.argv[2] ?? 'reports/frame-crop-audit');
  mkdirSync(output, { recursive: true });
  const entries = [];
  for (const atlas of Object.keys(fitnessAtlasLayouts) as FitnessMedia['atlas'][]) {
    for (const gender of ['male', 'female'] as const) {
      const layout = fitnessAtlasLayouts[atlas][gender];
      const folder = atlas.startsWith('flow-')
        ? 'flows'
        : atlas.startsWith('nutrition-')
          ? 'nutrition'
          : atlas.startsWith('coding-')
            ? 'coding'
            : atlas === 'morning'
              ? 'lifestyle'
              : atlas === 'supplements'
                ? 'supplements'
                : 'fitness';
      const source = resolve(`mobile/assets/${folder}/${atlas}-${gender}-v1.jpg`);
      const image = readFileSync(source);
      const metadata = await sharp(image).metadata();
      if (metadata.width !== layout.width || metadata.height !== layout.height)
        throw new Error(`${source}: metadata mismatch`);
      const cells = [];
      const frames = [];
      let maxCount = 0;
      for (let row = 0; row < layout.rows.length - 1; row++) {
        const media = { atlas, row };
        const count = fitnessFrameCount(media, gender);
        maxCount = Math.max(maxCount, count);
        for (let frame = 0; frame < count; frame++) {
          const crop = fitnessCrop(media, gender, frame / (count - 1));
          const left = Math.ceil(crop.x),
            top = Math.ceil(crop.y);
          const width = Math.floor(crop.x + crop.width) - left;
          const height = Math.floor(crop.y + crop.height) - top;
          if (left < 0 || top < 0 || left + width > layout.width || top + height > layout.height)
            throw new Error(`${atlas}/${gender}/${row}/${frame}: outside image`);
          const tile = await sharp(image)
            .extract({ left, top, width, height })
            .resize(144, 144, { fit: 'contain', background: '#0b1510' })
            .png()
            .toBuffer();
          cells.push({ input: tile, left: frame * 150, top: row * 168 });
          cells.push({
            input: Buffer.from(
              `<svg width="144" height="20"><text x="4" y="14" fill="white" font-size="11">Row ${row + 1} · ${frame + 1}/${count}</text></svg>`,
            ),
            left: frame * 150,
            top: row * 168 + 145,
          });
          frames.push({ row, frame, count, crop });
        }
      }
      const file = `${atlas}-${gender}.png`;
      await sharp({
        create: {
          width: maxCount * 150,
          height: (layout.rows.length - 1) * 168,
          channels: 3,
          background: '#14201a',
        },
      })
        .composite(cells)
        .png()
        .toFile(resolve(output, file));
      entries.push({
        atlas,
        gender,
        source,
        hash: createHash('sha256').update(image).digest('hex'),
        file,
        frames,
      });
    }
  }
  writeFileSync(
    resolve(output, 'audit.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: 'Geometric checks and contact sheets; not phone or technique approval.',
        entries,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(output, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Flow frame crop audit</title>
<style>body{background:#07100a;color:white;font:16px system-ui;margin:24px}section{margin-bottom:40px}img{max-width:100%}h1{font-size:24px}</style>
<h1>Flow frame isolation review</h1><p>Each tile uses the production crop, contained in the fixed square viewport. This is not a phone screenshot or biomechanical validation.</p>
${entries.map(entry => `<section><h2>${entry.atlas} · ${entry.gender}</h2><img src="${entry.file}"></section>`).join('\n')}`,
  );
  console.log(
    JSON.stringify({
      output,
      atlases: entries.length,
      frames: entries.reduce((n, entry) => n + entry.frames.length, 0),
    }),
  );
}
void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
