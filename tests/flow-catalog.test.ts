import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  catalogFlow,
  catalogFlows,
  catalogSections,
  catalogTiles,
  flowsInTile,
  sectionsInRoot,
  sectionsWithTiles,
  tilesInSection,
} from '../shared/flow-catalog';

const tileTitles = [
  ['Gym', ['Back', 'Biceps', 'Chest', 'Triceps', 'Shoulders', 'Legs', 'Core', 'Supersets', 'Full Body']],
  ['Calisthenics', ['Upper Body', 'Pull', 'Push', 'Legs', 'Core', 'Skills', 'Full Body']],
  ['CrossFit', ['Benchmark WODs', 'AMRAP', 'EMOM', 'For Time', 'Hero WODs']],
  ['Home Workouts', ['No Equipment', 'Dumbbells', 'Resistance Bands', 'Under 20 Minutes']],
  ['Running', ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultramarathon', 'Trail', 'Drills & Plyometrics']],
  ['Endurance Events', ['Sprint Triathlon', 'Olympic Triathlon', 'Half Ironman', 'Ironman', 'Duathlon', 'HYROX']],
] as const;

test('fitness catalog ids are unique and nothing is live yet', () => {
  const ids = [
    ...catalogSections.map(section => section.id),
    ...catalogTiles.map(tile => tile.id),
    ...catalogFlows.map(flow => flow.id),
  ];
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(catalogFlows.length > 0);
  assert.ok(catalogFlows.every(flow => flow.status === 'coming-soon'));
  assert.equal(catalogFlow('missing'), undefined);
});

test('every section has its tiles and every flow points at a real tile', () => {
  assert.deepEqual(
    sectionsWithTiles().map(section => [section.title, section.tiles.map(tile => tile.title)]),
    tileTitles.map(([title, tiles]) => [title, [...tiles]]),
  );
  for (const section of catalogSections) {
    const tiles = tilesInSection(section.id);
    assert.ok(tiles.length > 0);
    assert.ok(tiles.every(tile => tile.sectionId === section.id));
  }
  const tileIds = new Set(catalogTiles.map(tile => tile.id));
  for (const flow of catalogFlows) {
    assert.ok(tileIds.has(flow.tileId), flow.id);
    assert.ok(flowsInTile(flow.tileId).includes(flow));
    assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(flow.level));
  }
  for (const tile of catalogTiles) {
    const count = flowsInTile(tile.id).length;
    if (tile.id === 'run-drills') {
      assert.equal(count, 0);
      continue;
    }
    assert.ok(count >= 2 && count <= 4, tile.title);
  }
  const supersets = catalogTiles.find(tile => tile.title === 'Supersets')!;
  for (const chip of supersets.chips ?? [])
    assert.ok(flowsInTile(supersets.id).some(flow => flow.tags.includes(chip)));
  assert.ok(catalogFlows.some(flow => flow.title === 'Cindy'));
  assert.ok(catalogFlows.some(flow => flow.title === 'Fran'));
  assert.ok(catalogFlows.some(flow => flow.title === 'First marathon, 16 weeks'));
});

test('the Flows tab shows the fitness catalog and not the old category browser', () => {
  const app = readFileSync('mobile/App.tsx', 'utf8');
  const home = readFileSync('mobile/src/FlowCatalogHome.tsx', 'utf8');
  assert.match(app, /<FlowCatalogHome/);
  assert.doesNotMatch(app, /FlowCategories|label: group.title|usePaneState\('flowGroup'/);
  assert.match(home, /sectionsInRoot/);
  assert.match(home, /usePaneState\('catalogScroll'/);
  assert.doesNotMatch(home, /Lifestyle|Tech/);
});

test('Fitness holds the six sections, and Gym holds Biceps', () => {
  assert.deepEqual(
    sectionsInRoot('fitness').map(section => section.title),
    ['Gym', 'Calisthenics', 'CrossFit', 'Home Workouts', 'Running', 'Endurance Events'],
  );
  assert.ok(tilesInSection('gym').some(tile => tile.title === 'Biceps'));
});
