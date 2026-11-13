import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { flowBrowseNavigation } from '../shared/flow-navigation';
import { defaultFlowCategoryGroups } from '../shared/flow-categories';

test('flow browsing exposes only the current hierarchy level with a named parent', () => {
  const fitness = defaultFlowCategoryGroups[0];
  assert.deepEqual(flowBrowseNavigation(undefined), {
    level: 'categories',
    title: 'Explore flows',
    backLabel: '',
  });
  assert.deepEqual(flowBrowseNavigation(fitness), {
    level: 'topics',
    title: 'Fitness',
    backLabel: 'All categories',
  });
  for (const group of defaultFlowCategoryGroups.slice(1))
    assert.equal(flowBrowseNavigation(group).backLabel, 'All categories');
});

test('the Flows tab catalog has no Lifestyle or Tech category chrome', () => {
  const source = readFileSync('mobile/src/FlowCatalogHome.tsx', 'utf8');
  assert.match(source, /sectionsInRoot/);
  assert.doesNotMatch(source, /Lifestyle|Tech|FlowCategoryHome|BrowseShelf/);
  assert.match(readFileSync('mobile/src/FlowCatalogTile.tsx', 'utf8'), /accessibilityLabel="Go back"|PageBar/);
  assert.match(
    readFileSync('mobile/src/FlowSections.tsx', 'utf8'),
    /label=\{`Back to \$\{backLabel\}`\}/,
  );
});

test('flow preview has only a visual, title, one metric, and optional saved mark', () => {
  const source = readFileSync('mobile/src/FlowPreview.tsx', 'utf8');
  assert.doesNotMatch(source, /ReasonLine|flowReason|Explore →/);
  assert.match(source, /numberOfLines=\{2\}/);
  assert.match(source, /minHeight: 188/);
  assert.match(readFileSync('mobile/src/FlowIllustration.tsx', 'utf8'), /ExerciseVisual/);
});

test('the fitness catalog keeps its scroll position under the glass header', () => {
  const source = readFileSync('mobile/src/FlowCatalogHome.tsx', 'utf8');
  assert.match(source, /usePaneState\('catalogScroll'/);
  assert.match(source, /scrollTo\(\{ y: offset/);
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(app, /staticContent=\{tab === 'Discover' \|\| \(tab === 'Picks' && picksTab === 'products'\)\}/);
  assert.match(app, /updatedAt=\{tab === 'Discover' \|\| \(tab === 'Picks' && picksTab === 'products'\) \? null : updatedAt\}/);
  assert.match(app, /<FlowCatalogHome/);
});
