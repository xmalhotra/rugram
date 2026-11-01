import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { flows } from '../shared/mobile';
import { flowsForFocus, focusOptions } from '../shared/focus';
import { movementBrowseLibrary } from '../shared/animal-movements';
import { flowCategoryGroups } from '../shared/flow-categories';
import {
  cindyMovementFlows,
  fitnessCollectionChildren,
  fitnessGuideFlows,
  fitnessMedia,
  hyroxFlows,
  hyroxStations,
  isFitnessVisualFlow,
  runningStyleFlows,
} from '../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import {
  heldMovementFrame,
  movementFrame,
  movementImageFit,
  type Demonstrator,
} from '../shared/movement-viewer';
import { flowContentSchema } from '../src/lib/content-validation';
import { imageSize } from '../scripts/image-size';

test('Fitness browse adds the requested gym technique collection beside Cindy and Animal movements', () => {
  assert.deepEqual(
    flowsForFocus(flows, 'workout').map(flow => flow.title),
    ['Cindy', 'Animal movements', 'Enhance gym techniques'],
  );
  assert.deepEqual(
    flowsForFocus(flows, 'running').map(flow => flow.title),
    ['Running styles'],
  );
  assert.deepEqual(
    flowsForFocus(flows, 'hyrox').map(flow => flow.title),
    ['Full HYROX', 'Half HYROX'],
  );
  const stale = [{ id: 'workout', flowIds: ['workout-annie', 'workout-12-3-30'] }];
  assert.deepEqual(
    flowsForFocus(flows, 'workout', stale).map(flow => flow.id),
    ['workout-cindy', 'workout-animal-movements', 'workout-enhance-gym-techniques'],
  );
  const groups = flowCategoryGroups(
    [...focusOptions, { id: 'crossfit' }],
    [
      {
        id: 'fitness',
        title: 'Fitness',
        illustration: 'workout',
        focusIds: ['workout', 'crossfit', 'running', 'hyrox'],
      },
    ],
  );
  assert.ok(groups.every(group => !group.focusIds.includes('crossfit')));
  assert.ok(!focusOptions.some(option => String(option.id) === 'crossfit'));
});

test('Cindy and running open ordered visual pages, not additional browse categories', () => {
  assert.deepEqual(
    cindyMovementFlows.map(flow => flow.title),
    ['Pull-up', 'Push-up', 'Air squat'],
  );
  assert.deepEqual(
    runningStyleFlows.map(flow => flow.title),
    ['Run / walk', 'Easy running', 'Tempo running', 'Running intervals', 'Hill running'],
  );
  const browse = movementBrowseLibrary(flows);
  for (const children of Object.values(fitnessCollectionChildren))
    for (const id of children) assert.ok(!browse.some(flow => flow.id === id));
  for (const parent of Object.keys(fitnessCollectionChildren)) {
    assert.ok(browse.some(flow => flow.id === parent));
    assert.ok(isFitnessVisualFlow(parent));
  }
  const oldCindy = flows.map(flow =>
    flow.id === 'workout-cindy' ? { ...flow, relatedFlowIds: undefined } : flow,
  );
  assert.ok(!movementBrowseLibrary(oldCindy).some(flow => flow.id === 'cindy-squat'));
  for (const id of [
    'workout-annie',
    'workout-12-3-30',
    'workout-norwegian-4x4',
    'fitness-crossfit-start',
  ])
    assert.ok(
      flows.some(flow => flow.id === id),
      'Saved legacy flow IDs survive',
    );
});

test('all new guide records validate and reference available visual media', () => {
  for (const flow of fitnessGuideFlows) {
    const result = flowContentSchema.safeParse(flow);
    assert.ok(result.success, `${flow.id}: ${JSON.stringify(result.error)}`);
    assert.ok(flow.sources?.length);
    for (const id of flow.relatedFlowIds ?? []) {
      assert.ok(flows.some(item => item.id === id));
      assert.ok(fitnessMedia[id]);
    }
  }
});

