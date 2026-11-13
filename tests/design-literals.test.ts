import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(repoRoot, 'tests/design-literals.baseline.json');

/** Illustration files may hold colours. Exempt from the colour count only. */
const EXEMPT_FILES = [
  'Illustration',
  'BodyMap',
  'LaunchReveal',
  'BrandMark',
  'NeonBackdrop',
  'GymCardFace',
  'CatalogCover',
];

const CATEGORIES = ['literals', 'colours', 'pressable', 'symbols', 'modal', 'loading'] as const;
type Category = (typeof CATEGORIES)[number];
type Counts = Record<Category, number>;
type Snapshot = { totals: Counts; files: Record<string, Counts> };

const LITERALS = /\b(fontSize|borderRadius|gap|padding[A-Za-z]*|margin[A-Za-z]*)\s*:\s*-?[0-9.]+/g;
const HEX = /(['"`])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\1/g;
const RGBA = /rgba\(/g;
const PRESSABLE = /<Pressable/g;
const MODAL = /<Modal/g;
const LOADING = /Loading[^'"`<]*…/g;
const SYMBOL = /[←›‹→✓]/g;
// Tag text: ">" ending a tag, then characters up to the next "<".
const TEXT_NODE = new RegExp('(?<=[A-Za-z0-9_$}"\'`)/])>([^<]*)<', 'g');

function emptyCounts(): Counts {
  return { literals: 0, colours: 0, pressable: 0, symbols: 0, modal: 0, loading: 0 };
}

function countPattern(source: string, pattern: RegExp): number {
  return [...source.matchAll(new RegExp(pattern.source, 'g'))].length;
}

function countSymbols(source: string): number {
  let count = 0;
  for (const match of source.matchAll(new RegExp(TEXT_NODE.source, 'g'))) {
    const text = match[1] ?? '';
    if (text.includes(';') || text.includes('/*') || /(^|\n)\s*\/\//.test(text)) continue;
    count += [...text.matchAll(new RegExp(SYMBOL.source, 'g'))].length;
  }
  return count;
}

function isColourExempt(file: string): boolean {
  const name = file.split('/').pop() ?? file;
  return EXEMPT_FILES.some(token => name.includes(token));
}

function countSource(source: string, file: string): Counts {
  return {
    literals: countPattern(source, LITERALS),
    colours: isColourExempt(file) ? 0 : countPattern(source, HEX) + countPattern(source, RGBA),
    pressable: countPattern(source, PRESSABLE),
    symbols: countSymbols(source),
    modal: countPattern(source, MODAL),
    loading: countPattern(source, LOADING),
  };
}

function walk(dir: string, files: string[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const relPath = relative(repoRoot, full).split(sep).join('/');
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || relPath === 'mobile/src/design') continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
    if (relPath.split('/').includes('node_modules') || relPath.startsWith('mobile/src/design/')) {
      continue;
    }
    files.push(relPath);
  }
}

function sourceFiles(): string[] {
  const files: string[] = [];
  for (const root of ['mobile/src', 'mobile/app']) walk(join(repoRoot, root), files);
  files.push('mobile/App.tsx');
  return [...new Set(files)].sort();
}

function scan(): Snapshot {
  const files: Record<string, Counts> = {};
  const totals = emptyCounts();
  for (const file of sourceFiles()) {
    const counts = countSource(readFileSync(join(repoRoot, file), 'utf8'), file);
    if (CATEGORIES.every(category => counts[category] === 0)) continue;
    files[file] = counts;
    for (const category of CATEGORIES) totals[category] += counts[category];
  }
  return { totals, files };
}

function printTotals(totals: Counts) {
  const rows = CATEGORIES.map(category => [category, String(totals[category])]);
  const nameWidth = Math.max('category'.length, ...rows.map(row => row[0].length));
  const totalWidth = Math.max('total'.length, ...rows.map(row => row[1].length));
  console.log(`${'category'.padEnd(nameWidth)}  ${'total'.padStart(totalWidth)}`);
  for (const [name, total] of rows) {
    console.log(`${name.padEnd(nameWidth)}  ${total.padStart(totalWidth)}`);
  }
}

/**
 * Screens open sheets through `Sheet` / `DetailSurface`, never a raw Modal.
 * StoryViewer is the one exception: a full-screen story that fades in.
 */
const MODAL_EXEMPT = ['mobile/src/StoryViewer.tsx'];

test('no screen opens a raw Modal', () => {
  const offenders = Object.entries(scan().files)
    .filter(([file, counts]) => counts.modal > 0 && !MODAL_EXEMPT.includes(file))
    .map(([file]) => file);
  assert.deepEqual(offenders, []);
});

test('hand-typed design values stay at or under the baseline', () => {
  const current = scan();
  printTotals(current.totals);
  if (process.env.UPDATE_DESIGN_BASELINE === '1') {
    writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
    return;
  }
  assert.ok(existsSync(baselinePath), 'tests/design-literals.baseline.json is missing');
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Snapshot;
  const failures: string[] = [];
  for (const category of CATEGORIES) {
    const was = baseline.totals?.[category] ?? 0;
    const now = current.totals[category];
    if (now > was) failures.push(`${category} total is ${now}, baseline is ${was}`);
  }
  for (const [file, counts] of Object.entries(current.files)) {
    const prior = baseline.files?.[file];
    for (const category of CATEGORIES) {
      const was = prior?.[category] ?? 0;
      if (counts[category] > was) {
        failures.push(`${file} ${category} is ${counts[category]}, baseline is ${was}`);
      }
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});
