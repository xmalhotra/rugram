/* eslint-disable @typescript-eslint/no-require-imports */
// Makes generated pictures' near-black background exactly the app's dark background (#050706),
// so they don't show as a slightly different square on the page. Usage: node scripts/match-icon-background.cjs <dir> ...
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BG = [5, 7, 6];
const FLOOR = 24; // Anything this dark is background or its compression noise.

async function match(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
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
}

(async () => {
  let count = 0;
  for (const dir of process.argv.slice(2)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.jpg')) continue;
      await match(path.join(dir, name));
      count += 1;
    }
  }
  console.log(`${count} pictures matched.`);
})();
