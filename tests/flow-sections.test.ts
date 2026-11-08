import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFlowSections, defaultNutritionPaths } from '../shared/flow-sections';
import { defaultFlowCategoryGroups } from '../shared/flow-categories';
import { focusOptions, flowsForFocus } from '../shared/focus';
import { flows } from '../shared/mobile';
import { movementBrowseLibrary } from '../shared/animal-movements';
import type { NutritionPath } from '../shared/admin-content';

const options = focusOptions.map(option => ({ ...option, flowIds: [...option.flowIds] }));
const library = movementBrowseLibrary(flows);
const contents = (sections: ReturnType<typeof buildFlowSections>) =>
  sections.flatMap(section => section.groups.flatMap(group => group.flows));

test('every main category uses populated continuous sections without losing any configured flows', () => {
  for (const category of defaultFlowCategoryGroups) {
    const topics = category.focusIds.flatMap(id => options.filter(option => option.id === id));
    const sections = buildFlowSections(topics, options, library);
    const displayed = contents(sections);
    assert.ok(sections.length, category.title);
    assert.equal(new Set(sections.map(section => section.id)).size, sections.length);
    assert.equal(new Set(displayed.map(flow => flow.id)).size, displayed.length);
    for (const topic of topics) {
      for (const flow of flowsForFocus(library, topic.id, options))
        assert.ok(
          displayed.some(item => item.id === flow.id),
          `${category.title} keeps ${flow.id}`,
        );
    }
  }
});

test('Nutrition exposes five holistic flows without recipe or sport subcategories', () => {
  const topics = options.filter(option => option.id === 'nutrition');
  const sections = buildFlowSections(topics, options, library);
  assert.deepEqual(
    sections.map(section => section.title),
    [
      'Everyday protein',
      'Hydration & electrolytes',
      'Pre-workout',
      'Intra-workout',
      'Post-workout',
    ],
  );
  assert.ok(sections.every(section => section.groups.length === 1));
  assert.ok(sections.every(section => section.groups[0].flows.length === 1));
  assert.ok(contents(sections).every(flow => !flow.recipe && !flow.guideId));
  assert.deepEqual(
    contents(sections).map(flow => flow.id),
    [
      'nutrition-protein-ideas',
      'nutrition-hydration-ideas',
      'nutrition-pre-ideas',
      'nutrition-intra-ideas',
      'nutrition-post-ideas',
    ],
  );
  assert.ok(sections.every(section => section.focusId === 'nutrition'));
});

test('managed Nutrition paths retain editorial names and order while missing and duplicate flows are omitted', () => {
  const first = library.find(flow => flow.id === 'nutrition-pre-running')!;
  const second = library.find(flow => flow.id === 'nutrition-post-running')!;
  const paths: NutritionPath[] = [
    {
      id: 'recovery',
      title: 'After training',
      description: 'Context',
      options: [
        {
          id: 'run',
          title: 'Run recovery',
          description: 'Context',
          flowIds: [second.id, 'missing', second.id],
        },
      ],
    },
    {
      id: 'preparation',
      title: 'Before training',
      description: 'Context',
      options: [
        {
          id: 'run',
          title: 'Run preparation',
          description: 'Context',
          flowIds: [first.id, second.id],
        },
      ],
    },
  ];
  const custom = [
    { id: 'nutrition', title: 'Nutrition', description: 'Context', flowIds: [first.id, second.id] },
  ];
  const sections = buildFlowSections(custom, custom, [first, second], paths);
  assert.deepEqual(
    sections.map(section => section.title),
    ['After training', 'Before training'],
  );
  assert.deepEqual(
    contents(sections).map(flow => flow.id),
    [second.id, first.id],
  );
  assert.deepEqual(
    sections.map(section => section.groups[0].title),
    ['Run recovery', 'Run preparation'],
  );
});

test('custom non-fitness topics preserve configured order and empty categories have no phantom sections', () => {
  const custom = [
    {
      id: 'custom',
      title: 'A topic',
      description: 'Context',
      flowIds: [library[1].id, library[0].id, library[1].id, 'missing'],
    },
  ];
  const sections = buildFlowSections(custom, custom, library);
  assert.deepEqual(
    contents(sections).map(flow => flow.id),
    [library[1].id, library[0].id],
  );
  assert.deepEqual(buildFlowSections(custom, custom, []), []);
  assert.deepEqual(buildFlowSections([], options, library), []);
  assert.deepEqual(
    defaultNutritionPaths([]).map(path => path.id),
    ['protein', 'hydration', 'pre', 'intra', 'post'],
  );
});

test('grouped browsers route all categories through one sticky rail with content preferences, not stacked menus', () => {
  const catalog = readFileSync('mobile/src/FlowCatalogHome.tsx', 'utf8');
  const section = readFileSync('mobile/src/FlowSections.tsx', 'utf8');
  const nutrition = readFileSync('mobile/src/NutritionDiscovery.tsx', 'utf8');
  // The Flows tab is the fitness catalog. Nutrition paths still use FlowSections.
  assert.doesNotMatch(catalog, /<CategoryRail|<NutritionDiscovery/);
  assert.match(catalog, /sectionsInRoot/);
  assert.match(nutrition, /<FlowSections/);
  assert.doesNotMatch(nutrition, /<CategoryRail|setCategory|setOption|LegacyNutrition/);
  assert.equal((section.match(/<CategoryRail/g) ?? []).length, 1);
  assert.match(section, /stickyHeaderIndices=\{\[0\]\}/);
  assert.match(section, /topicAtOffset/);
  assert.match(section, /section.groups.map/);
  assert.match(section, /onSelect\(flow, section.focusId\)/);
  assert.match(section, /onContentSizeChange=\{restoreInitial\}/);
  assert.match(section, /sections.flatMap/);
});
