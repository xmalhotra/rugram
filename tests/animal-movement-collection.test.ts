import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  animalMovementCollectionFlow,
  animalMovementFlowId,
  animalMovementFlows,
  movementBrowseLibrary,
} from '../shared/animal-movements';
import { flows } from '../shared/mobile';
import { flowsForFocus } from '../shared/focus';
import { flowContentSchema } from '../src/lib/content-validation';

test('Animal movements is one valid, joinable flow with editable ordered movement references', () => {
  assert.equal(flowContentSchema.safeParse(animalMovementCollectionFlow).success, true);
  assert.ok(flows.some(flow => flow.id === animalMovementFlowId));
  assert.deepEqual(
    animalMovementCollectionFlow.relatedFlowIds,
    animalMovementFlows.map(flow => flow.id),
  );
  const available = flowsForFocus(movementBrowseLibrary(flows), 'workout');
  assert.equal(
    available.filter(flow => flow.sessionGuide?.collection === 'Animal movements').length,
    1,
  );
  assert.equal(available.find(flow => flow.id === animalMovementFlowId)?.title, 'Animal movements');
  for (const child of animalMovementFlows) {
    assert.ok(
      flows.some(flow => flow.id === child.id),
      'Existing admin records and saved links survive',
    );
    assert.ok(
      !available.some(flow => flow.id === child.id),
      'No separate movement flow cards in browse',
    );
  }
});

test('movement controls stay outside the swipe pager while each card retains its own mode', () => {
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.equal((deck.match(/<MovementControls/g) ?? []).length, 1);
  assert.ok(deck.indexOf('<MovementControls') < deck.indexOf('<ScrollView'));
  assert.match(deck, /modes\[movements\[current\].id\] \?\? 'tilt'/);
  assert.match(deck, /mode: modes\[movement.id\] \?\? 'tilt'/);
  assert.match(readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8'), /!controls &&/);
});

test('demonstrator appearance is account-wide but movement controls stay local with Tilt default', () => {
  const viewer = readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8');
  assert.match(viewer, /usePaneState<Demonstrator>\('movementDemonstrator', 'male', 'account'\)/);
  assert.match(viewer, /useState<'tilt' \| 'slider'>\('tilt'\)/);
  assert.doesNotMatch(viewer, /usePaneState.*controlMode/);
  assert.match(viewer, /\$\{media\?\.atlas \?\? 'legacy'\}:\$\{gender\}/);
  const state = readFileSync('mobile/src/pane-state.tsx', 'utf8');
  assert.match(state, /scope === 'account' \? `account:\$\{name\}`/);
});

test('movement deck pages by movement while each card owns its pose controls', () => {
  const source = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.match(source, /flow.relatedFlowIds/);
  assert.match(source, /library.filter/);
  assert.match(source, /horizontal/);
  assert.match(source, /pagingEnabled/);
  assert.match(source, /active=\{page === current && !dragging\}/);
  assert.match(source, /<AnimalMovementViewer/);
  assert.match(source, /accessibilityLabel=\{`\$\{flow.title\} cards/);
  assert.match(
    readFileSync('mobile/src/FlowDetails.tsx', 'utf8'),
    /resolveVisualFlow\(flow, data.flows\)/,
  );
  assert.match(readFileSync('mobile/src/FlowDetails.tsx', 'utf8'), /library=\{resolved.cards\}/);
  assert.match(
    readFileSync('mobile/src/FlowTopicBrowser.tsx', 'utf8'),
    /movementBrowseLibrary\(library\)/,
  );
});
