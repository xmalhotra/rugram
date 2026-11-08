// Turns mobile/assets/howto/<id>-<n>.png into 512 px JPGs and writes the require map.
// Usage: node scripts/register-how-to-frames.mjs [--dir mobile/assets/howto] [--map mobile/src/how-to-frames.ts]
// Metro needs literal requires, so the map is generated. Don't edit that file by hand.
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const dir = option('--dir', 'mobile/assets/howto');
const mapFile = option('--map', 'mobile/src/how-to-frames.ts');

for (const file of existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.png')) : []) {
  const path = join(dir, file);
  execFileSync('sips', ['-Z', '512', '-s', 'format', 'jpeg', path, '--out', path.replace(/\.png$/, '.jpg')], {
    stdio: 'ignore',
  });
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
console.log(`${lines.length} how-to loops registered.`);
