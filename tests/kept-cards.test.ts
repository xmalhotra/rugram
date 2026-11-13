import assert from 'node:assert/strict';
import test from 'node:test';
import { cardsToKeep, featuredCardIds, featuredCardLimit } from '../shared/kept-cards';

test('the first fifty fitness cards stay downloaded, and added or liked cards stay too', () => {
  const featured = featuredCardIds();
  assert.equal(featured.length, featuredCardLimit);
  assert.equal(featured[0], 'cindy-pull-up');
  assert.ok(featured.includes('cindy-push-up'));
  assert.ok(featured.includes('cindy-squat'));
  const kept = cardsToKeep({
    flowIds: ['running-styles'],
    personalFlows: [
      {
        cards: [{ sourceFlowId: 'workout-cindy', cardId: 'a-card-outside-the-fifty', title: 'Mine' }],
      },
    ],
  });
  assert.ok(kept.includes('cindy-pull-up'));
  assert.ok(kept.includes('running-style-run-walk'));
  assert.ok(kept.includes('a-card-outside-the-fifty'));
  assert.equal(cardsToKeep({ flowIds: [] }).length, featuredCardLimit);
});
