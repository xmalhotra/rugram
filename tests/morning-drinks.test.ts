import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  morningDrinkFlows,
  morningDrinkOptions,
  morningDrinksFlow,
  morningDrinksFlowId,
  morningDrinksHeading,
} from '../shared/morning-drinks';
import { flows } from '../shared/mobile';
import { flowsForFocus, focusOptions } from '../shared/focus';
import { flowCategoryGroups, defaultFlowCategoryGroups } from '../shared/flow-categories';
import { movementBrowseLibrary } from '../shared/animal-movements';
import { fitnessCollectionIds } from '../shared/fitness-guides';
import { flowContentSchema } from '../src/lib/content-validation';
import { buildFlowSections } from '../shared/flow-sections';

test('Lifestyle has one Morning drinks flow containing eight ordered visual choices', () => {
  assert.equal(morningDrinksHeading, '8 ways to start your day');
  assert.equal(morningDrinkFlows.length, 8);
  assert.deepEqual(
    morningDrinksFlow.relatedFlowIds,
    morningDrinkFlows.map(flow => flow.id),
  );
  assert.equal(morningDrinksFlow.sessionGuide!.label, morningDrinksHeading);
  assert.deepEqual(
    flowsForFocus(flows, 'morning-drinks').map(flow => flow.id),
    [morningDrinksFlowId],
  );
  const browse = movementBrowseLibrary(flows);
  assert.ok(browse.some(flow => flow.id === morningDrinksFlowId));
  assert.ok(morningDrinkFlows.every(flow => !browse.some(item => item.id === flow.id)));
  const lifestyle = flowCategoryGroups(focusOptions).find(group => group.id === 'lifestyle')!;
  assert.deepEqual(lifestyle.focusIds, ['morning-drinks', 'sleep']);
  const options = focusOptions.map(option => ({ ...option, flowIds: [...option.flowIds] }));
  const sections = buildFlowSections(
    lifestyle.focusIds.flatMap(id => options.filter(option => option.id === id)),
    options,
    browse,
  );
  assert.equal(sections[0].title, 'Morning drinks');
  assert.equal(sections[0].groups[0].flows.length, 1);
});

test('older Lifestyle settings get the new topic without overriding an explicit editorial assignment', () => {
  const old = defaultFlowCategoryGroups.map(group =>
    group.id === 'lifestyle' ? { ...group, focusIds: ['sleep'] } : group,
  );
  assert.deepEqual(
    flowCategoryGroups(focusOptions, old).find(group => group.id === 'lifestyle')!.focusIds,
    ['morning-drinks', 'sleep'],
  );
  const moved = [
    ...old,
    { id: 'custom', title: 'My choices', illustration: 'focus', focusIds: ['morning-drinks'] },
  ];
  const result = flowCategoryGroups(focusOptions, moved);
  assert.deepEqual(result.find(group => group.id === 'lifestyle')!.focusIds, ['sleep']);
  assert.deepEqual(result.find(group => group.id === 'custom')!.focusIds, ['morning-drinks']);
});

test('all drink data validates, stays in Lifestyle and has appropriate preparation and caution notes', () => {
  for (const flow of [morningDrinksFlow, ...morningDrinkFlows]) {
    const parsed = flowContentSchema.safeParse(flow);
    assert.ok(parsed.success, `${flow.id}: ${JSON.stringify(parsed.error)}`);
    assert.equal(flow.area, 'Wellbeing');
    assert.equal(flow.pathId, 'morning-drinks');
    assert.match(flow.guidance!, /Choose one option, not all eight/);
    assert.match(flow.guidance!, /fluid restrictions/);
    assert.ok(flow.sources?.every(source => source.url.startsWith('https://')));
    assert.ok(flow.sessionGuide!.cards.every(card => card.body.length < 330));
  }
  const byId = new Map(morningDrinkOptions.map(option => [option.id, option]));
  assert.match(byId.get('lemon-honey')!.note, /Honey adds free sugar/);
  assert.match(byId.get('lemon-honey')!.note, /Lemon is acidic/);
  assert.match(byId.get('water')!.note, /not a detox treatment/);
  assert.match(byId.get('decaf')!.note, /still contains some caffeine/);
  assert.match(byId.get('milk')!.note, /not a milk-allergy substitute/);
  assert.match(byId.get('soy')!.preparation, /unsweetened.*fortified/);
});

test('each morning drink is one still of the drink, with the source in place of a frame counter', () => {
  const stills = readFileSync('mobile/src/morning-stills.ts', 'utf8');
  for (const id of ['water', 'lemon-honey', 'coffee', 'decaf', 'tea', 'ginger', 'milk', 'soy'])
    assert.match(stills, new RegExp(`${id}\\.jpg`));
  const viewer = readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8');
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.match(viewer, /domainStill\(flow\.id\)/);
  assert.match(deck, /appearance=\{!currentStill\}/);
  assert.match(deck, /playback=\{!currentStill\}/);
  assert.match(deck, /sources\?\.\[0\]\?\.title/);
  assert.doesNotMatch(deck, /movements\.length\} drinks/);
  assert.ok(fitnessCollectionIds.includes(morningDrinksFlowId));
});

test('the collection headline sits above fixed controls, while drink preparation stays under information', () => {
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  const viewer = readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8');
  assert.ok(deck.indexOf('flow.sessionGuide?.label') < deck.indexOf('<MovementControls'));
  assert.ok(deck.indexOf('<MovementControls') < deck.indexOf('<ScrollView'));
  assert.match(
    viewer,
    /frameTerm = isDrink \|\| isSupplement \|\| coding \|\| visualCard \? 'Frame' : 'Pose'/,
  );
  assert.ok(viewer.indexOf('Preparation & choices') > viewer.indexOf('{infoOpen &&'));
  assert.match(
    readFileSync('mobile/src/fitness-media.ts', 'utf8'),
    /assets\/lifestyle\/morning-male-v1.jpg/,
  );
});