test('Full and Half HYROX retain run/station order and halve only distance and repetitions', () => {
  for (const [index, parent] of hyroxFlows.entries()) {
    const half = index === 1;
    assert.equal(parent.relatedFlowIds?.length, 16);
    const pages = parent.relatedFlowIds!.map(id => flows.find(flow => flow.id === id)!);
    for (let station = 0; station < 8; station++) {
      assert.match(pages[station * 2].title, new RegExp(`^Run ${station + 1}`));
      assert.match(
        pages[station * 2].sessionGuide!.format,
        new RegExp(`${half ? 500 : 1000} m before`),
      );
      assert.equal(pages[station * 2 + 1].title, `${station + 1}. ${hyroxStations[station].title}`);
      assert.equal(
        pages[station * 2 + 1].sessionGuide!.format,
        `${hyroxStations[station].volume * (half ? 0.5 : 1)} ${hyroxStations[station].unit}`,
      );
      assert.match(
        pages[station * 2 + 1].sessionGuide!.cards[1].body,
        /demonstrator does not change weights/,
      );
    }
  }
  assert.match(hyroxFlows[1].description, /not an official race category/);
  assert.match(hyroxFlows[1].description, /weights are not automatically halved/);
});

test('new visual sequences have at least five usable positions, bounded crops and the same square stage', () => {
  for (const media of Object.values(fitnessMedia)) {
    for (const gender of ['male', 'female'] as Demonstrator[]) {
      const atlas = fitnessAtlasLayouts[media.atlas][gender];
      assert.ok(atlas.columns >= 5);
      for (let phase = 0; phase < atlas.columns; phase++) {
        const progress = phase / (atlas.columns - 1);
        const crop = fitnessCrop(media, gender, progress);
        assert.equal(movementFrame(progress, atlas.columns), phase);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.width <= atlas.width && crop.y + crop.height <= atlas.height);
        const fit = movementImageFit(crop, 360, 480);
        assert.equal(fit.width, 360);
        assert.equal(fit.height, 360);
        assert.ok(fit.offsetX >= 0 && fit.offsetY >= 0);
      }
    }
  }
  for (const count of [5, 6]) {
    let phase = 0;
    while (phase < count - 1) {
      const next = heldMovementFrame(phase, 1, count);
      assert.equal(next, phase + 1, 'No skipped frames after a large change');
      phase = next;
    }
  }
});

test('bundled image dimensions match measured atlas metadata, without remote image requests', () => {
  for (const [key, genders] of Object.entries(fitnessAtlasLayouts)) {
    for (const gender of ['male', 'female'] as Demonstrator[]) {
      const folder = key.startsWith('flow-')
        ? 'flows'
        : key.startsWith('nutrition-')
          ? 'nutrition'
          : key.startsWith('coding-')
            ? 'coding'
            : key === 'morning'
              ? 'lifestyle'
              : key === 'supplements'
                ? 'supplements'
                : 'fitness';
      const image = readFileSync(`mobile/assets/${folder}/${key}-${gender}-v1.jpg`);
      assert.equal(imageSize(image).width, genders[gender].width);
      assert.equal(imageSize(image).height, genders[gender].height);
    }
  }
  const media = readFileSync('mobile/src/fitness-media.ts', 'utf8');
  assert.equal(
    (media.match(/require\('/g) ?? []).length,
    Object.keys(fitnessAtlasLayouts).length * 2,
  );
  assert.doesNotMatch(media, /https?:/);
});

test('new cards reuse the fixed control bar, tilt-first viewer, heart and existing details surface', () => {
  const detail = readFileSync('mobile/src/WorkoutGuideDetails.tsx', 'utf8');
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(detail, /resolveVisualFlow\(flow, library\)/);
  assert.match(detail, /<AnimalMovementDeck/);
  assert.match(deck, /fitnessMedia\[id\]/);
  assert.ok(deck.indexOf('<MovementControls') < deck.indexOf('<ScrollView'));
  assert.match(app, /navigation=\{selectedFlow \? 'back' : 'close'\}/);
});
