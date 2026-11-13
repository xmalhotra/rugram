import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultFlowView, type FlowFacts, type FlowMember } from '../shared/flow-defaults';
import { starterWeeklyLine, suggestStarter } from '../shared/starter-flow';

function flow(id: string, extra: Partial<FlowFacts> & Pick<FlowFacts, 'level'>): FlowFacts & { id: string } {
  return { id, goals: ['size'], equipment: 'gym', minutes: 40, areas: ['chest'], ...extra };
}

test('the suggestion is the first flow the default view would show', () => {
  const flows = [
    flow('home', { level: 'Beginner', equipment: 'bodyweight' }),
    flow('gym', { level: 'Beginner', equipment: 'gym' }),
  ];
  const member: FlowMember = { level: 'Beginner' };
  assert.equal(suggestStarter(flows, member)?.id, defaultFlowView(flows, member)[0]?.id);
});

test('nothing is suggested when every flow is hidden', () => {
  const flows = [flow('old', { level: 'Beginner', goals: ['strength'] })];
  assert.equal(suggestStarter(flows, { level: 'Advanced', goals: ['fitness'] }), null);
});

test('a place the member does not have does not hide the only flow', () => {
  const flows = [flow('gym', { level: 'Beginner', equipment: 'gym' })];
  assert.equal(suggestStarter(flows, { level: 'Beginner', place: 'bodyweight' })?.id, 'gym');
});

test('an intermediate member is not handed a beginner flow first', () => {
  const flows = [flow('easy', { level: 'Beginner' }), flow('mid', { level: 'Intermediate' })];
  assert.equal(suggestStarter(flows, { level: 'Intermediate' })?.id, 'mid');
});

test('the empty Body flow names the regular weekly dose', () => {
  assert.equal(starterWeeklyLine(), '6–10 sets per muscle a week to start');
  assert.equal(starterWeeklyLine('regular'), '10–20 sets per muscle a week to start');
});
