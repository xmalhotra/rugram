import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { catalogFlows, catalogTile } from '../../shared/flow-catalog';
import { dailyFlowAddList, type DailyFlowAddRow, type DailyFlowAddSource } from '../../shared/daily-flow';
import { defaultFlowView, type FlowMember } from '../../shared/flow-defaults';
import { formatSeriesDate, type FlowSeries } from '../../shared/flow-series';
import { gymEstimatedMinutes, gymFlowById } from '../../shared/gym-flows';
import { comparePredictions, planFromSeries, predictBodyFlow, type PredictionMember } from '../../shared/predicted-body-flow';
import { Button, Chip, EmptyState, ReasonLine, SectionHeader, Sheet, StickyActionBar } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { describedCatalogFlow, useFlowMember } from './flow-member';
import { createSeries } from './flow-series';
import { useCustomflows } from './customflows';
import type { WeekDay } from './training-api';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function sourcesFor(member: FlowMember): DailyFlowAddSource[] {
  const described = catalogFlows.flatMap(flow => {
    const row = describedCatalogFlow(flow);
    return row ? [row] : [];
  });
  const open: FlowMember = {
    level: member.level,
    gaps: member.gaps ?? [],
    ...(member.priorities?.length ? { priorities: member.priorities } : {}),
    overrides: { level: 'All', goals: null },
  };
  const ranked = defaultFlowView(described, open);
  const reasonById = new Map<string, string>();
  const order = new Map<string, number>();
  ranked.forEach((row, index) => {
    const id = row.flow.flowId;
    if (!id) return;
    if (!order.has(id)) order.set(id, index);
    if (row.reason && !reasonById.has(id)) reasonById.set(id, row.reason);
  });
  const sources: DailyFlowAddSource[] = [];
  const seen = new Set<string>();
  for (const flow of catalogFlows) {
    const gym = flow.flowId ? gymFlowById(flow.flowId) : undefined;
    if (!gym?.items.length || !flow.flowId || seen.has(flow.flowId)) continue;
    seen.add(flow.flowId);
    const reason = reasonById.get(flow.flowId);
    sources.push({
      id: flow.flowId,
      name: flow.title,
      body: catalogTile(flow.tileId)?.title ?? 'Flows',
      level: flow.level,
      minutes: gymEstimatedMinutes(gym),
      exercises: gym.items.length,
      ...(reason ? { reason } : {}),
    });
  }
  sources.sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000) || a.name.localeCompare(b.name));
  return sources;
}

function chosenLevel(row: DailyFlowAddRow, picked: string | undefined, memberLevel: string) {
  return (
    row.levels.find(level => level.id === picked) ??
    row.levels.find(level => level.level === memberLevel) ??
    row.levels[0]
  );
}

