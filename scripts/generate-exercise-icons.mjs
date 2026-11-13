// Generates small exercise icons with xAI's image API and registers them for the app.
// Usage: node scripts/generate-exercise-icons.mjs [--all] [--force] [--dry-run] [--register] [exercise-id ...]
// With no ids it covers the Back + Biceps flow. Existing icons are kept unless --force.
// Needs XAI_API_KEY in .env.local. XAI_IMAGE_MODEL picks the model; otherwise it uses the first one xAI lists.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const named = args.filter(arg => !arg.startsWith('--'));
const outDir = 'mobile/assets/exercises';
const mapFile = 'mobile/src/exercise-icons.ts';

function catalog() {
  // The catalog is TypeScript, so read it through tsx rather than copying it here.
  const source = `import {gymExercises as e} from './shared/exercises';import {gymFlows as f} from './shared/gym-flows';
console.log(JSON.stringify({all:e.map(x=>({id:x.id,name:x.name,muscle:x.muscles[0],equipment:x.equipment})),flow:f[0].items.map(i=>i.exerciseId)}))`;
  return JSON.parse(execFileSync('npx', ['tsx', '--eval', source], { encoding: 'utf8' }));
}

const prompt = item =>
  [
    `A small, minimal app icon of one person doing the gym exercise "${item.name}" (${item.equipment}).`,
    'Simple flat silhouette in light grey, side view, whole body and the equipment visible, centred with generous margin.',
    `The ${item.muscle} muscles highlighted in mint green #79F5B1.`,
    'Plain solid near-black background #0A0B0B. Clean bold shapes that read at 56 pixels.',
    'No text, no logos, no brand names, no face details, no border, no shadow, no gym scenery.',
  ].join(' ');

function register() {
  const files = existsSync(outDir) ? readdirSync(outDir).filter(file => file.endsWith('.jpg')).sort() : [];
  const lines = files.map(
    file => `  '${file.replace(/\.jpg$/, '')}': require('../assets/exercises/${file}') as number,`,
  );
  writeFileSync(
    mapFile,
    `// Written by scripts/generate-exercise-icons.mjs. Metro needs literal requires, so don't edit by hand.\n${
      lines.length ? '/* eslint-disable @typescript-eslint/no-require-imports */\n' : ''
    }export const exerciseIcons: Record<string, number> = {${lines.length ? `\n${lines.join('\n')}\n` : ''}};\n`,
  );
  return files.length;
}

const { all, flow } = catalog();
const wanted = flag('--all') ? all.map(item => item.id) : named.length ? named : flow;
const items = wanted.map(id => {
  const item = all.find(entry => entry.id === id);
  if (!item) throw new Error(`Unknown exercise: ${id}`);
  return item;
});
const todo = items.filter(item => flag('--force') || !existsSync(`${outDir}/${item.id}.jpg`));

if (flag('--register')) {
  // Icons made elsewhere, such as Cursor's image tool: shrink new PNGs, then register everything.
  for (const file of existsSync(outDir) ? readdirSync(outDir).filter(name => name.endsWith('.png')) : []) {
    const path = `${outDir}/${file}`;
    execFileSync('sips', ['-Z', '256', '-s', 'format', 'jpeg', path, '--out', path.replace(/\.png$/, '.jpg')], {
      stdio: 'ignore',
    });
    rmSync(path);
  }
  console.log(`${register()} icons registered.`);
  process.exit(0);
}
if (flag('--dry-run')) {
  console.log(`${todo.length} to generate of ${items.length}.`);
  if (todo[0]) console.log(`Example prompt: ${prompt(todo[0])}`);
  process.exit(0);
}
const key = process.env.XAI_API_KEY;
if (!key) {
  console.error('Add XAI_API_KEY to .env.local first.');
  process.exit(1);
}
let model = process.env.XAI_IMAGE_MODEL;
if (!model) {
  const listed = await fetch('https://api.x.ai/v1/image-generation-models', {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!listed.ok) {
    console.error(`Could not list image models: HTTP ${listed.status}. Set XAI_IMAGE_MODEL in .env.local.`);
    process.exit(1);
  }
  model = (await listed.json()).models?.[0]?.id;
  if (!model) {
    console.error('xAI listed no image models. Set XAI_IMAGE_MODEL in .env.local.');
    process.exit(1);
  }
}
console.log(`Using ${model}.`);
mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const item of todo) {
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt: prompt(item), n: 1, response_format: 'b64_json' }),
  });
  if (!response.ok) {
    failed += 1;
    console.error(`${item.id}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    if (response.status === 401 || response.status === 403 || response.status === 429) break;
    continue;
  }
  const body = await response.json();
  const data = body.data?.[0]?.b64_json;
  if (!data) {
    failed += 1;
    console.error(`${item.id}: no image in the response`);
    continue;
  }
  const path = `${outDir}/${item.id}.jpg`;
  writeFileSync(path, Buffer.from(data, 'base64'));
  // Icons show at about 56 points, so keep them small in the app bundle.
  execFileSync('sips', ['-Z', '256', path], { stdio: 'ignore' });
  console.log(`${item.id}: done`);
}
console.log(`${register()} icons registered. ${failed} failed.`);
process.exit(failed ? 1 : 0);
