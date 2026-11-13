import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { outboundHost, trustCopy } from '../shared/trust';
test('outbound links reject local, credentialled and executable URLs', () => {
  for (const value of [
    'javascript:alert(1)',
    'http://amazon.in',
    'https://localhost/path',
    'https://127.0.0.1/path',
    'https://name:password@example.com/path',
  ])
    assert.equal(outboundHost(value), null);
  assert.equal(outboundHost('https://www.amazon.in/product?tag=example'), 'amazon.in');
});
test('all direct native URL opens are centralised in the confirmation gate', () => {
  for (const file of ['mobile/App.tsx', 'mobile/src/EventHosts.tsx'])
    assert.doesNotMatch(readFileSync(file, 'utf8'), /Linking\.openURL/);
  const gate = readFileSync('mobile/src/OutboundLink.tsx', 'utf8');
  assert.match(gate, /Leaving Qram/);
  assert.match(gate, /trustCopy\.affiliate/);
  assert.match(gate, /Continue to/);
  assert.match(gate, /outbound-opened/);
  assert.match(trustCopy.health, /not personalised medical advice/);
});
test('stories never auto-advance on a timer', () => {
  const source = readFileSync('mobile/src/StoryViewer.tsx', 'utf8');
  assert.doesNotMatch(source, /setInterval|setTimeout/);
  assert.match(source, /onLongPress/);
  assert.match(source, /onAccessibilityAction/);
});
