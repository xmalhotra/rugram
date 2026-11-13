import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { elapsedSeconds } from '../../shared/flow-run';
import { addedFlows } from '../../shared/home-feed';
import { flowCreationEnabled, catalogFlows } from '../../shared/flow-catalog';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import type { PersonalFlow } from '../../shared/personal-flows';
import { areaPicture, pictureHeadline } from '../../shared/body-flow';
import { coverageForTarget, type CoverageSource } from '../../shared/body-flow-actions';
import { dailyCount, addDailyItem, tickDailyItem } from '../../shared/daily-checks';
import { helpsLine, itemForCheck } from '../../shared/daily-flow-item';
import { dailyFlowItems } from '../../shared/daily-flow-item-data';
import { calendarWeekday, addCalendarDays } from '../../shared/flow-series';
import { localDate } from '../../shared/flow-habits';
import { gymFlowById } from '../../shared/gym-flows';
import { focusLevelFor } from '../../shared/member-level';
import { dailyFlowOn, followedMapFlow, plannedExerciseIds, type MapFlow } from '../../shared/map-flow';
import type { MuscleArea } from '../../shared/muscle-map';
import { memberPurposeId } from '../../shared/purposes';
import { starterWeeklyLine, suggestStarter } from '../../shared/starter-flow';
import {
  chooseToday,
  type TodayEntry,
  type TodayFacts,
  type TodaySuggestion,
} from '../../shared/today';
import { BodyPicture } from './BodyMap';
import { BodyFlowSheet } from './BodyFlow';
import { ColdStart, useRoutinePresence } from './ColdStart';
import { liveFlowIds } from './catalog-live';
import { useDailyChecks } from './daily-checks';
import { Button, Card, EmptyState, ReasonLine, SectionHeader, Skeleton } from './design/components';
import { Text } from './design/Text';
import { hit, opacity, space, useTheme } from './design/theme';
import { describedCatalogFlow, useFlowMember } from './flow-member';
import { useFlowSeries } from './flow-series';
import { stopFollow, useFlowFollows } from './follow';
import { FocusReviewCard } from './FocusReview';
import { MapFlowShelf } from './MapFlowShelf';
import { ShareSection } from './ShareFlow';
import { followedPlanAreas, useMapFlows } from './map-flows';
import { usePaneState } from './pane-state';
import { usePersonalMetrics } from './personal-metrics';
import { SeriesSheet } from './SeriesSheet';
import { useActiveRun } from './active-run';
import { useBodyFlow } from './body-flow';
import { useTrainingSessionPane } from './training-route';

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function flowTitle(id: string, library: readonly HabitFlow[], fallback: string) {
  return gymFlowById(id)?.title ?? library.find(item => item.id === id)?.title ?? fallback;
}

function coverMiss(area: MuscleArea, reason: string, flow: MapFlow, library: readonly HabitFlow[]): TodaySuggestion | null {
  const seen = new Set<string>();
  const own: CoverageSource[] = [];
  for (const day of flow.days) {
    for (const ref of day.flows) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      const listed = plannedExerciseIds(ref);
      const blocks = library.find(item => item.id === ref.id)?.workout?.blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : [])) ?? [];
      const exerciseIds = listed.length ? listed : blocks;
      if (!exerciseIds.length) continue;
      own.push({
        kind: ref.kind === 'session' ? 'session' : 'flow',
        id: ref.id,
        title: flowTitle(ref.id, library, day.name),
        exerciseIds,
      });
    }
  }
  const catalogue: CoverageSource[] = [];
  for (const item of catalogFlows) {
    const id = item.flowId;
    if (!id || seen.has(id)) continue;
    const exerciseIds = plannedExerciseIds({ kind: 'flow', id });
    if (!exerciseIds.length) continue;
    seen.add(id);
    catalogue.push({ kind: 'flow', id, title: item.title, exerciseIds });
  }
  const best = coverageForTarget({ kind: 'area', id: area }, own)[0] ?? coverageForTarget({ kind: 'area', id: area }, catalogue)[0];
  if (!best || best.kind === 'session') return best ? { id: best.id, title: best.title, reason } : null;
  return { id: best.id, title: best.title, reason };
}

