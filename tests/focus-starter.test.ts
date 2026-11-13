import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { flowsForFocus, focusOptions } from '../shared/focus';
import { flows } from '../shared/mobile';
import { containsCode } from './source-assertions';
test('every default focus has a real starter', () => {
  for (const focus of focusOptions) {
    const starters = flowsForFocus(flows, focus.id);
    assert.ok(starters.length > 0, focus.id);
    assert.ok(starters.every(flow => flow.steps.length > 0));
  }
});
test('Home does not list the starter catalog; Flows keeps the guide library', () => {
  const app = readFileSync('mobile/App.tsx', 'utf8');
  const home = readFileSync('mobile/app/(tabs)/index.tsx', 'utf8');
  const flows = readFileSync('mobile/app/(tabs)/flows.tsx', 'utf8');
  assert.doesNotMatch(app, /FocusStarter/);
  assert.doesNotMatch(home, /FocusStarter|needsFocusOnboarding/);
  assert.match(flows, /tab="Discover"/);
  containsCode(app, "tab==='Discover' && flowsTab==='qram' && (");
});
