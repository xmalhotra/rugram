/* eslint-disable @typescript-eslint/no-require-imports */
// Makes generated pictures' near-black background exactly the app's dark background (#050706),
// so they don't show as a slightly different square on the page. Usage: node scripts/match-icon-background.cjs <dir> ...
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BG = [5, 7, 6];
const FLOOR = 24; // Anything this dark is background or its compression noise.

/** Already on the app background: nearly every dark pixel is that exact colour, give or take compression. */
function alreadyMatched(data) {
  let dark = 0;
  let exact = 0;
  for (let i = 0; i < data.length; i += 3) {
    if (Math.max(data[i], data[i + 1], data[i + 2]) > FLOOR) continue;
    dark += 1;
    if (Math.abs(data[i] - BG[0]) <= 3 && Math.abs(data[i + 1] - BG[1]) <= 3 && Math.abs(data[i + 2] - BG[2]) <= 3)
      exact += 1;
  }
  return dark === 0 || exact / dark >= 0.9;
}

async function match(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Re-encoding a matched JPEG only loses quality and rewrites the file, so leave it.
  if (alreadyMatched(data)) return false;
  for (let i = 0; i < data.length; i += 3) {
    const level = Math.max(data[i], data[i + 1], data[i + 2]);
    if (level <= FLOOR) {
      data[i] = BG[0];
      data[i + 1] = BG[1];
      data[i + 2] = BG[2];
    } else if (level < 60) {
      // Soft edges ease from the background into the picture, so outlines stay smooth.
      const t = (level - FLOOR) / (60 - FLOOR);
      for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(BG[c] * (1 - t) + data[i + c] * t);
    }
  }
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(file, out);
  return true;
}

(async () => {
  let count = 0;
  for (const dir of process.argv.slice(2)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.jpg')) continue;
      if (await match(path.join(dir, name))) count += 1;
    }
  }
  console.log(`${count} pictures matched.`);
})();