/** Yours: the figure, one Today card, then the Map flow shelf. */
export function HomeFeed({
  data,
  onExplore,
  onFlow,
  onStart,
  onSavePurpose,
}: {
  data: MobilePayload;
  onExplore: () => void;
  onFlow: (flow: HabitFlow) => void;
  onPersonalFlow: (flow: PersonalFlow) => void;
  onStart?: (target: { kind: 'flow' | 'personal'; id: string; title: string; version?: number; resume?: boolean }) => void;
  onSavePurpose?: (id: string) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const today = localDate(new Date());
  const tomorrowDate = addCalendarDays(today, 1);
  const map = useMapFlows(today);
  const week = useBodyFlow('week');
  const { run } = useActiveRun();
  const now = useNow(Boolean(run));
  const { member } = useFlowMember(data.profile.focusId);
  const { checks, update } = useDailyChecks(data.user?.id);
  const series = useFlowSeries(today, tomorrowDate);
  const follows = useFlowFollows(today);
  const trial = follows.follows.find(item => item.status === 'active');
  const priorityOrder = usePersonalMetrics()['gym.priorities']?.areas ?? [];
  const routine = useRoutinePresence();
  const [coldDone, setColdDone] = usePaneState('coldStartDone', false, 'account');
  const [bodyOpen, setBodyOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [, setSession] = useTrainingSessionPane();
  const purposeId = memberPurposeId({ purposeId: data.profile.purposeId, demoMode: data.demoMode });
  const followed = map.list ? followedMapFlow(map.list.flows, map.list.follows, today) : null;
  const progress = followed ? { doneDates: followed.flow.doneDates, letGo: followed.flow.released } : null;
  const placement = followed && progress ? dailyFlowOn(followed.flow, followed.from, progress, today) : null;

  function entriesOn(date: string, day: NonNullable<typeof placement>): TodayEntry[] {
    const flows = day.flows.map(ref => ({
      id: ref.id,
      kind: 'flow' as const,
      title: flowTitle(ref.id, data.flows, day.name),
      detail: day.name,
      done: series.occurrences.some(row => row.date === date && row.itemId === ref.id && row.status === 'done'),
      ...(ref.version != null ? { version: ref.version } : {}),
    }));
    const items = day.items.map(item => {
      const known = itemForCheck(dailyFlowItems, item.itemId, item.name);
      const help = known ? helpsLine(known, purposeId) : '';
      const local = checks.items.find(
        row => row.id === item.itemId || row.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      );
      const count = local ? dailyCount(checks, local.id, date) : 0;
      const amount = known ? `${known.amount} · ${known.timing}` : item.checkpoint;
      const dose = item.timesPerDay > 1 ? `${Math.min(count, item.timesPerDay)} of ${item.timesPerDay}` : '';
      return {
        id: item.itemId,
        kind: 'item' as const,
        title: known?.name ?? item.name,
        detail: [amount, help, dose].filter(Boolean).join('. '),
        done: Boolean(local) && count >= item.timesPerDay,
      };
    });
    return [...flows, ...items];
  }

  const todayList = !followed ? null : placement ? entriesOn(today, placement) : [];
  const flowsDone = (todayList ?? []).every(entry => entry.kind !== 'flow' || entry.done);
  const tomorrowProgress = followed
    ? {
        doneDates: flowsDone ? [...new Set([...followed.flow.doneDates, today])] : followed.flow.doneDates,
        letGo: followed.flow.released,
      }
    : null;
  const tomorrowPlacement = followed && tomorrowProgress ? dailyFlowOn(followed.flow, followed.from, tomorrowProgress, tomorrowDate) : null;
  const tomorrowEntries = tomorrowPlacement ? entriesOn(tomorrowDate, tomorrowPlacement) : [];
  const tomorrow = tomorrowEntries.find(entry => entry.kind === 'flow') ?? tomorrowEntries[0] ?? null;
  const planned = new Set(followedPlanAreas(map.list, today, week.data ? { from: week.data.from, to: week.data.to } : undefined, data.flows));
  const started = Boolean(week.data?.dayZero);
  const pictures = (week.data?.areas ?? []).map(area => {
    const picture = areaPicture({
      sets: area.sets,
      band: area.band,
      weeks: 1,
      priority: started && priorityOrder.includes(area.area),
      planned: started && planned.has(area.area),
    });
    return { area: area.area, state: picture.state, step: picture.step };
  });
  const headline = !week.data
    ? null
    : !started
      ? { text: 'Finish a flow and your Body flow starts today.', area: null as MuscleArea | null }
      : pictureHeadline(pictures, priorityOrder, 'this week');
  const missed = headline?.area && followed ? coverMiss(headline.area, headline.text, followed.flow, data.flows) : null;
  const described = catalogFlows.flatMap(flow => {
    const row = describedCatalogFlow(flow);
    return row ? [row] : [];
  });
  const pick = suggestStarter(described, member);
  // Only flows live in the new catalog count. Self-made flows stay out while creating is off.
  const liveAdded = addedFlows(data).filter(flow => liveFlowIds.has(flow.id));
  const personalFlows = flowCreationEnabled ? (data.profile.personalFlows ?? []) : [];
  const maybeNew =
    Boolean(onSavePurpose) &&
    !map.loading &&
    !coldDone &&
    liveAdded.length === 0 &&
    personalFlows.length === 0 &&
    (map.list?.flows.length ?? 0) === 0;
  const fresh = maybeNew && routine.ready && routine.empty;
  const starter =
    maybeNew && !routine.ready
      ? null
      : pick?.flow.flowId
        ? {
            id: pick.flow.flowId,
            title: pick.flow.title,
            reason: (pick as { reason?: string }).reason || starterWeeklyLine(focusLevelFor(member.level)),
          }
        : null;
  const question = fresh
    ? {
        id: 'opening',
        title: 'Qram means sequence',
        reason: 'This app gives you a sequence for your day, starting with training.',
      }
    : null;
  const workout = run
    ? {
        title: run.title,
        exercise: run.state.index + 1,
        exerciseCount: Math.max(run.state.cards.length, 1),
        timer: clock(elapsedSeconds(run.state, now)),
      }
    : null;
  const waiting = !workout && map.loading && !map.list;
  const blocked = !workout && Boolean(map.error) && !map.list;
  const facts: TodayFacts = {
    workout,
    question,
    today: todayList,
    tomorrow,
    missed,
    starter,
    doneSummary: placement ? (placement.flows.length === 0 ? `${placement.name} today` : `${placement.name} is done`) : 'Nothing scheduled today',
  };
  const choice = waiting || blocked ? null : chooseToday(facts);
  const featured = choice?.rule === 'start' ? choice.entry : null;
  const shownStarter = choice?.rule === 'starter' ? choice.starter : null;
  const remaining = (todayList ?? []).filter(entry => !entry.done && (entry.kind !== featured?.kind || entry.id !== featured.id));
  const outline = (followed?.flow.figure ?? []).filter(area => area.state === 'worked').map(area => area.area);
  const figureWidth = Math.min(260, Math.max(180, width - 32));
  const sunday = calendarWeekday(today) === 7;

  function startFlow(id: string, title: string, version?: number) {
    const ref = followed?.flow.days.flatMap(day => [...day.flows]).find(item => item.id === id);
    if (ref?.kind === 'session') {
      setSession({ id, date: today });
      return;
    }
    onStart?.({ kind: 'flow', id, title, ...(version != null ? { version } : {}) });
  }

  function tick(entry: TodayEntry) {
    const item = placement?.items.find(row => row.itemId === entry.id);
    if (!item) return;
    update(current => {
      const existing = current.items.find(
        row => row.id === item.itemId || row.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      );
      const ready = existing ? current : addDailyItem(current, item.name, item.timesPerDay, item.itemId, item.checkpoint);
      return tickDailyItem(ready, existing?.id ?? item.itemId, today);
    });
  }

  const figureLabel = headline ? `Body flow. ${headline.text}` : 'Body flow';

  return (
    // The page leaves room for the tab bar and the run bar (useFloatingInsets in App).
    <View style={{ gap: space.lg }}>
      <Pressable accessibilityRole="button" accessibilityLabel={figureLabel} onPress={() => setBodyOpen(true)}>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <BodyPicture areas={pictures} outline={outline} width={figureWidth} />
          {headline ? (
            <Text variant="headline" style={{ color: C.text, textAlign: 'center' }}>{headline.text}</Text>
          ) : null}
        </View>
      </Pressable>
      {waiting ? (
        <Card>
          <SectionHeader title="Today" />
          <Skeleton shape="line" />
        </Card>
      ) : null}
      {blocked ? (
        <Card>
          <SectionHeader title="Today" />
          <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
            {map.error}
          </Text>
          <Button title="Try again" onPress={() => void map.reload()} />
        </Card>
      ) : null}
      {choice?.rule === 'continue' && run ? (
        <Card>
          <SectionHeader title={run.title} />
          <Text variant="body" style={{ color: C.text }}>
            Exercise {choice.workout.exercise} of {choice.workout.exerciseCount}
          </Text>
          <Text variant="subhead" numeric style={{ color: C.muted }}>
            {choice.workout.timer}
          </Text>
          <Button title="Continue" onPress={() => onStart?.({ kind: run.kind, id: run.id, title: run.title, resume: true })} />
        </Card>
      ) : null}
      {choice?.rule === 'question' && onSavePurpose ? (
        <Card>
          <ColdStart
            onSavePurpose={onSavePurpose}
            onExplore={onExplore}
            onStart={(id, title) => startFlow(id, title)}
            onUse={async templateId => {
              const next = await map.change({ action: 'create', templateId, slot: 1, start: today });
              const made = next.flows.find(flow => flow.slot === 1);
              if (made) await map.change({ action: 'follow', mapFlowId: made.id, from: today });
            }}
            onDone={() => setColdDone(true)}
          />
        </Card>
      ) : null}
      {choice?.rule === 'start' && choice.entry.kind === 'flow' ? (
        <Card>
          <SectionHeader title={choice.entry.title} />
          <ReasonLine>{choice.entry.detail}</ReasonLine>
          <Button title="Start" onPress={() => startFlow(choice.entry.id, choice.entry.title, choice.entry.version)} />
        </Card>
      ) : null}
      {choice?.rule === 'start' && choice.entry.kind === 'item' ? (
        <Card>
          <SectionHeader title={choice.entry.title} />
          <ReasonLine>{choice.entry.detail}</ReasonLine>
          <Button title="Tick" onPress={() => tick(choice.entry)} />
        </Card>
      ) : null}
      {choice?.rule === 'suggest' ? (
        <Card>
          <SectionHeader title={choice.suggestion.title} />
          <ReasonLine>{choice.suggestion.reason}</ReasonLine>
          <Button title="Start" onPress={() => startFlow(choice.suggestion.id, choice.suggestion.title)} />
        </Card>
      ) : null}
      {shownStarter ? (
        <Card>
          <SectionHeader title={shownStarter.title} />
          <ReasonLine>{shownStarter.reason}</ReasonLine>
          <Button title="Start" onPress={() => startFlow(shownStarter.id, shownStarter.title)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${shownStarter.title} to Daily flow`}
            onPress={() => setAdding(true)}
            style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
          >
            <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Add to Daily flow</Text>
          </Pressable>
        </Card>
      ) : null}
      {maybeNew && !routine.ready ? (
        <Card>
          <SectionHeader title="Today" />
          <Skeleton shape="line" />
        </Card>
      ) : null}
      {choice?.rule === 'starter' && !shownStarter && !(maybeNew && !routine.ready) ? (
        <Card>
          <EmptyState
            title="No Daily flow yet"
            description="A Daily flow is the flows and items for one day. There is no starter for this focus yet."
            action={{ label: 'Browse flows', onPress: onExplore }}
          />
        </Card>
      ) : null}
      {choice?.rule === 'done' ? (
        <Card>
          <SectionHeader title={choice.summary} />
          {choice.tomorrow ? (
            <Text variant="callout" style={{ color: C.text }}>
              Tomorrow: {choice.tomorrow.title}
              {choice.tomorrow.detail ? ` · ${choice.tomorrow.detail}` : ''}
            </Text>
          ) : (
            <Text variant="callout" style={{ color: C.muted }}>Tomorrow is open.</Text>
          )}
        </Card>
      ) : null}
      {trial ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Stop following ${trial.title}`}
          onPress={() => void stopFollow(trial.id, today)}
          style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Stop following</Text>
        </Pressable>
      ) : null}
      {remaining.length ? (
        <View style={{ gap: space.sm }}>
          <Text variant="footnote" style={{ color: C.muted, fontWeight: '600' }}>Also today</Text>
          {remaining.map(entry => (
            <View key={`${entry.kind}:${entry.id}`} style={{ gap: space.xxs }}>
              <Text variant="callout" style={{ color: C.text }}>{entry.title}</Text>
              {entry.detail ? <Text variant="subhead" style={{ color: C.muted }}>{entry.detail}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
      {sunday && !fresh ? <FocusReviewCard /> : null}
      <MapFlowShelf purposeId={purposeId} level={member.level} />
      {fresh ? null : <ShareSection />}
      {adding && shownStarter ? (
        <SeriesSheet
          mode="create"
          title={shownStarter.title}
          itemKind="flow"
          itemId={shownStarter.id}
          start={today}
          onClose={() => {
            setAdding(false);
            void map.reload();
          }}
        />
      ) : null}
      {bodyOpen ? (
        <BodyFlowSheet
          library={data.flows}
          focusId={data.profile.focusId}
          onClose={() => setBodyOpen(false)}
          onStartFlow={(id, title) => startFlow(id, title)}
          onOpenFlow={onFlow}
        />
      ) : null}
    </View>
  );
}
