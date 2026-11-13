import React from 'react';
import type { MobilePayload } from '../../shared/mobile';
import { todaySteps } from '../../shared/today';
import { Card, HabitToggle } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { CompletionHistory } from './CompletionHistory';
export function TodayChecklist({
  data,
  busy,
  onComplete,
}: {
  data: MobilePayload;
  busy: boolean;
  onComplete: (id: string, enabled: boolean) => void;
}) {
  const { colors: C } = useTheme();
  const steps = todaySteps(
    data.flows,
    data.profile,
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  if (!steps.length) return null;
  const done = steps.filter(step => step.done).length;
  return (
    <Card>
      <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
        Today
      </Text>
      <Text accessibilityLiveRegion="polite" style={{ color: C.muted }}>
        {done} of {steps.length} done today
      </Text>
      <Text variant="footnote" style={{ color: C.muted }}>
        Choose what fits today. Your flow’s rhythm is a guide, not a daily target.
      </Text>
      <CompletionHistory data={data} />
      {steps.map(step => (
        <HabitToggle
          key={step.stepId}
          title={step.title}
          detail={`${step.flowTitle} · ${step.cue}`}
          checked={step.done}
          disabled={busy}
          onChange={enabled => onComplete(step.stepId, enabled)}
        />
      ))}
      {done === steps.length && (
        <Text style={{ color: C.lime }}>That’s today done. See you tomorrow.</Text>
      )}
    </Card>
  );
}
