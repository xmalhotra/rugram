import type { MobilePayload } from './mobile';
import { habitDay } from './format';
export type OptimisticAction = {
  action: string;
  id?: string;
  enabled?: boolean;
  timeZone?: string;
  completionDay?: string;
  requestId?: string;
};
export function profileAction(
  data: MobilePayload,
  input: OptimisticAction,
  now = new Date(),
): MobilePayload {
  if (!input.id || typeof input.enabled !== 'boolean') return data;
  const field =
    input.action === 'flow'
      ? 'flowIds'
      : input.action === 'save'
        ? 'savedProductIds'
        : input.action === 'complete'
          ? 'completed'
          : null;
  if (!field) return data;
  if (
    input.action === 'complete' &&
    !data.flows.some(
      flow =>
        data.profile.flowIds.includes(flow.id) &&
        flow.steps.some(step => `${flow.id}:${step.id}` === input.id),
    )
  )
    return data;
  const key =
    input.action === 'complete'
      ? `${input.completionDay ?? habitDay(now, input.timeZone)}:${input.id}`
      : input.id;
  const values = data.profile[field];
  const next = input.enabled
    ? [...new Set([...values, key])]
    : values.filter(value => value !== key);
  return { ...data, profile: { ...data.profile, [field]: next } };
}
export function reverseProfileAction(
  data: MobilePayload,
  input: OptimisticAction,
  now = new Date(),
): OptimisticAction {
  const field =
    input.action === 'flow' ? 'flowIds' : input.action === 'save' ? 'savedProductIds' : 'completed';
  const key =
    input.action === 'complete'
      ? `${input.completionDay ?? habitDay(now, input.timeZone)}:${input.id}`
      : input.id;
  return { ...input, enabled: data.profile[field].includes(key ?? '') };
}
