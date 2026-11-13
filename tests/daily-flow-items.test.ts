import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyDailyChecks } from '../shared/daily-checks';
import { dailyFlowItemSchema, itemCanBeWritten } from '../shared/daily-flow-item';
import { dailyFlowItemById, dailyFlowItems } from '../shared/daily-flow-item-data';
import { hygieneSeedIds, seedItemsOutsideBar } from '../shared/daily-flow-bar';
import { pickCriterionLabels, pickList, pickOnItem, pickPlacement } from '../shared/daily-flow-picks';
import {
  applyItemProposal,
  itemIdsAtWeek,
  itemStageProposals,
  itemsAtWeek,
  memberPurposeId,
  offeredPurposes,
  purposeByPhrase,
  purposeOffered,
  purposes,
  writtenDailyFlow,
  writtenDay,
  writtenDays,
  writtenFlowProblems,
} from '../shared/purposes';
import { routineCatalog } from '../shared/routine-seed';
import { curatedFlowProducts } from '../shared/curated-flow-resources';

test('an item with no source cannot be written into a Daily flow', () => {
  const creatine = dailyFlowItemById('creatine');
  assert.ok(creatine);
  assert.equal(itemCanBeWritten(creatine), true);
  const bare = { ...creatine, source: undefined };
  assert.equal(itemCanBeWritten(bare), false);
  assert.equal(dailyFlowItemSchema.safeParse({ ...creatine, source: { title: '', url: 'https://example.com' } }).success, false);
  assert.deepEqual(writtenFlowProblems(), []);
  const broken = writtenFlowProblems([
    {
      id: 'broken',
      purposeId: 'gain-muscle',
      slot: 'Upper day',
      flowIds: ['gym-splits-size-upper'],
      stages: [{ fromWeek: 1, itemIds: ['not-a-real-item'] }],
    },
  ]);
  assert.ok(broken.some(line => line.includes('no source')));
});

test('a purpose yields its written Daily flow, and only a complete purpose is offered', () => {
  const offered = offeredPurposes();
  assert.deepEqual(
    offered.map(purpose => purpose.id),
    ['gain-muscle', 'get-stronger', 'visible-abs', 'move-better', 'handstand', 'hyrox'],
  );
  const muscle = writtenDailyFlow('gain-muscle');
  assert.deepEqual(
    muscle.map(day => day.slot),
    ['Upper day', 'Lower day'],
  );
  assert.equal(purposeByPhrase('build muscle')?.id, 'gain-muscle');
  assert.equal(memberPurposeId({ demoMode: true }), 'gain-muscle');
  const day = writtenDay('gain-muscle', 1);
  assert.equal(day?.flowId, 'gym-splits-size-upper');
  assert.deepEqual(
    day?.items.map(item => item.name),
    ['Creatine'],
  );
  assert.equal(day?.items[0].amount, '5 g');
  assert.match(day?.items[0].source.url ?? '', /^https:\/\/jissn\.biomedcentral\.com\//);

  const hidden = purposeOffered({ ...purposes[0], questions: [] }, writtenDailyFlow('handstand'));
  assert.equal(hidden, false);
  assert.equal(purposeOffered(purposes[0], []), false);
  assert.equal(offeredPurposes([]).length, 0);
  assert.equal(offeredPurposes(['gain-muscle']).length, 1);
});

test('stages by week stay within three items at the start', () => {
  for (const day of writtenDays) {
    const start = [...day.stages].sort((a, b) => a.fromWeek - b.fromWeek)[0];
    assert.ok(start.itemIds.length <= 3);
    assert.equal(start.fromWeek, 1);
  }
  assert.deepEqual(itemIdsAtWeek(writtenDailyFlow('gain-muscle')[0], 1), ['creatine']);
  assert.deepEqual(itemIdsAtWeek(writtenDailyFlow('gain-muscle')[0], 2), ['creatine']);
  assert.deepEqual(itemIdsAtWeek(writtenDailyFlow('gain-muscle')[0], 3), ['creatine', 'protein']);
  assert.deepEqual(
    itemsAtWeek('hyrox', 1).map(item => item.id),
    ['creatine'],
  );
  assert.deepEqual(
    itemsAtWeek('hyrox', 3).map(item => item.id),
    ['creatine', 'beta-alanine'],
  );
  assert.deepEqual(itemsAtWeek('move-better', 1), []);
  assert.deepEqual(itemsAtWeek('handstand', 4), []);
});

test('an item resolves to the catalogue pick list, and a saved or bought pick shows on it', () => {
  const creatine = dailyFlowItemById('creatine')!;
  const list = pickList(creatine, curatedFlowProducts);
  assert.deepEqual([...list.criteria], [...pickCriterionLabels]);
  assert.equal(list.paid, false);
  assert.equal(list.placement, pickPlacement);
  assert.deepEqual(
    list.picks.map(row => row.product.id),
    ['pick-creatine-on', 'pick-creatine-fastup', 'pick-creatine-naturaltein', 'pick-creatine-carbamide', 'pick-creatine-nakpro'],
  );
  assert.ok(list.picks.every(row => row.reasons.includes(pickPlacement)));
  assert.ok(list.picks.every(row => row.reasons.some(line => line.startsWith('Tested by a third party:'))));
  const saved = pickOnItem(creatine, curatedFlowProducts, ['pick-creatine-on'], []);
  assert.deepEqual(saved, { id: 'pick-creatine-on', title: 'Optimum Nutrition', how: 'saved' });
  const bought = pickOnItem(creatine, curatedFlowProducts, ['pick-creatine-on'], ['pick-creatine-carbamide']);
  assert.equal(bought?.how, 'bought');
  assert.equal(bought?.id, 'pick-creatine-carbamide');
  assert.equal(pickList({ pickCategory: undefined }, curatedFlowProducts).picks.length, 0);
});

test('a later week is proposed with a reason and lands on the day only when applied', () => {
  assert.deepEqual(itemStageProposals({ purposeId: 'gain-muscle', week: 1, presentItemIds: [] }), []);
  const proposals = itemStageProposals({ purposeId: 'gain-muscle', week: 3, presentItemIds: ['creatine'] });
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].itemId, 'protein');
  assert.match(proposals[0].reason, /20–40 g/);
  const before = emptyDailyChecks();
  assert.equal(applyItemProposal(before, proposals[0]).items.length, 1);
  assert.equal(before.items.length, 0);
  const after = applyItemProposal(before, proposals[0]);
  assert.equal(after.items[0].name, 'Protein');
  assert.deepEqual(
    itemStageProposals({ purposeId: 'gain-muscle', week: 3, presentItemIds: ['creatine', 'protein'] }),
    [],
  );
});

test('the catalogue keeps rows the bar would leave out of a written Daily flow', () => {
  const catalog = routineCatalog();
  const flags = seedItemsOutsideBar(catalog.items);
  const water = flags.find(flag => flag.id === 'water');
  assert.equal(water?.reason, 'hygiene');
  assert.equal(flags.some(flag => flag.id === 'creatine'), false);
  assert.equal(flags.some(flag => flag.id === 'beta-alanine'), false);
  assert.equal(flags.find(flag => flag.id === 'fish-oil')?.reason, 'no-source');
  assert.ok(catalog.items.some(item => item.id === 'water'));
  assert.ok(hygieneSeedIds.includes('steps'));
  assert.ok(flags.length > 10);
  assert.ok(dailyFlowItems.every(item => item.source.url.startsWith('https://')));
});
