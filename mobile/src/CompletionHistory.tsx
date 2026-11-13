import React, { useState } from 'react';
import { View } from 'react-native';
import type { MobilePayload } from '../../shared/mobile';
import { completionHistory, completionWeek } from '../../shared/completion-history';
import { habitDay } from '../../shared/format';
import { Glyph } from './design/Glyph';
import { WeekStrip } from './design/states';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
export function CompletionHistory({ data, flowId }: { data: MobilePayload; flowId?: string }) {
  const { colors: C } = useTheme();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selected, setSelected] = useState(() => habitDay(new Date(), zone));
  // Current explicit check-offs win over a bootstrap snapshot during optimism.
  const history = completionHistory(data.profile.completed, data.flows, new Date(), zone);
  const selectedRows = history.filter(
    item => item.day === selected && (!flowId || flowId === item.flowId),
  );
  return (
    <View style={{ gap: space.ms }}>
      <WeekStrip
        days={completionWeek(history, new Date(), zone, flowId)}
        selected={selected}
        onSelect={setSelected}
      />
      <Text accessibilityLiveRegion="polite" variant="footnote" style={{ color: C.muted }}>
        {selectedRows.length
          ? `${selectedRows.length} done on ${selected}`
          : 'No check-offs recorded for this day.'}
      </Text>
      {selectedRows.map(row => {
        const flow = data.flows.find(item => item.id === row.flowId);
        const step = flow?.steps.find(item => item.id === row.stepId);
        return step ? (
          <View
            key={`${row.flowId}:${row.stepId}`}
            accessible
            accessibilityLabel={`✓ ${step.title}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}
          >
            <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.text} size={space.md} />
            <Text variant="subhead" style={{ color: C.text }}>
              {step.title}
            </Text>
          </View>
        ) : null;
      })}
    </View>
  );
}
