import { Button, IconButton, Sheet } from './design/components';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HabitFlow } from '../../shared/mobile';
import { emptyDailyChecks, type DailyChecks } from '../../shared/daily-checks';
import { dailyFlowDay } from '../../shared/daily-flow';
import {
  addCalendarDays,
  calendarWeekday,
  describeRecurrence,
  formatSeriesClock,
  formatSeriesDate,
  shiftCalendarMonth,
  type FlowSeries,
  type SeriesOccurrence
} from '../../shared/flow-series';
import { gymFlowById } from '../../shared/gym-flows';
import { DailyItemFacts, WrittenDayCard, flowTitleFor } from './DailyItemFacts';
import { writtenDay } from '../../shared/purposes';
import { localDate } from '../../shared/flow-habits';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { numeric, useTheme, space, radius, stroke, hit, opacity } from './design/theme';
import { adoptSeriesVersion, deleteSeries, moveOccurrence, peekFlowSeries, reloadFlowSeries, skipOccurrence, useFlowSeries } from './flow-series';
import { stopFollow, useFlowFollows } from './follow';
import { api } from './api';
import { SeriesSheet } from './SeriesSheet';
import { trainingSessions, trainingWeek, type WeekDay } from './training-api';
import { useTrainingSessionPane, useTrainingTick } from './training-route';

const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const rowHeight = 56;

