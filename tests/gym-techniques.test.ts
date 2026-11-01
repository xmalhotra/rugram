import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { flows, type HabitFlow } from '../shared/mobile';
import {
  gymTechnique,
  gymTechniqueCards,
  gymTechniques,
  gymTechniquesFlow,
  gymTechniquesFlowId,
  withGymTechniqueVisual,
} from '../shared/gym-techniques';
import { flowsForFocus } from '../shared/focus';
import { movementBrowseLibrary } from '../shared/animal-movements';
import { resolveVisualFlow } from '../shared/visual-flows';
import { flowContentSchema } from '../src/lib/content-validation';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import { movementImageFit } from '../shared/movement-viewer';
import { findFlowCard, resolvePersonalFlow, updatePersonalFlows } from '../shared/personal-flows';
import { flowAtlasPrompt } from '../shared/flow-frame-sequences';

test('Enhance gym techniques is one discoverable Workout flow with eight cards, not eight menu categories', () => {
  const available = flowsForFocus(movementBrowseLibrary(flows), 'workout');
  assert.equal(available.filter(flow => flow.id === gymTechniquesFlowId).length, 1);
  assert.equal(
    available.find(flow => flow.id === gymTechniquesFlowId)?.title,
    'Enhance gym techniques',
  );
  assert.equal(gymTechniques.length, 8);
  assert.deepEqual(
    gymTechniquesFlow.relatedFlowIds,
    gymTechniqueCards.map(card => card.id),
  );
  assert.ok(gymTechniqueCards.every(card => !available.some(item => item.id === card.id)));
  assert.deepEqual(
    resolveVisualFlow(gymTechniquesFlow, flows).cards.map(card => card.id),
    gymTechniquesFlow.relatedFlowIds,
  );
});

test('every technique has five meaningfully named frames, benefits, suitability, cautions and primary sources', () => {
  const result = resolveVisualFlow(gymTechniquesFlow, flows);
  for (const card of result.cards) {
    const specification = gymTechnique(card.id)!;
    assert.equal(card.visualCard?.frames.length, 5);
    assert.equal(new Set(card.visualCard?.frames).size, 5);
    assert.equal(card.visualCard?.benefits.length, 3);
    assert.equal(card.visualCard?.sourceFlowId, gymTechniquesFlowId);
    assert.ok(
      specification.when.length > 30 &&
        specification.cue.length > 40 &&
        specification.caution.length > 50,
    );
    assert.ok(specification.sources.every(item => item.url.startsWith('https://')));
    for (const benefit of card.visualCard!.benefits)
      assert.doesNotMatch(
        benefit.description,
        /\bguarantee\b|\bcure\b|prevent.*injur|more.*muscle|fat.?loss/i,
      );
  }
});

test('CMS guide edits retain release-owned frames rather than losing the presentation or accepting arbitrary images', () => {
  assert.ok(flowContentSchema.safeParse(gymTechniquesFlow).success);
  for (const card of gymTechniqueCards) {
    const stored = flowContentSchema.parse(card) as HabitFlow;
    const resolved = resolveVisualFlow({ ...stored, title: `${card.title} · edited` }, flows);
    assert.equal(resolved.cards[0].visualCard?.frames.length, 5);
    assert.deepEqual(
      resolved.cards[0].visualCard?.media,
      withGymTechniqueVisual(card).visualCard?.media,
    );
    assert.equal(resolved.cards[0].title, `${card.title} · edited`);
  }
});

test('breathing and support cues do not promise injury protection, forced breath holds, heavier loads or pain treatment', () => {
  const breathing = gymTechnique('gym-technique-squat-breath')!;
  assert.match(breathing.when, /not maximal lifting/);
  assert.match(breathing.cue, /rather than forcing the timing/);
  assert.match(breathing.caution, /not a universal heavy-lifting/);
  assert.match(breathing.caution, /blood-pressure|heart/);
  const knee = gymTechnique('gym-technique-knee-cushion')!;
  assert.match(knee.caution, /not put a soft cushion under a standing foot/);
  assert.match(gymTechnique('gym-technique-hip-thrust-pad')!.caution, /does not justify more load/);
  assert.match(
    gymTechnique('gym-technique-back-support')!.caution,
    /does not.*treat a back injury/,
  );
});

