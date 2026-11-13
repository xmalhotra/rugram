import test from 'node:test';
import assert from 'node:assert/strict';
import {supplementJourney,journeyPage} from '../shared/supplement-journey';
import {defaultSupplementDiscovery} from '../shared/supplement-discovery';

test('supplement guide tells one ordered story from goal to optional product choice',()=>{
  const topic=defaultSupplementDiscovery.topics[0];const goal=defaultSupplementDiscovery.goals[0];
  const cards=supplementJourney(topic,goal,3);
  assert.deepEqual(cards.map(card=>card.id),['goal','food','fit','next']);
  assert.equal(cards[0].body,topic.summary);assert.equal(cards[1].body,topic.foodFirst);assert.equal(cards[2].body,topic.consider);
  assert.equal(cards[3].showProducts,true);
  assert.equal(supplementJourney(topic,goal,0)[3].showProducts,false);
  assert.ok(cards.every(card=>card.title&&card.body&&card.illustration));
});
test('guide reflects admin topic edits without hardcoded product or medical copy',()=>{
  const topic={...defaultSupplementDiscovery.topics[0],consider:'Updated suitability guidance.'};
  assert.equal(supplementJourney(topic,defaultSupplementDiscovery.goals[0],2)[2].body,topic.consider);
});
test('swipe position is bounded across bounce, rotation and invalid layout measurements',()=>{
  assert.equal(journeyPage(0,320,4),0);assert.equal(journeyPage(320,320,4),1);assert.equal(journeyPage(960,320,4),3);
  assert.equal(journeyPage(-200,320,4),0);assert.equal(journeyPage(99999,320,4),3);
  assert.equal(journeyPage(100,0,4),0);assert.equal(journeyPage(NaN,320,4),0);assert.equal(journeyPage(100,320,0),0);
});