function AddRow({
  row,
  memberLevel,
  picked,
  onPick,
  onAdd,
  onDay,
  busy,
}: {
  row: DailyFlowAddRow;
  memberLevel: string;
  picked: string | undefined;
  onPick: (id: string) => void;
  onAdd: () => void;
  onDay: boolean;
  busy: boolean;
}) {
  const { colors: C } = useTheme();
  const level = chosenLevel(row, picked, memberLevel);
  if (!level) return null;
  const count = level.exercises === 1 ? '1 exercise' : `${level.exercises} exercises`;
  const line = `${level.level} · ${level.minutes} min · ${count}`;
  const reason = level.reason ?? row.levels.find(item => item.reason)?.reason;
  return (
    <View style={{ gap: space.sm, paddingVertical: space.ms, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line }}>
      <Text variant="headline" style={{ color: C.text }}>{row.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {row.levels.map(option => (
          <Chip key={option.id} title={option.level} active={option.id === level.id} onPress={() => onPick(option.id)} />
        ))}
      </View>
      <Text variant="footnote" style={{ color: C.muted }}>{line}</Text>
      {reason ? <ReasonLine>{reason}</ReasonLine> : null}
      <Button
        variant="text"
        title={onDay ? 'On this day' : 'Add'}
        accessibilityLabel={onDay ? `${row.name}, ${line}, already on this day` : `Add ${row.name}, ${line}`}
        disabled={onDay || busy}
        onPress={onAdd}
      />
    </View>
  );
}

/** Add a flow to one day, then show where it landed and what that does to the figure. */
export function DailyFlowAddSheet({
  day,
  series,
  onDay,
  focusId,
  onClose,
}: {
  day: WeekDay;
  series: FlowSeries[];
  /** Flow ids already on this day. */
  onDay: Set<string>;
  focusId?: string;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const { member } = useFlowMember(focusId);
  const customflows = useCustomflows();
  const list = dailyFlowAddList(sourcesFor(member));
  const dayName = dayNames[day.weekday - 1] ?? 'this day';
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ lines: string[] } | null>(null);
  const keyOf = (row: DailyFlowAddRow) => `${row.body}\0${row.name}`;

  function close() {
    if (busy) return;
    onClose();
  }

  async function add(row: DailyFlowAddRow) {
    const level = chosenLevel(row, picked[keyOf(row)], member.level);
    if (!level || busy || onDay.has(level.id)) return;
    setBusy(true);
    setError('');
    const draft: FlowSeries = {
      id: '00000000-0000-4000-8000-000000000000',
      itemKind: 'flow',
      itemId: level.id,
      start: day.date,
      time: { checkpoint: 'Morning' },
      recurrence: { kind: 'once' },
      end: { kind: 'never' },
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const who: PredictionMember = {
      level: member.level,
      ...(member.priorities?.length ? { priorities: member.priorities } : {}),
      customflows,
    };
    const lines = comparePredictions(
      predictBodyFlow(planFromSeries(series, day.date), who),
      predictBodyFlow(planFromSeries([...series, draft], day.date), who),
    );
    try {
      await createSeries({
        itemKind: 'flow',
        itemId: level.id,
        start: day.date,
        time: { checkpoint: 'Morning' },
        recurrence: { kind: 'once' },
        end: { kind: 'never' },
      });
      setResult({ lines });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  const rowProps = (row: DailyFlowAddRow) => {
    const level = chosenLevel(row, picked[keyOf(row)], member.level);
    return {
      row,
      memberLevel: member.level,
      picked: picked[keyOf(row)],
      onPick: (id: string) => setPicked(current => ({ ...current, [keyOf(row)]: id })),
      onAdd: () => void add(row),
      onDay: level ? onDay.has(level.id) : false,
      busy,
    };
  };

  return (
    <Sheet
      title={result ? `On ${dayName}` : `Add to ${dayName}`}
      presentation="modal"
      fullScreen
      scrollable={false}
      closeLabel={result ? 'Done' : 'Close'}
      onClose={close}
    >
      {result ? (
        <View style={{ flex: 1 }}>
          <View style={{ gap: space.sm, paddingTop: space.sm }}>
            <Text variant="section" style={{ color: C.text }}>{formatSeriesDate(day.date)}</Text>
            {result.lines.length ? (
              result.lines.map(line => <ReasonLine key={line}>{line}</ReasonLine>)
            ) : (
              <ReasonLine>The figure stays as it is.</ReasonLine>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <StickyActionBar primary={{ label: 'Done', onPress: close }} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl }}>
          {!list.suggested.length && !list.groups.length ? (
            <EmptyState title="No flows to add" description="Live flows show here, with a reason when one fits." />
          ) : null}
          {list.suggested.length ? (
            <View style={{ gap: space.xs, paddingTop: space.sm }}>
              <SectionHeader title="Suggested" />
              {list.suggested.map(row => (
                <AddRow key={keyOf(row)} {...rowProps(row)} />
              ))}
            </View>
          ) : null}
          {list.groups.map(group => (
            <View key={group.body} style={{ gap: space.xs, paddingTop: space.md }}>
              <SectionHeader title={group.body} />
              {group.rows.map(row => (
                <AddRow key={keyOf(row)} {...rowProps(row)} />
              ))}
            </View>
          ))}
          {error ? (
            <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger, paddingTop: space.ms }}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </Sheet>
  );
}
