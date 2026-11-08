import type { HabitFlow } from './mobile';
import type { SupplementTopic } from './supplement-discovery';

const trainingPrefix = 'training-supplement-';

/** Supplement topic a flow should open, if the flow is that topic's guide or listed on it. */
export function pickTopicForFlow(
  flowId: string,
  topics: readonly SupplementTopic[],
): SupplementTopic | null {
  const fromTrainingId = flowId.startsWith(trainingPrefix)
    ? topics.find(topic => topic.id === flowId.slice(trainingPrefix.length))
    : undefined;
  return fromTrainingId ?? topics.find(topic => topic.flowIds.includes(flowId)) ?? null;
}

/**
 * Flows that open this topic. The training-supplement id is the reverse of the id match.
 * Pass the topic's flowIds to also reverse the explicit list.
 */
export function flowsForTopic(
  topicId: string,
  flows: readonly HabitFlow[],
  flowIds: readonly string[] = [],
): HabitFlow[] {
  const linked = new Set([`${trainingPrefix}${topicId}`, ...flowIds]);
  return flows.filter(flow => linked.has(flow.id));
}
