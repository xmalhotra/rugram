import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('movement flow has a reversible red heart in its header without duplicate Add to Home', () => {
  const heart = readFileSync('mobile/src/FlowHeartAction.tsx', 'utf8');
  assert.match(heart, /fill=\{added \? '#E10600' : 'none'\}/);
  assert.match(heart, /selected: added/);
  assert.match(heart, /disabled=\{busy\}/);
  assert.match(heart, /Remove flow from Home/);
  assert.match(heart, /onPress=\{onToggle\}/);
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(app, /<FlowHeartAction/);
  assert.match(app, /enabled: !data.profile.flowIds.includes\(selectedFlow.id\)/);
  const sheet = readFileSync('mobile/src/design/components.shared.tsx', 'utf8');
  assert.ok(sheet.indexOf('{headerAction}') > sheet.indexOf('{title}</Text>'));
  assert.doesNotMatch(
    readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8'),
    /FlowHomeAction/,
  );
});
