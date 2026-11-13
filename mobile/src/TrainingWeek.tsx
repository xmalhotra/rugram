import { Button, Sheet } from './design/components';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HabitFlow } from '../../shared/mobile';
import type { DailyChecks } from '../../shared/daily-checks';
import type { PlanItem } from '../../shared/training';
import { localDate } from '../../shared/flow-habits';
import { addCalendarDays, calendarWeekday } from '../../shared/flow-series';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { numeric, useTheme, space, radius, stroke, hit, opacity, size, textRoles } from './design/theme';
import { reloadFlowSeries, useFlowSeries } from './flow-series';
import { DaySeries, ListCard, ListHairline, ListState, RoutineRow, SectionHeader } from './RoutineCalendar';
import { WrittenDayCard, flowTitleFor } from './DailyItemFacts';
import { writtenDay } from '../../shared/purposes';
import { DailyFlowAddSheet } from './DailyFlowAdd';
import { catalogFlows, catalogTile } from '../../shared/flow-catalog';
import { liveFlowId, liveFlowIds } from './catalog-live';
import {
  setTrainingDay,
  skipTraining,
  swapTrainingDays,
  trainingSessions,
  trainingWeek,
  type TrainingSessionSummary,
  type WeekDay,
  type WeekItem
} from './training-api';
import { useTrainingSessionPane, useTrainingTick } from './training-route';

const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Level, area, or catalogue tile title — whichever the matching flow actually has. */
function flowDetail(flow: HabitFlow) {
  const catalog = catalogFlows.find(item => liveFlowId(item) === flow.id);
  if (catalog?.level) return catalog.level;
  if (flow.level) return flow.level;
  if (flow.area) return flow.area;
  if (!catalog) return '';
  const tile = catalogTile(catalog.tileId);
  if (tile && tile.title !== flow.title) return tile.title;
  return catalog.tags.find(Boolean) ?? '';
}

function Mark({ name, color }: { name: 'plus.circle' | 'checkmark'; color: string }) {
  return <Glyph name={name} fallback={name === 'checkmark' ? '✓' : '+'} color={color} />;
}

function toItems(items: WeekItem[]): PlanItem[] {
  const next: PlanItem[] = [];
  for (const item of items) {
    if (item.kind === 'rest') next.push({ kind: 'rest', label: item.label ?? 'Rest' });
    else if (item.id && (item.kind === 'session' || item.kind === 'flow'))
      next.push(item.optional ? { kind: item.kind, id: item.id, optional: true } : { kind: item.kind, id: item.id });
  }
  return next;
}

