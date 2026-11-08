import assert from 'node:assert/strict';
import test from 'node:test';
import { atlasMotion, cardMotion } from '../shared/frame-policy';
import { flows } from '../shared/mobile';
import { fitnessMedia } from '../shared/fitness-guides';
import { nutritionIdeas } from '../shared/nutrition-ideas';

test('frames are kept for movement and procedure; food, products and playlists are stills', () => {
  for (const atlas of ['nutrition-carbs', 'nutrition-protein', 'nutrition-drinks', 'supplements', 'coding-audio'] as const)
    assert.equal(cardMotion({ atlas }), 'still', atlas);
  for (const atlas of ['cindy', 'running', 'hyrox', 'flow-animal', 'flow-gym-focus'] as const)
    assert.equal(cardMotion({ atlas }), 'sequence', atlas);
  // Every family has a reason, so the choice is reviewable.
  for (const [atlas, rule] of Object.entries(atlasMotion)) assert.ok(rule.why.length > 8, atlas);
});

test('pre-workout and other food cards in the catalogue never play frames', () => {
  const food = nutritionIdeas.map(item => item.id);
  const media = (id: string) =>
    flows.find(flow => flow.id === id)?.visualCard?.media ?? fitnessMedia[id];
  for (const id of food) {
    const found = media(id);
    if (found) assert.equal(cardMotion(found), 'still', id);
  }
});
