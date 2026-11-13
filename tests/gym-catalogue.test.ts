import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  catalogFlowLine,
  catalogFlows,
  catalogProgrammes,
  flowsInTile,
  programmesInTile,
  tilesInSection,
} from '../shared/flow-catalog';
import { gymEstimatedMinutes, gymFlowById, gymFlowIsLive, gymRestSeconds } from '../shared/gym-flows';
import { restFor } from '../shared/exercise-rest';

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
const bodyParts = ['gym-back', 'gym-biceps', 'gym-chest', 'gym-triceps', 'gym-shoulders', 'gym-legs', 'gym-core', 'gym-arms'];

test('every gym catalogue flow points at a gym flow, and live follows its exercises', () => {
  const gymTiles = new Set(tilesInSection('gym').map(tile => tile.id));
  const gymCatalog = catalogFlows.filter(flow => gymTiles.has(flow.tileId));
  assert.ok(gymCatalog.length > 0);
  for (const flow of gymCatalog) {
    assert.ok(flow.flowId, flow.id);
    const gym = gymFlowById(flow.flowId);
    assert.ok(gym, `${flow.id} does not resolve`);
    assert.equal(flow.level, gym.level, flow.id);
    assert.equal(flow.status, gymFlowIsLive(flow.flowId) ? 'live' : 'coming-soon', flow.id);
    assert.equal(gymFlowIsLive(flow.flowId), gym.items.length > 0);
  }
  const back = catalogFlows.find(flow => flow.id === 'gym-supersets-back-biceps-superset');
  assert.equal(back?.flowId, 'gym-back-biceps');
  assert.equal(back?.status, 'live');
  const arms = catalogFlows.find(flow => flow.id === 'gym-arms-beginner');
  assert.equal(arms?.status, 'live');
  assert.ok((gymFlowById('gym-arms-beginner')?.items.length ?? 0) > 0);
});

test('body-part, superset and full-body tiles have every level, and splits are intermediate programmes', () => {
  for (const tileId of bodyParts) {
    const flows = flowsInTile(tileId);
    assert.deepEqual(
      levels.map(level => flows.filter(flow => flow.level === level).length),
      [1, 1, 1],
      tileId,
    );
  }
  const pairings = ['Back + Biceps', 'Chest + Triceps', 'Shoulders + Arms', 'Legs + Core'];
  for (const pairing of pairings) {
    const flows = flowsInTile('gym-supersets').filter(flow => flow.tags.includes(pairing));
    assert.deepEqual(
      flows.map(flow => flow.level),
      [...levels],
      pairing,
    );
  }
  assert.equal(flowsInTile('gym-supersets').length, 12);
  for (const level of levels) {
    const days = flowsInTile('gym-full').filter(flow => flow.level === level);
    assert.deepEqual(
      days.map(flow => flow.title),
      ['Day 1', 'Day 2', 'Day 3'],
      level,
    );
  }
  const splits = flowsInTile('gym-splits');
  assert.ok(splits.length > 0);
  assert.ok(splits.every(flow => flow.level === 'Intermediate'));
  const covered = catalogProgrammes.flatMap(programme => programme.days);
  assert.deepEqual(covered.sort(), splits.map(flow => flow.id).sort());
  assert.equal(new Set(covered).size, covered.length);
  assert.deepEqual(
    programmesInTile('gym-splits').map(programme => programme.title),
    ['Upper/Lower 4-day', 'Push/Pull/Legs', 'Power + size', 'Strength + conditioning'],
  );
});

test('estimated minutes are sets times 45 seconds plus rest, plus 6 minutes', () => {
  const back = gymFlowById('gym-back-biceps');
  assert.ok(back);
  const seconds = back.items.reduce((total, entry) => total + entry.sets * (45 + gymRestSeconds(entry)), 0);
  assert.equal(gymEstimatedMinutes(back), Math.round((seconds + 6 * 60) / 60));
  assert.equal(gymEstimatedMinutes({ items: [{ exerciseId: 'barbell-curl', sets: 12, restSeconds: 90 }] }), 33);
  assert.equal(
    gymEstimatedMinutes({ items: [{ exerciseId: 'barbell-curl', sets: 1 }] }),
    Math.round((45 + restFor('barbell-curl') + 6 * 60) / 60),
  );
  const listed = catalogFlows.find(flow => flow.flowId === 'gym-back-biceps');
  assert.ok(listed);
  assert.match(catalogFlowLine(listed), /^Intermediate · \d+ min · 6 exercises$/);
});

test('the gym tile page remembers the level and a split day can join the routine', () => {
  const source = readFileSync('mobile/src/FlowCatalogTile.tsx', 'utf8');
  assert.match(source, /usePaneState\(`catalogLevel:\$\{tileId\}`, 'All'\)/);
  assert.match(source, /\['All', \.\.\.levels\]/);
  assert.match(source, /programmesInTile/);
  assert.match(source, /Add to Daily flow/);
  const cover = readFileSync('mobile/src/CatalogCover.tsx', 'utf8');
  assert.match(cover, /'gym-arms': 'hammer-curl'/);
  assert.match(cover, /'gym-splits': 'hack-squat'/);
});