export function TrainingWeek({
  flows,
  checks,
  onStartFlow,
  onTickItem,
  onOpenItem,
  onBrowse,
  anchorDate,
  focusId,
  purposeId,
  pickLabel,
  onSeePicks
}: {
  flows: HabitFlow[];
  checks: DailyChecks;
  onStartFlow: (id: string, title: string, version?: number) => void;
  onTickItem: (id: string, date: string) => void;
  onOpenItem: (id: string) => void;
  onBrowse: () => void;
  /** A date in the week to show. Defaults to today. */
  anchorDate?: string;
  focusId?: string;
  purposeId?: string;
  pickLabel?: (id: string, name: string) => string | undefined;
  onSeePicks?: (category: string) => void;
}) {
  const { colors: C } = useTheme();
  const today = localDate(new Date());
  const anchor = anchorDate ?? today;
  const [tick, setTick] = useTrainingTick();
  const [, setSession] = useTrainingSessionPane();
  const [week, setWeek] = useState<Awaited<ReturnType<typeof trainingWeek>> | null>(null);
  const [selected, setSelected] = useState(anchor);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');
  const [weekError, setWeekError] = useState('');
  const weekStart = addCalendarDays(anchor, 1 - calendarWeekday(anchor));
  const bundle = useFlowSeries(weekStart, addCalendarDays(weekStart, 6));
  useEffect(() => {
    setSelected(anchor);
  }, [anchor]);
  useEffect(() => {
    let live = true;
    trainingWeek(anchor)
      .then(result => {
        if (!live) return;
        setWeek(result);
        setWeekError('');
        setSelected(current => (result.days.some(day => day.date === current) ? current : anchor));
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setWeek(null);
        setWeekError(reason instanceof Error ? reason.message : 'Try again.');
      });
    return () => {
      live = false;
    };
  }, [anchor, tick]);
  const day = week?.days.find(item => item.date === selected) ?? week?.days.find(item => item.date === anchor);
  const dayOccurrences = bundle.occurrences.filter(item => item.date === day?.date);
  // A week built by hand starts on this week's Monday, so every day shown can be filled.
  const startDate = week?.plan?.startDate ?? week?.days[0]?.date ?? today;
  function fail(reason: unknown) {
    setError(reason instanceof Error ? reason.message : 'Try again.');
  }
  async function save(target: WeekDay, items: PlanItem[]) {
    setError('');
    try {
      await setTrainingDay({ week: target.week, weekday: target.weekday, items, startDate });
      setTick(value => value + 1);
      setAdding(false);
    } catch (reason) {
      fail(reason);
    }
  }
  const dayTitle = day ? (day.date === today ? `Today · ${dayNames[day.weekday - 1]}` : dayNames[day.weekday - 1]) : 'Today';
  const planned = day?.items ?? [];
  const bareDay = !planned.length && !dayOccurrences.length && !checks.items.length;
  const starter =
    bareDay && day?.date === today && purposeId && !bundle.loading && !weekError && !bundle.error
      ? writtenDay(purposeId, 1)
      : null;
  return (
    <View style={{ gap: space.ms }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {letters.map((letter, index) => {
          const item = week?.days[index];
          const date = item?.date;
          const on = date === selected;
          const onThisDay = bundle.occurrences.some(row => row.date === date);
          const filled = Boolean(item?.items.some(entry => entry.kind !== 'rest')) || onThisDay || checks.items.length > 0;
          return (
            <Pressable
              key={item?.date ?? letter + index}
              accessibilityRole="button"
              accessibilityLabel={`${item ? dayNames[item.weekday - 1] : letter}${date === today ? ', today' : ''}${item?.status === 'done' ? ', done' : filled ? ', planned' : ''}`}
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!date) return;
                setSelected(date);
                setMoving(false);
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: space.xs,
                minWidth: hit,
                minHeight: 64,
                justifyContent: 'center',
                opacity: pressed ? opacity.pressed : 1
              })}
            >
              <Text variant="caption" style={{ color: C.muted, fontWeight: '600', letterSpacing: 0.4 }}>{letter}</Text>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? C.lime : 'transparent',
                  borderWidth: date === today && !on ? stroke.line : 0,
                  borderColor: C.lime
                }}
              >
                <Text variant="subhead" style={{ color: on ? C.onAccent : C.text, fontWeight: date === today || on ? '600' : '400', ...numeric }}>
                  {date ? Number(date.slice(8)) : ''}
                </Text>
              </View>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: item?.status === 'done' ? C.lime : filled ? C.muted : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
      <ListCard>
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xxs }}>
          <Text variant="headline" accessibilityRole="header" style={{ color: C.text }}>
            {dayTitle}
          </Text>
        </View>
        {planned.length ? <SectionHeader title="Training plan" /> : null}
        {planned.map((item, index) => {
          const name = item.kind === 'rest' ? item.label ?? 'Rest' : item.title;
          const id = item.id;
          const kind = item.kind === 'rest' ? 'Rest day' : item.kind === 'flow' ? 'Flow' : 'Session';
          return (
            <View key={`${item.kind}-${id ?? item.label}-${index}`}>
              {index ? <ListHairline /> : null}
              <RoutineRow
                title={`${item.status === 'done' ? '✓ ' : ''}${name}`}
                detail={`${kind}${item.status === 'skipped' ? ' · skipped' : ''}`}
                dim={item.status === 'done'}
                trailing={
                  day ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
                      {item.kind !== 'rest' && id && item.status === 'open' ? (
                        <Button
                          title="Start"
                          fit
                          size="regular"
                          accessibilityLabel={`Start ${name}`}
                          onPress={() => (item.kind === 'session' ? setSession({ id, date: day.date }) : onStartFlow(id, name))}
                        />
                      ) : null}
                      {item.kind === 'session' && id && item.status === 'open' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Skip ${name}`}
                          onPress={() => {
                            void skipTraining(id, day.date)
                              .then(() => setTick(value => value + 1))
                              .catch(fail);
                          }}
                          style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.sm, opacity: pressed ? opacity.pressed : 1 })}
                        >
                          <Text variant="subhead" style={{ color: C.muted }}>Skip</Text>
                        </Pressable>
                      ) : null}
                      {item.status !== 'done' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.kind === 'rest' ? 'rest' : name} from ${dayNames[day.weekday - 1]}`}
                          onPress={() => void save(day, toItems(day.items.filter((_, other) => other !== index)))}
                          style={({ pressed }) => ({ width: 36, minHeight: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
                        >
                          <Text variant="section" style={{ color: C.muted }}>×</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : undefined
                }
              />
            </View>
          );
        })}
        {day ? (
          <DaySeries
            date={day.date}
            occurrences={dayOccurrences}
            series={bundle.series}
            flows={flows}
            checks={checks}
            onTickItem={id => onTickItem(id, day.date)}
            onOpenItem={onOpenItem}
            onStartFlow={onStartFlow}
            purposeId={purposeId}
            pickLabel={pickLabel}
            onSeePicks={onSeePicks}
          />
        ) : null}
        {starter ? (
          <WrittenDayCard
            day={starter}
            flowTitle={flowTitleFor(starter.flowId, flows)}
            purposeId={purposeId}
            pickLabel={pickLabel}
            onStart={onStartFlow}
            onSeePicks={onSeePicks}
          />
        ) : bareDay ? (
          <ListState
            loading={(!week && !weekError) || bundle.loading}
            error={weekError || bundle.error}
            empty="Nothing planned yet."
            onRetry={() => {
              setTick(value => value + 1);
              void reloadFlowSeries();
            }}
          />
        ) : null}
        <ListHairline />
        <View style={{ flexDirection: 'row', gap: space.ms, flexWrap: 'wrap', padding: space.md }}>
          <Button
            title="+ Add"
            variant="secondary"
            fit
            size="regular"
            disabled={!day}
            accessibilityLabel={`Add to ${day ? dayNames[day.weekday - 1] : 'today'}`}
            onPress={() => setAdding(true)}
          />
          {planned.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={moving ? 'Stop moving this day' : 'Move this day'}
              onPress={() => setMoving(value => !value)}
              style={({ pressed }) => ({
                minHeight: hit,
                justifyContent: 'center',
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: C.line,
                opacity: pressed ? opacity.pressed : 1
              })}
            >
              <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{moving ? 'Cancel' : 'Move day'}</Text>
            </Pressable>
          ) : null}
        </View>
        {moving && day && week ? (
          <View style={{ gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md }}>
            <Text variant="footnote" style={{ color: C.muted }}>Swap {dayNames[day.weekday - 1]} with</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {week.days.map(other => (
                <Pressable
                  key={other.date}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap with ${dayNames[other.weekday - 1]}`}
                  disabled={other.date === day.date}
                  onPress={() => {
                    void swapTrainingDays({ weekA: day.week, weekdayA: day.weekday, weekB: other.week, weekdayB: other.weekday })
                      .then(() => {
                        setMoving(false);
                        setSelected(other.date);
                        setTick(value => value + 1);
                      })
                      .catch(fail);
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: other.date === day.date ? 'transparent' : C.bg,
                    opacity: other.date === day.date ? 0.3 : pressed ? opacity.pressed : 1
                  })}
                >
                  <Text style={{ color: C.text, fontWeight: '600' }}>{letters[other.weekday - 1]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ListCard>
      {!week?.active ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Use a ready-made plan" onPress={onBrowse} style={{ minHeight: hit, justifyContent: 'center' }}>
          <Text variant="subhead" style={{ color: C.muted }}>
            Or use a <Text style={{ color: C.lime, fontWeight: '600' }}>ready-made plan</Text>
          </Text>
        </Pressable>
      ) : null}
      {error ? (
        <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
      {adding && day ? (
        <DailyFlowAddSheet
          day={day}
          series={bundle.series}
          onDay={new Set(dayOccurrences.map(row => row.itemId))}
          focusId={focusId}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </View>
  );
}

/** A sheet for adding a flow, a session or rest to one day of the week. */
export function DayEditor({
  day,
  flows,
  onClose,
  onSave,
  onPickFlow
}: {
  day: WeekDay;
  flows: HabitFlow[];
  onClose: () => void;
  onSave: (items: PlanItem[]) => void;
  /** When set, choosing a flow opens a series instead of saving a plan slot. */
  onPickFlow?: (flow: { id: string; title: string }) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'flow' | 'session'>('flow');
  const [sessions, setSessions] = useState<TrainingSessionSummary[]>([]);
  const items = toItems(day.items);
  useEffect(() => {
    let live = true;
    trainingSessions()
      .then(result => {
        if (live) setSessions(result.sessions);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const needle = query.trim().toLowerCase();
  const onDay = new Set(items.flatMap(item => (item.kind === 'rest' ? [] : [item.id])));
  const flowRows = flows
    .filter(flow => liveFlowIds.has(flow.id))
    .map(flow => ({ id: flow.id, title: flow.title, detail: flowDetail(flow) }))
    .sort((a, b) => a.title.localeCompare(b.title) || a.detail.localeCompare(b.detail));
  const sessionRows = [...sessions]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(session => ({ id: session.id, title: session.title, detail: session.level ?? '' }));
  const rows = (tab === 'flow' ? flowRows : sessionRows).filter(row => `${row.title} ${row.detail}`.toLowerCase().includes(needle));
  const add = (item: PlanItem) => onSave(item.kind === 'rest' ? [item] : [...items.filter(entry => entry.kind !== 'rest'), item]);
  return (
    <Sheet title={`Add to ${dayNames[day.weekday - 1]}`} presentation="modal" scrollable={false} closeLabel="Close" onClose={onClose}>
      <View style={{ flex: 1, gap: space.ms, paddingBottom: inset.bottom }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['flow', 'session'] as const).map(kind => (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === kind }}
              accessibilityLabel={kind === 'flow' ? 'Flows' : 'Sessions'}
              onPress={() => setTab(kind)}
              style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: tab === kind ? C.lime : C.card }}
            >
              <Text style={{ color: tab === kind ? C.onAccent : C.text, fontWeight: '600' }}>{kind === 'flow' ? 'Flows' : 'Sessions'}</Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Make it a rest day"
            onPress={() => add({ kind: 'rest', label: 'Rest' })}
            style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: C.line }}
          >
            <Text style={{ color: C.text, fontWeight: '600' }}>Rest day</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tab === 'flow' ? 'Search flows' : 'Search sessions'}
          placeholderTextColor={C.muted}
          accessibilityLabel={tab === 'flow' ? 'Search flows' : 'Search sessions'}
          style={{ height: 44, paddingHorizontal: space.md, borderRadius: radius.small, backgroundColor: C.card, color: C.text, fontSize: textRoles.callout.fontSize}}
        />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.sm }}>
          {rows.map(row => {
            const added = onDay.has(row.id);
            const name = row.detail ? `${row.title}, ${row.detail}` : row.title;
            return (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={added ? `${name}, already on this day` : `Add ${name}`}
                disabled={added}
                onPress={() => {
                  if (tab === 'flow' && onPickFlow) {
                    onPickFlow({ id: row.id, title: row.title });
                    return;
                  }
                  add({ kind: tab, id: row.id });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, minHeight: size.button, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
              >
                <View style={{ flex: 1, gap: space.xxs, paddingVertical: space.sm }}>
                  <Text variant="headline" numberOfLines={1} style={{ color: added ? C.muted : C.text }}>
                    {row.title}
                  </Text>
                  {row.detail ? (
                    <Text variant="footnote" numberOfLines={1} style={{ color: C.muted }}>
                      {row.detail}
                    </Text>
                  ) : null}
                </View>
                <Mark name={added ? 'checkmark' : 'plus.circle'} color={added ? C.muted : C.lime} />
              </Pressable>
            );
          })}
          {!rows.length ? <Text variant="subhead" style={{ color: C.muted, paddingVertical: space.ms }}>No matches.</Text> : null}
        </ScrollView>
      </View>
    </Sheet>
  );
}