test('measured gym atlas boundaries keep five frames separate and render every card in the same square viewport', () => {
  for (const card of gymTechniqueCards)
    for (const gender of ['male', 'female'] as const) {
      const media = withGymTechniqueVisual(card).visualCard!.media;
      const layout = fitnessAtlasLayouts[media.atlas][gender];
      const x = new Set<number>();
      for (let frame = 0; frame < 5; frame++) {
        const crop = fitnessCrop(media, gender, frame / 4);
        x.add(crop.x);
        assert.ok(
          crop.x >= 0 &&
            crop.y >= 0 &&
            crop.x + crop.width <= layout.width &&
            crop.y + crop.height <= layout.height,
        );
        const fit = movementImageFit(crop, 350, 430);
        assert.equal(fit.width, 350);
        assert.equal(fit.height, 350);
        assert.ok(
          fit.offsetX >= -1e-9 && fit.offsetY >= -1e-9,
          'Floating-point roundoff is not image clipping',
        );
      }
      assert.equal(x.size, 5);
    }
  assert.match(flowAtlasPrompt('flow-gym-support', 'female'), /Row 4:.*Cushion/);
  assert.match(flowAtlasPrompt('flow-gym-focus', 'male'), /Row 4:.*box/);
});

test('technique cards mix into a personal flow and retain the exact captions and benefits when reopened', () => {
  const id = 'personal-gym000001';
  const technique = findFlowCard(flows, gymTechniquesFlowId, 'gym-technique-squat-breath')!;
  const reference = {
    sourceFlowId: gymTechniquesFlowId,
    cardId: technique.id,
    title: technique.title,
  };
  let personal = updatePersonalFlows(
    [],
    { action: 'personal-flow-create', id, name: 'My gym focus', ...reference },
    new Date().toISOString(),
    reference,
  );
  const animal = findFlowCard(flows, 'workout-animal-movements', 'workout-animal-bear')!;
  const next = { sourceFlowId: 'workout-animal-movements', cardId: animal.id, title: animal.title };
  personal = updatePersonalFlows(
    personal,
    { action: 'personal-flow-add', id, ...next },
    new Date().toISOString(),
    next,
  );
  const reopened = resolvePersonalFlow(personal[0], flows);
  assert.equal(reopened.cards.length, 2);
  assert.deepEqual(reopened.cards[0].visualCard, technique.visualCard);
  assert.deepEqual(reopened.missing, []);
});

test('technique information uses the current card’s cues, limits and exact source links', () => {
  type Element = { type: string; props: Record<string, unknown> };
  function nodes(value: unknown): Element[] {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
    const element = value as Element;
    return [element, ...nodes(element.props.children)];
  }
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as { GymTechniqueNotes: (props: object) => Element } };
  const code = ts.transpileModule(readFileSync('mobile/src/GymTechniqueNotes.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {};
      if (name === 'react-native') return { View: 'View' };
      if (name === '../../shared/gym-techniques') return { gymTechnique };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }) };
      if (name === './design/components') return { Button: 'Button' };
      if (name === './design/Text') return { Text: 'Text' };
      throw new Error(name);
    },
    loaded,
    loaded.exports,
  );
  const links: string[] = [];
  const id = 'gym-technique-knee-cushion';
  const tree = loaded.exports.GymTechniqueNotes({
    cardId: id,
    onLink: (url: string) => links.push(url),
  });
  const text = nodes(tree)
    .map(node => node.props.children)
    .filter(value => typeof value === 'string')
    .join(' ');
  assert.match(text, /When this may help/);
  assert.match(text, /Know the limit/);
  assert.match(text, /soft cushion under a standing foot/);
  for (const button of nodes(tree).filter(node => node.type === 'Button'))
    (button.props.onPress as () => void)();
  assert.deepEqual(
    links,
    gymTechnique(id)!.sources.map(source => source.url),
  );
});
