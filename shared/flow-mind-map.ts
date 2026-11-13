import type { HabitFlow } from './mobile';
import type { FlowCategoryGroup } from './flow-categories';
import { curatedFitnessIds, fitnessCollectionChildren } from './fitness-guides';

export type FlowMindBranch = { id: string; title: string; flowIds: string[] };

/** Added flows, grouped under their browse category, in the order they were added. */
export function flowMindMap(
  flows: readonly HabitFlow[],
  groups: readonly FlowCategoryGroup[],
  focuses: readonly { id: string; flowIds: readonly string[] }[],
): FlowMindBranch[] {
  const focusByFlow = new Map<string, string>();
  for (const focus of focuses) {
    const ids = [...(curatedFitnessIds[focus.id] ?? []), ...focus.flowIds];
    for (const id of ids) if (!focusByFlow.has(id)) focusByFlow.set(id, focus.id);
  }
  const parentOf = new Map<string, string>();
  for (const [parent, children] of Object.entries(fitnessCollectionChildren)) {
    for (const child of children) if (!parentOf.has(child)) parentOf.set(child, parent);
  }
  const focusId = (flow: HabitFlow) =>
    focusByFlow.get(flow.id) ??
    (parentOf.has(flow.id) ? focusByFlow.get(parentOf.get(flow.id)!) : undefined) ??
    (focuses.some(item => item.id === flow.pathId) ? flow.pathId : undefined);
  const buckets = new Map<string, string[]>();
  const loose: string[] = [];
  for (const flow of flows) {
    const focus = focusId(flow);
    const group = focus ? groups.find(item => item.focusIds.includes(focus)) : undefined;
    if (!group) loose.push(flow.id);
    else buckets.set(group.id, [...(buckets.get(group.id) ?? []), flow.id]);
  }
  const branches = groups.flatMap(group => {
    const flowIds = buckets.get(group.id);
    return flowIds ? [{ id: group.id, title: group.title, flowIds }] : [];
  });
  return loose.length ? [...branches, { id: 'more', title: 'More', flowIds: loose }] : branches;
}
