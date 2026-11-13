import assert from 'node:assert/strict';
import test from 'node:test';
import { flowsForTopic, pickTopicForFlow } from '../shared/flow-picks';
import { defaultSupplementDiscovery } from '../shared/supplement-discovery';
import { supplementPickCategories } from '../shared/supplement-picks';
import { trainingSupplementTopicFlows } from '../shared/training-supplements';

const topics = supplementPickCategories(defaultSupplementDiscovery);

test('a training supplement flow opens its pick topic, and an unrelated flow does not', () => {
  assert.equal(pickTopicForFlow('training-supplement-creatine', topics)?.id, 'creatine');
  assert.equal(pickTopicForFlow('training-supplement-creatine', topics)?.title, 'Creatine');
  assert.equal(
    pickTopicForFlow('nutrition-protein-plant', topics)?.id,
    'protein',
    'topics can also name flows explicitly',
  );
  assert.equal(pickTopicForFlow('fitness-hyrox-base', topics), null);
  assert.equal(pickTopicForFlow('training-supplement-missing', topics), null);
});

test('flowsForTopic is the reverse link back to the guide', () => {
  assert.deepEqual(
    flowsForTopic('creatine', trainingSupplementTopicFlows).map(flow => flow.title),
    ['Creatine monohydrate'],
  );
  assert.deepEqual(flowsForTopic('creatine', trainingSupplementTopicFlows, []).map(flow => flow.id), [
    'training-supplement-creatine',
  ]);
  const protein = topics.find(topic => topic.id === 'protein')!;
  assert.ok(
    flowsForTopic('protein', trainingSupplementTopicFlows, protein.flowIds).some(
      flow => flow.id === 'training-supplement-protein',
    ),
  );
  assert.deepEqual(flowsForTopic('creatine', []), []);
});
