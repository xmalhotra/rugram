// Turns mobile/assets/howto/<id>-<n>.png into 512 px JPGs and writes the require map.
// Usage: node scripts/register-how-to-frames.mjs [--dir mobile/assets/howto] [--map mobile/src/how-to-frames.ts]
// Metro needs literal requires, so the map is generated. Don't edit that file by hand.
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { dirname, join, relative } from 'node:path';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const dir = option('--dir', 'mobile/assets/howto');
const mapFile = option('--map', 'mobile/src/how-to-frames.ts');
// The shared list is written only for the app's own folder (or when asked), so runs on a test folder can't overwrite it.
const loopsFile = option('--loops', dir === 'mobile/assets/howto' ? 'shared/how-to-loops.ts' : null);

for (const file of existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.png')) : []) {
  const path = join(dir, file);
  // sharp ships with Next.js and runs on macOS and the Linux CI alike.
  await sharp(path).resize(512, 512, { fit: 'inside' }).jpeg({ quality: 85 }).toFile(path.replace(/\.png$/, '.jpg'));
  rmSync(path);
}

const groups = new Map();
for (const file of existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.jpg')).sort() : []) {
  const match = /^(.*)-(\d+)\.jpg$/.exec(file);
  if (!match) continue;
  const frames = groups.get(match[1]) ?? [];
  frames.push({ n: Number(match[2]), file });
  groups.set(match[1], frames);
}

const lines = [...groups.keys()].sort().map(id => {
  const frames = groups.get(id).sort((a, b) => a.n - b.n);
  const requires = frames
    .map(frame => {
      let rel = relative(dirname(mapFile), join(dir, frame.file)).split('\\').join('/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `require('${rel}') as number`;
    })
    .join(', ');
  return `  '${id}': [${requires}],`;
});

writeFileSync(
  mapFile,
  `// Written by scripts/register-how-to-frames.mjs. Metro needs literal requires, so don't edit by hand.\n/* eslint-disable @typescript-eslint/no-require-imports */\nexport const howToFrames: Record<string, number[]> = {${
    lines.length ? `\n${lines.join('\n')}\n` : ''
  }};\n`,
);
// The same set for shared code (alternatives, flow content checks), which can't import Metro requires.
const withBoth = [...groups.keys()].sort().filter(id => {
  const numbers = groups.get(id).map(frame => frame.n);
  return numbers.includes(1) && numbers.includes(2);
});
if (loopsFile) writeFileSync(
  loopsFile,
  `/** Exercise ids that have both how-to frames (1 and 2) in mobile/assets/howto. Written by scripts/register-how-to-frames.mjs. */\nexport const howToLoopIds: ReadonlySet<string> = new Set([\n${withBoth.map(id => `  ${JSON.stringify(id)},`).join('\n')}\n]);\n`,
);
console.log(`${lines.length} how-to loops registered.`);
