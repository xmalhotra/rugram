import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalogFlowIcons } from '../shared/catalog-flow-icons';
import { catalogFlows } from '../shared/flow-catalog';

const iconIds = new Set([...readFileSync('mobile/src/exercise-icons.ts', 'utf8').matchAll(/^ {2}'([^']+)':/gm)].map(match => match[1]));
const tileIcons = new Set(
  [...readFileSync('mobile/src/CatalogCover.tsx', 'utf8').split('const iconForSection')[0].matchAll(/: '([^']+)',/g)].map(match => match[1]),
);

test('every catalog flow has its own picture, and it exists', () => {
  for (const flow of catalogFlows) {
    const icon = catalogFlowIcons[flow.id];
    assert.ok(icon, `${flow.id} has no icon`);
    assert.ok(iconIds.has(icon), `${flow.id}: ${icon} has no picture`);
  }
  assert.deepEqual(Object.keys(catalogFlowIcons).sort(), catalogFlows.map(flow => flow.id).sort());
});

test('no two flows share a picture, and none repeats a tile picture', () => {
  assert.ok(tileIcons.size >= 30, 'tile icons were read');
  const seen = new Map<string, string>();
  for (const [flowId, icon] of Object.entries(catalogFlowIcons)) {
    assert.ok(!seen.has(icon), `${flowId} and ${seen.get(icon)} both use ${icon}`);
    assert.ok(!tileIcons.has(icon), `${flowId} uses the tile picture ${icon}`);
    seen.set(icon, flowId);
  }
});
