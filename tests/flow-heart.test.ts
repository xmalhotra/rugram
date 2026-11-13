import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('movement flow has a reversible red heart in its header without duplicate Add to Home', () => {
  const heart = readFileSync('mobile/src/FlowHeartAction.tsx', 'utf8');
  // A Save button that fills in when saved, instead of a heart.
  assert.match(heart, /added \? '✓ Saved' : 'Save'/);
  assert.match(heart, /selected: added/);
  assert.match(heart, /disabled=\{busy\}/);
  assert.match(heart, /Remove from your flows/);
  assert.match(heart, /onPress=\{onToggle\}/);
  const app = readFileSync('mobile/App.tsx', 'utf8');
  // Save stays on the open flow sheet. Home rows no longer render this control.
  assert.match(app, /<FlowHeartAction/);
  assert.doesNotMatch(readFileSync('mobile/src/HomeFeed.tsx', 'utf8'), /<FlowHeartAction/);
  assert.match(app, /enabled: !data.profile.flowIds.includes\(selectedFlow.id\)/);
  const sheet = readFileSync('mobile/src/design/components.shared.tsx', 'utf8');
  assert.ok(sheet.indexOf('{headerAction}') > sheet.indexOf('{title}</Text>'));
  assert.doesNotMatch(readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8'), /FlowHomeAction/);
});
