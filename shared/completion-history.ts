import { habitDay, weekKey } from './format';
import type { HabitFlow } from './mobile';
export type CompletionDay = { day: string; flowId: string; stepId: string };
export function completionHistory(
  completed: string[],
  flows: HabitFlow[],
  now = new Date(),
  timeZone = 'Asia/Kolkata',
): CompletionDay[] {
  const today = habitDay(now, timeZone);
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 27);
  const earliest = cutoff.toISOString().slice(0, 10);
  const steps = new Map<string, { flowId: string; stepId: string }>(
    flows.flatMap(flow =>
      flow.steps.map(
        step => [`${flow.id}:${step.id}`, { flowId: flow.id, stepId: step.id }] as const,
      ),
    ),
  );
  return [...new Set(completed)]
    .flatMap(key => {
      const day = key.slice(0, 10);
      const step = steps.get(key.slice(11));
      const validDay =
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        Number.isFinite(Date.parse(day)) &&
        new Date(day).toISOString().slice(0, 10) === day;
      return validDay && key[10] === ':' && day >= earliest && day <= today && step
        ? [{ day, ...step }]
        : [];
    })
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        a.flowId.localeCompare(b.flowId) ||
        a.stepId.localeCompare(b.stepId),
    );
}
export function completionWeek(
  history: CompletionDay[],
  now = new Date(),
  timeZone = 'Asia/Kolkata',
  flowId?: string,
) {
  const start = new Date(`${weekKey(now, timeZone)}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const id = date.toISOString().slice(0, 10);
    return {
      id,
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      done: history.filter(item => item.day === id && (!flowId || item.flowId === flowId)).length,
    };
  });
}