function useSessionTitles() {
  const [titles, setTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    trainingSessions()
      .then(result => {
        if (!live) return;
        const next: Record<string, string> = {};
        for (const session of result.sessions) next[session.id] = session.title;
        setTitles(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return titles;
}

function usePlanDays(key: string) {
  const [tick] = useTrainingTick();
  const [days, setDays] = useState<Record<string, WeekDay>>({});
  useEffect(() => {
    const dates = key ? key.split(',') : [];
    const mondays = [...new Set(dates.map(date => addCalendarDays(date, 1 - calendarWeekday(date))))];
    let live = true;
    Promise.all(mondays.map(date => trainingWeek(date).catch(() => null)))
      .then(weeks => {
        if (!live) return;
        const next: Record<string, WeekDay> = {};
        for (const week of weeks) {
          if (!week) continue;
          for (const day of week.days) next[day.date] = day;
        }
        setDays(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, tick]);
  return days;
}

type CommunityLabel = { title: string; author: string; version: number };

function useCommunityLabels(ids: string[]) {
  const key = [...new Set(ids)].sort().join(',');
  const [labels, setLabels] = useState<Record<string, CommunityLabel>>({});
  useEffect(() => {
    if (!key) return;
    let live = true;
    void Promise.all(
      key.split(',').map(async id => {
        try {
          const result = await api<{ flow: { id: string; title: string; version: number; author: { name: string } } }>(
            `/api/mobile/community?id=${encodeURIComponent(id)}`,
          );
          return result.flow;
        } catch {
          return null;
        }
      }),
    ).then(flows => {
      if (!live) return;
      const next: Record<string, CommunityLabel> = {};
      for (const flow of flows) {
        if (!flow) continue;
        next[flow.id] = { title: flow.title, author: flow.author.name, version: flow.version };
      }
      setLabels(next);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return labels;
}

function titleOf(item: SeriesOccurrence, flows: HabitFlow[], sessions: Record<string, string>, community: Record<string, CommunityLabel> = {}) {
  if (item.itemKind === 'community') return community[item.itemId]?.title ?? 'Flow';
  if (item.itemKind === 'flow')
    return flows.find(flow => flow.id === item.itemId)?.title ?? gymFlowById(item.itemId)?.title ?? 'Flow';
  return sessions[item.itemId] ?? 'Session';
}

/** The rounded list every calendar view sits in, so Day, Week and Month read the same. */
export function ListCard({ children }: { children: ReactNode }) {
  const { colors: C } = useTheme();
  return <View style={{ borderRadius: radius.control, backgroundColor: C.card, overflow: 'hidden' }}>{children}</View>;
}

/** A checkpoint, or any other grouping, above the rows it covers. */
export function SectionHeader({ title, first = false }: { title: string; first?: boolean }) {
  const { colors: C } = useTheme();
  return (
    <Text variant="footnote"
      style={{
        color: C.muted,
        fontWeight: '600',
        letterSpacing: 0.4,
        paddingHorizontal: space.md,
        paddingTop: first ? space.ms : space.md,
        paddingBottom: space.sm
      }}
    >
      {title}
    </Text>
  );
}

export function ListHairline() {
  const { colors: C } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: space.md }} />;
}

/** One line of the routine: what it is, what it repeats as, and the clock time on the right. */
export function RoutineRow({
  title,
  detail,
  time,
  dim,
  trailing,
  onPress,
  accessibilityLabel
}: {
  title: string;
  detail?: string;
  time?: string;
  dim?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors: C } = useTheme();
  const words = [title, detail, time].filter(Boolean).join(', ');
  const lines = (
    <View style={{ flex: 1, gap: space.xxs }}>
      <Text variant="headline" numberOfLines={1} style={{ color: dim ? C.muted : C.text }}>
        {title}
      </Text>
      {detail ? (
        <Text variant="footnote" numberOfLines={1} style={{ color: C.muted }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
  const clock = time ? (
    <Text variant="subhead"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ color: C.muted, ...numeric }}
    >
      {time}
    </Text>
  ) : null;
  const frame = { minHeight: rowHeight, flexDirection: 'row', alignItems: 'center', gap: space.ms, paddingHorizontal: space.md, paddingVertical: space.sm } as const;
  // A row with its own buttons keeps them reachable, so only the text is one control.
  const text = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? words}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? C.bg : 'transparent' })}
    >
      {lines}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={accessibilityLabel ?? words} style={{ flex: 1 }}>
      {lines}
    </View>
  );
  return (
    <View style={frame}>
      {text}
      {clock}
      {trailing}
    </View>
  );
}

/** Nothing on, still loading, or the fetch failed: one place so every view says the same thing. */
export function ListState({ loading, error, empty, onRetry }: { loading: boolean; error: string; empty: string; onRetry: () => void }) {
  const { colors: C } = useTheme();
  if (loading)
    return (
      <View style={{ minHeight: rowHeight, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md }}>
        <ActivityIndicator accessibilityLabel="Loading your Daily flow" color={C.lime} />
      </View>
    );
  if (error)
    return (
      <View style={{ paddingHorizontal: space.md, paddingVertical: space.md, gap: space.sm }}>
        <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
        <Button
          variant="text"
          size="regular"
          title="Try again"
          accessibilityLabel="Try loading your Daily flow again"
          onPress={onRetry}
        />
      </View>
    );
  return (
    <View style={{ minHeight: rowHeight, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.md }}>
      <Text variant="subhead" style={{ color: C.muted }}>{empty}</Text>
    </View>
  );
}

function StartPill({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button title="Start" fit size="regular" accessibilityLabel={label} onPress={onPress} />;
}

type ActionName = 'play.fill' | 'xmark.circle' | 'calendar.badge.clock' | 'pencil' | 'trash';
const actionFallback: Record<ActionName, string> = {
  'play.fill': '▶',
  'xmark.circle': '⊗',
  'calendar.badge.clock': '▦',
  pencil: '✎',
  trash: '⌫'
};

function Action({ label, title, icon, onPress, danger = false }: { label: string; title: string; icon: ActionName; onPress: () => void; danger?: boolean }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: rowHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.md,
        backgroundColor: pressed ? C.card : 'transparent'
      })}
    >
      <Glyph name={icon} fallback={actionFallback[icon]} color={danger ? C.danger : C.text} size={22} />
      <Text variant="body" style={{ flex: 1, color: danger ? C.danger : C.text }}>{title}</Text>
    </Pressable>
  );
}

/** One day: flows and lifestyle items in time order, with the action sheet for a flow. */
export function DaySeries({
  date,
  occurrences,
  series,
  flows,
  checks,
  onTickItem,
  onOpenItem,
  onStartFlow,
  purposeId,
  pickLabel,
  onSeePicks
}: {
  date: string;
  occurrences: SeriesOccurrence[];
  series: FlowSeries[];
  flows: HabitFlow[];
  checks?: DailyChecks;
  onTickItem?: (id: string) => void;
  onOpenItem?: (id: string) => void;
  onStartFlow: (id: string, title: string, version?: number) => void;
  purposeId?: string;
  pickLabel?: (id: string, name: string) => string | undefined;
  onSeePicks?: (category: string) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const sessions = useSessionTitles();
  const community = useCommunityLabels(occurrences.filter(item => item.itemKind === 'community').map(item => item.itemId));
  const [, setSession] = useTrainingSessionPane();
  const follows = useFlowFollows(date);
  const [opened, setOpened] = useState<SeriesOccurrence | null>(null);
  const [editing, setEditing] = useState<FlowSeries | null>(null);
  const [moving, setMoving] = useState<SeriesOccurrence | null>(null);
  const [error, setError] = useState('');
  const entries = dailyFlowDay(date, occurrences, checks ?? emptyDailyChecks());
  if (!entries.length && !opened && !editing && !moving && !error) return null;
  const openedSeries = opened ? series.find(item => item.id === opened.seriesId) : undefined;
  const openedTitle = opened ? titleOf(opened, flows, sessions, community) : '';
  function fail(reason: unknown) {
    setError(reason instanceof Error ? reason.message : 'Try again.');
  }
  function confirmDelete(item: SeriesOccurrence, name: string) {
    setOpened(null);
    Alert.alert('Delete series?', `Every occurrence of ${name} leaves your Daily flow.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteSeries(item.seriesId).catch(fail) },
    ]);
  }
  return (
    <>
      {entries.map((entry, index) => {
        if (entry.kind === 'item') {
          const done = entry.status === 'done';
          const slot = entry.checkpoint === 'anytime' ? 'Anytime' : entry.checkpoint;
          return (
            <View key={`item:${entry.id}`}>
              {index ? <ListHairline /> : null}
              <RoutineRow
                title={`${done ? '✓ ' : ''}${entry.name}`}
                detail={slot}
                dim={done}
                accessibilityLabel={`${done ? 'Done, ' : ''}${entry.name}, ${slot}. Options`}
                onPress={() => onOpenItem?.(entry.id)}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.name}, ${entry.ticked} of ${entry.timesPerDay}. Tick one more`}
                    onPress={() => onTickItem?.(entry.id)}
                    style={{ minHeight: hit, justifyContent: 'center' }}
                  >
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      {Array.from({ length: entry.timesPerDay }, (_, dot) => (
                        <View
                          key={dot}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: radius.pill,
                            borderWidth: stroke.line,
                            borderColor: dot < entry.ticked ? C.lime : C.line,
                            backgroundColor: dot < entry.ticked ? C.lime : 'transparent'
                          }}
                        />
                      ))}
                    </View>
                  </Pressable>
                }
              />
              <DailyItemFacts
                id={entry.id}
                name={entry.name}
                purposeId={purposeId}
                pickLabel={pickLabel?.(entry.id, entry.name)}
                onSeePicks={onSeePicks}
              />
            </View>
          );
        }
        const item = occurrences.find(row => row.seriesId === entry.seriesId && row.original === entry.original);
        if (!item) return null;
        const name = titleOf(item, flows, sessions, community);
        const source = series.find(row => row.id === item.seriesId);
        const summary = source ? describeRecurrence(source) : '';
        const author = item.itemKind === 'community' ? community[item.itemId]?.author : '';
        const savedVersion = source?.version ?? item.version;
        const latest = item.itemKind === 'community' ? community[item.itemId]?.version : undefined;
        const stale = latest != null && savedVersion != null && latest > savedVersion;
        const clock = item.time.at ? formatSeriesClock(item.time.at) : '';
        const detail = [item.time.checkpoint, author ? `by ${author}` : '', summary, item.moved ? 'Moved' : ''].filter(Boolean).join(' · ');
        return (
          <View key={`${item.seriesId}:${item.original}`}>
            {index ? <ListHairline /> : null}
            <RoutineRow
              title={`${item.status === 'done' ? '✓ ' : ''}${name}`}
              detail={detail}
              time={clock}
              dim={item.status === 'done'}
              accessibilityLabel={`${item.status === 'done' ? 'Done, ' : ''}${name}${author ? ` by ${author}` : ''}, ${item.time.checkpoint}${clock ? `, ${clock}` : ''}${summary ? `, ${summary}` : ''}. Options`}
              onPress={() => setOpened(item)}
            />
            {stale ? (
              <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.xxs }}>
                <Text variant="footnote" style={{ color: C.muted }}>Updated by the author</Text>
                <Button
                  variant="text"
                  size="regular"
                  title="Use new version"
                  accessibilityLabel={`Use the new version of ${name}`}
                  onPress={() => {
                    if (latest == null) return;
                    void adoptSeriesVersion(item.seriesId, latest).catch(fail);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {error ? (
        <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger, paddingHorizontal: space.md, paddingVertical: space.ms }}>
          {error}
        </Text>
      ) : null}
      {opened ? (
        <Sheet title={openedTitle} presentation="modal" closeLabel="Cancel" onClose={() => setOpened(null)}>
          <View style={{ marginHorizontal: -space.md }}>
            <View style={{ paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.ms }}>
              <Text variant="footnote" style={{ color: C.muted }}>
                {[
                  opened.status === 'done' ? 'Done' : '',
                  formatSeriesDate(opened.date),
                  opened.time.checkpoint,
                  opened.time.at ? formatSeriesClock(opened.time.at) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <ListHairline />
            {opened.status === 'done' ? null : (
              <Action
                label={`Start ${openedTitle}`}
                title="Start"
                icon="play.fill"
                onPress={() => {
                  const item = opened;
                  setOpened(null);
                  if (item.itemKind === 'session') setSession({ id: item.itemId, date: item.date });
                  else onStartFlow(item.itemId, openedTitle, item.itemKind === 'community' ? item.version : undefined);
                }}
              />
            )}
            {opened.status === 'done' ? null : <ListHairline />}
            {follows.follows.some(item => item.status === 'active' && (item.pausedSeriesId === opened.seriesId || item.source.id === opened.itemId)) ? (
              <Action
                label="Stop following"
                title="Stop following"
                icon="xmark.circle"
                onPress={() => {
                  const trial = follows.follows.find(item => item.status === 'active' && (item.pausedSeriesId === opened.seriesId || item.source.id === opened.itemId));
                  setOpened(null);
                  if (trial) void stopFollow(trial.id, date).catch(fail);
                }}
              />
            ) : null}
            <Action
              label={`Skip ${openedTitle} this time`}
              title="Skip this time"
              icon="xmark.circle"
              onPress={() => {
                const item = opened;
                setOpened(null);
                void skipOccurrence(item.seriesId, item.original).catch(fail);
              }}
            />
            <ListHairline />
            <Action
              label={`Move ${openedTitle} this time`}
              title="Move this time…"
              icon="calendar.badge.clock"
              onPress={() => {
                setMoving(opened);
                setOpened(null);
              }}
            />
            <ListHairline />
            <Action
              label={`Edit the ${openedTitle} series`}
              title="Edit series…"
              icon="pencil"
              onPress={() => {
                if (openedSeries) setEditing(openedSeries);
                else setError('That series is no longer in your Daily flow.');
                setOpened(null);
              }}
            />
            <ListHairline />
            <Action
              label={`Delete the ${openedTitle} series`}
              title="Delete series"
              icon="trash"
              danger
              onPress={() => confirmDelete(opened, openedTitle)}
            />
          </View>
        </Sheet>
      ) : null}
      {editing ? (
        <SeriesSheet
          mode="edit"
          title={titleOf(
            { ...editing, seriesId: editing.id, date: editing.start, original: editing.start, moved: false, status: 'open' },
            flows,
            sessions,
            community,
          )}
          series={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {moving ? (
        <SeriesSheet
          mode="move"
          title={titleOf(moving, flows, sessions, community)}
          series={series.find(item => item.id === moving.seriesId) ?? movingAsSeries(moving)}
          original={moving.original}
          date={moving.date}
          time={moving.time}
          onClose={() => setMoving(null)}
        />
      ) : null}
    </>
  );
}

function movingAsSeries(item: SeriesOccurrence): FlowSeries {
  return {
    id: item.seriesId,
    itemKind: item.itemKind,
    itemId: item.itemId,
    ...(item.version != null ? { version: item.version } : {}),
    start: item.original,
    time: item.time,
    recurrence: { kind: 'once' },
    end: { kind: 'never' },
    createdAt: '2026-01-01T00:00:00.000Z'
  };
}

/** One day, flows and items together, with arrows to the days beside it. */
export function RoutineDay({
  date,
  flows,
  checks,
  onDate,
  onStartFlow,
  onTickItem,
  onOpenItem,
  purposeId,
  pickLabel,
  onSeePicks
}: {
  date: string;
  flows: HabitFlow[];
  checks: DailyChecks;
  onDate: (date: string) => void;
  onStartFlow: (id: string, title: string, version?: number) => void;
  onTickItem: (id: string) => void;
  onOpenItem: (id: string) => void;
  purposeId?: string;
  pickLabel?: (id: string, name: string) => string | undefined;
  onSeePicks?: (category: string) => void;
}) {
  const { colors: C } = useTheme();
  const today = localDate(new Date());
  const bundle = useFlowSeries(date, date);
  const plans = usePlanDays(date);
  const day = plans[date];
  const [, setSession] = useTrainingSessionPane();
  const sessions = useSessionTitles();
  const occurrences = bundle.occurrences.filter(item => item.date === date);
  const [missed, setMissed] = useState<SeriesOccurrence[]>([]);
  const [moving, setMoving] = useState('');
  const [moveError, setMoveError] = useState('');
  const community = useCommunityLabels(missed.filter(item => item.itemKind === 'community').map(item => item.itemId));
  useEffect(() => {
    if (date !== today) {
      setMissed([]);
      return;
    }
    let live = true;
    const yesterday = addCalendarDays(today, -1);
    peekFlowSeries(yesterday, yesterday)
      .then(result => {
        if (!live) return;
        setMissed(result.occurrences.filter(item => item.date === yesterday && item.status === 'open'));
      })
      .catch(() => {
        if (live) setMissed([]);
      });
    return () => {
      live = false;
    };
  }, [date, today, bundle.occurrences]);
  const planned = day?.items ?? [];
  const bare = !planned.length && !occurrences.length && !checks.items.length;
  const starter = bare && date === today && purposeId && !bundle.loading && !bundle.error ? writtenDay(purposeId, 1) : null;
  async function moveMissed(item: SeriesOccurrence, name: string) {
    if (moving) return;
    setMoving(item.seriesId);
    setMoveError('');
    try {
      await moveOccurrence(item.seriesId, item.original, { date: today });
    } catch (reason) {
      setMoveError(reason instanceof Error ? reason.message : `Could not move ${name}.`);
    } finally {
      setMoving('');
    }
  }
  return (
    <View style={{ gap: space.ms }}>
      <Pager
        title={date === today ? `Today · ${formatSeriesDate(date)}` : formatSeriesDate(date)}
        previousLabel="Previous day"
        nextLabel="Next day"
        onPrevious={() => onDate(addCalendarDays(date, -1))}
        onNext={() => onDate(addCalendarDays(date, 1))}
        onToday={date === today ? undefined : () => onDate(today)}
      />
      {date === today && missed.length ? (
        <ListCard>
          {missed.map((item, index) => {
            const name = titleOf(item, flows, sessions, community);
            return (
              <View key={`${item.seriesId}:${item.original}`}>
                {index ? <ListHairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`You missed ${name}. Move it to today?`}
                  accessibilityState={{ disabled: moving === item.seriesId }}
                  disabled={moving === item.seriesId}
                  onPress={() => void moveMissed(item, name)}
                  style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, opacity: pressed ? opacity.pressed : 1 })}
                >
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>You missed {name}. Move it to today?</Text>
                </Pressable>
              </View>
            );
          })}
          {moveError ? (
            <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger, paddingHorizontal: space.md, paddingBottom: space.ms }}>
              {moveError}
            </Text>
          ) : null}
        </ListCard>
      ) : null}
      <ListCard>
        {planned.length ? <SectionHeader title="Training plan" first /> : null}
        {planned.map((item, index) => {
          const name = item.kind === 'rest' ? item.label ?? 'Rest' : item.title;
          const id = item.id;
          const startable = item.kind !== 'rest' && id && item.status === 'open';
          return (
            <View key={`${item.kind}-${id ?? item.label}-${index}`}>
              {index ? <ListHairline /> : null}
              <RoutineRow
                title={name}
                detail={item.kind === 'rest' ? 'Rest day' : item.kind === 'flow' ? 'Flow' : 'Session'}
                dim={item.status === 'done'}
                trailing={
                  startable && id ? (
                    <StartPill
                      label={`Start ${name}`}
                      onPress={() => (item.kind === 'session' ? setSession({ id, date }) : onStartFlow(id, name))}
                    />
                  ) : undefined
                }
              />
            </View>
          );
        })}
        <DaySeries
          date={date}
          occurrences={occurrences}
          series={bundle.series}
          flows={flows}
          checks={checks}
          onTickItem={onTickItem}
          onOpenItem={onOpenItem}
          onStartFlow={onStartFlow}
          purposeId={purposeId}
          pickLabel={pickLabel}
          onSeePicks={onSeePicks}
        />
        {starter ? (
          <WrittenDayCard
            day={starter}
            flowTitle={flowTitleFor(starter.flowId, flows)}
            purposeId={purposeId}
            pickLabel={pickLabel}
            onStart={onStartFlow}
            onSeePicks={onSeePicks}
          />
        ) : bare ? (
          <ListState loading={bundle.loading} error={bundle.error} empty="Nothing on this day." onRetry={() => void reloadFlowSeries()} />
        ) : null}
      </ListCard>
    </View>
  );
}

