import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyShares, gapLine, shareStanding, type FinishedMark, type ShareSubject } from '../shared/share-eligibility';
import { shareThresholds } from '../shared/share-thresholds';

const flow: ShareSubject = { kind: 'flow', id: 'flow-1', title: 'Size upper' };
const custom: ShareSubject = { kind: 'custom-flow', id: 'flow-1', title: 'Size upper' };
const daily: ShareSubject = { kind: 'daily-flow', id: 'day-1', title: 'Upper day', dayFlowIds: ['flow-a'] };
const map: ShareSubject = {
  kind: 'map-flow',
  id: 'map-1',
  title: 'Upper and lower',
  pattern: [{ flowIds: ['flow-a'] }, { flowIds: ['flow-b'] }, { flowIds: [] }],
};

function date(index: number) {
  return `2026-11-${String(index + 1).padStart(2, '0')}`;
}

function marksFor(kind: ShareSubject['kind'], count: number): FinishedMark[] {
  if (kind === 'flow' || kind === 'custom-flow') {
    return Array.from({ length: count }, (_, index) => ({ id: 'flow-1', date: date(index) }));
  }
  if (kind === 'daily-flow') {
    return Array.from({ length: count }, (_, index) => ({ id: 'flow-a', date: date(index) }));
  }
  const marks: FinishedMark[] = [];
  for (let pass = 0; pass < count; pass += 1) {
    marks.push({ id: 'flow-a', date: date(pass * 2) });
    marks.push({ id: 'flow-b', date: date(pass * 2 + 1) });
  }
  return marks;
}

const subjects = { flow, 'custom-flow': custom, 'daily-flow': daily, 'map-flow': map };

test('eligibility sits at, below and above each threshold', () => {
  for (const rule of shareThresholds) {
    const subject = subjects[rule.kind];
    const below = shareStanding(subject, marksFor(rule.kind, rule.need - 1));
    const at = shareStanding(subject, marksFor(rule.kind, rule.need));
    const above = shareStanding(subject, marksFor(rule.kind, rule.need + 1));
    assert.equal(below.earned, false, rule.kind);
    assert.equal(at.earned, true, rule.kind);
    assert.equal(above.earned, true, rule.kind);
    assert.equal(at.done >= rule.need, true);
    assert.equal(above.done > rule.need, true);
  }
});

test('a flow with no finished session cannot be posted, and one short says how far', () => {
  const untouched = shareStanding(flow, []);
  assert.equal(untouched.earned, false);
  assert.equal(untouched.line, '1 more session');
  const partial = shareStanding(map, [{ id: 'flow-a', date: '2026-11-01' }]);
  assert.equal(partial.earned, false);
  assert.equal(partial.line, '1 more session');
  assert.equal(gapLine(2), '2 more sessions');
  const grouped = classifyShares([flow, map], []);
  assert.equal(grouped.earned.length, 0);
  assert.equal(grouped.close.length, 2);
  assert.equal(grouped.close[0]?.reason, '1 more session');
});
