import type { HabitFlow, MobileProfile } from './mobile';
import { habitDay } from './format';
export type TodayStep = {
  flowId: string;
  flowTitle: string;
  stepId: string;
  title: string;
  cue: string;
  duration: string;
  done: boolean;
};
export function todaySteps(
  flows: HabitFlow[],
  profile: MobileProfile,
  now = new Date(),
  timeZone = 'Asia/Kolkata',
): TodayStep[] {
  const day = habitDay(now, timeZone);
  const completed = new Set(profile.completed);
  return [...new Set(profile.flowIds)].flatMap(id => {
    const flow = flows.find(item => item.id === id);
    return flow
      ? flow.steps.map(step => ({
          flowId: flow.id,
          flowTitle: flow.title,
          stepId: `${flow.id}:${step.id}`,
          title: step.title,
          cue: step.cue,
          duration: step.duration,
          done: completed.has(`${day}:${flow.id}:${step.id}`),
        }))
      : [];
  });
}