/** ‹ title › with an optional jump back to today, shared by Day and Month. */
function Pager({
  title,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onToday,
  busy
}: {
  title: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday?: () => void;
  busy?: boolean;
}) {
  const { colors: C } = useTheme();
  const arrow = (label: string, direction: 'back' | 'forward', onPress: () => void) => (
    <IconButton
      label={label}
      onPress={onPress}
      symbol={direction === 'back' ? 'chevron.left' : 'chevron.right'}
      android={direction === 'back' ? 'arrow_back' : 'chevron_right'}
      fallback={direction === 'back' ? '‹' : '›'}
    />
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: hit }}>
      {arrow(previousLabel, 'back', onPrevious)}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
        <Text variant="headline" accessibilityRole="header" numberOfLines={1} style={{ color: C.text }}>
          {title}
        </Text>
        {busy ? <ActivityIndicator accessibilityLabel="Loading your Daily flow" color={C.muted} size="small" /> : null}
      </View>
      {onToday ? (
        <Button variant="text" size="regular" title="Today" accessibilityLabel="Go to today" onPress={onToday} />
      ) : null}
      {arrow(nextLabel, 'forward', onNext)}
    </View>
  );
}

/** Six weeks of a month: today is ringed, the chosen day is filled. A week opens that week; a day opens that day. */
export function RoutineMonth({
  month,
  selected,
  checks,
  onOpenDay,
  onOpenWeek,
  onMonth
}: {
  /** Any date inside the month on show. */
  month: string;
  /** The day the other views are on. */
  selected: string;
  checks: DailyChecks;
  onOpenDay: (date: string) => void;
  onOpenWeek: (date: string) => void;
  onMonth: (date: string) => void;
}) {
  const { colors: C } = useTheme();
  const today = localDate(new Date());
  const first = shiftCalendarMonth(month, 0);
  const year = Number(first.slice(0, 4));
  const monthNumber = Number(first.slice(5, 7));
  const gridStart = addCalendarDays(first, 1 - calendarWeekday(first));
  const days = Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index));
  const bundle = useFlowSeries(days[0] ?? first, days[41] ?? first);
  const plans = usePlanDays(days.filter((_, index) => index % 7 === 0).join(','));
  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  return (
    <View style={{ gap: space.sm }}>
      <Pager
        title={`${monthNames[monthNumber - 1]} ${year}`}
        previousLabel="Previous month"
        nextLabel="Next month"
        onPrevious={() => onMonth(shiftCalendarMonth(first, -1))}
        onNext={() => onMonth(shiftCalendarMonth(first, 1))}
        onToday={first === shiftCalendarMonth(today, 0) ? undefined : () => onMonth(today)}
        busy={bundle.loading}
      />
      <ListCard>
        <View style={{ flexDirection: 'row', paddingLeft: 40, paddingTop: space.ms, paddingBottom: space.xxs, paddingRight: space.xs }}>
          {dayLetters.map((letter, index) => (
            <Text variant="caption"
              key={`${letter}-${index}`}
              style={{ flex: 1, textAlign: 'center', color: C.muted, fontWeight: '600', letterSpacing: 0.4 }}
            >
              {letter}
            </Text>
          ))}
        </View>
        {weeks.map(week => {
          const monday = week[0] ?? first;
          return (
            <View key={monday} style={{ flexDirection: 'row', alignItems: 'center', paddingRight: space.xs }}>
              <IconButton
                label={`Open the week of ${formatSeriesDate(monday)}`}
                onPress={() => onOpenWeek(monday)}
                symbol="chevron.right"
                android="chevron_right"
                fallback="›"
                tone="muted"
              />
              {week.map(day => {
                const isToday = day === today;
                const isSelected = day === selected;
                const inMonth = Number(day.slice(5, 7)) === monthNumber;
                const itemOn = checks.items.length > 0;
                const itemDone = itemOn && checks.items.every(item => (checks.ticks[day]?.[item.id] ?? 0) >= item.timesPerDay);
                const marks = [
                  ...(plans[day]?.items ?? []).filter(item => item.kind !== 'rest').map(item => item.status === 'done'),
                  ...bundle.occurrences.filter(item => item.date === day).map(item => item.status === 'done'),
                  ...(itemOn ? [itemDone] : []),
                ].slice(0, 3);
                const dots = marks.length;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatSeriesDate(day)}${isToday ? ', today' : ''}${dots ? `, ${dots === 3 ? '3 or more' : dots} on` : ', nothing on'}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onOpenDay(day)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: hit,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: space.xs,
                      opacity: pressed ? opacity.pressed : 1
                    })}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: radius.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? C.lime : 'transparent',
                        borderWidth: isToday && !isSelected ? stroke.line : 0,
                        borderColor: C.lime
                      }}
                    >
                      <Text variant="subhead"
                        style={{
                          color: isSelected ? C.onAccent : inMonth ? C.text : C.muted,
                          fontWeight: isToday || isSelected ? '600' : '400',
                          ...numeric
                        }}
                      >
                        {Number(day.slice(8))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: space.xs, height: 5 }}>
                      {marks.map((done, index) => (
                        <View
                          key={index}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: done ? (inMonth ? C.lime : C.muted) : 'transparent',
                            borderWidth: done ? 0 : 1,
                            borderColor: inMonth ? C.lime : C.muted
                          }}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 10 }} />
        {bundle.error ? (
          <>
            <ListHairline />
            <ListState loading={false} error={bundle.error} empty="" onRetry={() => void reloadFlowSeries()} />
          </>
        ) : null}
      </ListCard>
    </View>
  );
}
