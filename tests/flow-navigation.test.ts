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

test('root categories are not retained above child navigation and back resets descendant filters', () => {
  const source = readFileSync('mobile/src/FlowTopicBrowser.tsx', 'utf8');
  const rootEnd = source.indexOf('const navigation');
  assert.ok(rootEnd > 0);
  assert.match(source, /if \(!group\) \{/);
  assert.equal((source.match(/accessibilityLabel="Flow categories"/g) ?? []).length, 1);
  assert.match(source, /flowsForFocus/);
  assert.doesNotMatch(source, /Try a flow|BrowseShelf|flexWrap: 'wrap'/);
  assert.doesNotMatch(
    source,
    /Workout collections|workoutCollection|activeCollection|In the spotlight/,
  );
  assert.match(source, /backLabel=\{browse.backLabel\}/);
  assert.match(source, /navigation.addListener\('tabPress'/);
  assert.match(source, /hasFocusedInlineDetail\(\)/);
  assert.match(
    readFileSync('mobile/src/FlowSections.tsx', 'utf8'),
    /accessibilityLabel=\{`Back to \$\{backLabel\}`\}/,
  );
  assert.match(source, /setGroup\(''\)/);
  assert.doesNotMatch(source, /groups\[0\]/);
});

test('flow preview has only a visual, title, one metric, and optional saved mark', () => {
  const source = readFileSync('mobile/src/FlowPreview.tsx', 'utf8');
  assert.doesNotMatch(source, /ReasonLine|flowReason|Explore →/);
  assert.match(source, /numberOfLines=\{2\}/);
  assert.match(source, /minHeight: 188/);
  assert.match(readFileSync('mobile/src/FlowIllustration.tsx', 'utf8'), /FitnessThumbnail/);
});

test('explore flows lists each category and resets vertical position', () => {
  const source = readFileSync('mobile/src/FlowTopicBrowser.tsx', 'utf8');
  assert.match(source, /useRootListNavigation/);
  assert.match(source, /resetScroll\(\)/);
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(app, /staticContent=\{tab === 'Discover'\}/);
  assert.match(app, /updatedAt=\{tab === 'Discover' \? null : updatedAt\}/);
});
