import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import { findFlowCard } from '../../shared/personal-flows';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { catalogFlows } from '../../shared/flow-catalog';
import { localDate } from '../../shared/flow-habits';
import {
  benchmarkFor,
  restFor,
  targetLoadKg,
  type RunLevel,
  type UserMetrics,
} from '../../shared/flow-benchmarks';
import {
  beginCardClock,
  completeCard,
  doneCard,
  elapsedSeconds,
  endRest,
  finishRunIfDone,
  gymSetOrder,
  nextAfterSet,
  pauseRun,
  remainingSeconds,
  resumeRun,
  showCard,
  skipCard,
  supersetCaption,
  tick,
  type FlowRunState,
  type GymSetInput,
} from '../../shared/flow-run';
import { exercise, type GymExercise, type LoadType } from '../../shared/exercises';
import { canMoveOn, plannedLine } from '../../shared/set-rows';
import { bestAtLoad, restHint, type RestHintSet } from '../../shared/rest-hint';
import { nextRestFactor, type RestFactorTap } from '../../shared/rest-factor';
import { gymCardId, gymExerciseId, gymFlowById, gymHabitCard, gymRestSeconds, gymTargetLabel, resolveTarget, type GymFlowItem } from '../../shared/gym-flows';
import { focusLevelFor, runLevelFor } from '../../shared/member-level';
import { areaPicture, bodyFlow } from '../../shared/body-flow';
import { targetBand, type FocusLevel } from '../../shared/focus-targets';
import { effortNote, formatKg, type LoggedSet } from '../../shared/progression';
import { planWithScheme, schemeById, type SetScheme } from '../../shared/set-schemes';
import { estimateLine, estimateStart, loadStrength, noEstimateLine } from './strength';
import { supersetPartnerAreas } from '../../shared/exercise-alternatives';
import { applyCustomflow, swappedFrom, type Customflow } from '../../shared/customflows';
import { flowLevelOf, memberGymItems, prioritySourceIds } from '../../shared/priority-finisher';
import type { MuscleArea } from '../../shared/muscle-map';
import { saveCustomflowSwap, useCustomflow } from './customflows';
import { savePersonalMetric, usePersonalMetrics } from './personal-metrics';
import { useCommunityFlow } from './community';
import { SwapChooser } from './EquipmentCheck';
import { buildSetDetail, setsForProgression, type SetDetail } from '../../shared/set-detail';
import { useTrainingSchemes } from './training-api';
import { BodyPicture } from './BodyMap';
import { Text } from './design/Text';
import { ReasonLine } from './design/states';
import { InlineWheels, WheelEntry, adjustLabel, durationColumns, repsColumn, weightColumn, type NumberWheelProps } from './design/NumberWheels';
import { Button, Sheet, Skeleton } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, size, space, stroke, useTheme } from './design/theme';
import { FlowIllustration } from './FlowIllustration';
import { AboutYouForm } from './AboutYou';
import { reloadBodyFlow } from './body-flow';
import { reloadFlowSeries, useFlowSeries } from './flow-series';
import { useFlowMember } from './flow-member';
import { usePaneState } from './pane-state';
import { useFlowHabits } from './flow-habits';
import {
  exerciseSessions,
  finishFlowRun,
  flowRunHome,
  logExerciseSets,
  saveFlowRun,
  startFlowRun,
  flowRunHistory,
  type ExerciseSession,
  type FlowRunRecord,
} from './flow-runs';
import type { HistorySet } from '../../shared/flow-history';
import { ExerciseVisual } from './ExerciseVisual';
import { ExerciseHowToSheet } from './ExerciseHowTo';
import { ExercisePicture, FocusArea } from './ExerciseRunMedia';
import { FlowHistory } from './FlowHistory';
import { GlassBar, RunFooter } from './RunFooter';
import { playRestEnd } from './run-sound';
import { setActiveRun, setRunScreenOpen } from './active-run';
import { RunCountdown } from './RunCountdown';
import { SoundToggle } from './SoundToggle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const levels: RunLevel[] = ['Beginner', 'Regular', 'Trained'];

/** Areas this workout just trained, for the figure on the finish screen. Untouched stays quiet. */
function workedToday(
  cards: readonly { cardId: string }[],
  drafts: Readonly<Record<string, readonly { ticked: boolean; skipped: boolean }[] | undefined>>,
  date: string,
  level: FocusLevel,
) {
  const sets: { date: string; exerciseId: string }[] = [];
  for (const card of cards) {
    const exerciseId = gymExerciseId(card.cardId);
    if (!exerciseId) continue;
    const count = (drafts[card.cardId] ?? []).filter(row => row.ticked && !row.skipped).length;
    for (let index = 0; index < count; index += 1) sets.push({ date, exerciseId });
  }
  if (!sets.length) return null;
  const result = bodyFlow(sets, [], { from: date, to: date });
  const areas = result.areas.map(area => {
    const picture = areaPicture({
      sets: area.sets,
      band: targetBand(area.area, level),
      weeks: result.weeks,
      priority: false,
      large: false,
      planned: false,
    });
    return { area: area.area, state: picture.state, step: picture.step };
  });
  return areas.some(area => area.state === 'worked') ? areas : null;
}

function clock(total: number) {
  const seconds = Math.max(0, Math.round(total));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  const body = `${minutes}:${String(remain).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}` : body;
}

type PreviewCard = { cardId: string; sourceFlowId: string; title: string; card?: HabitFlow };
type SetDraft = {
  weight: string;
  reps: string;
  seconds: string;
  ticked: boolean;
  skipped: boolean;
  touched: boolean;
  bump: string | null;
  holdRunning: boolean;
  holdStartedAt: number | null;
  holdAccumulated: number;
  buzzedMin: boolean;
  buzzedMax: boolean;
  plannedWeight: string;
  plannedReps: string;
  plannedSeconds: string;
  planFrozen: boolean;
  schemeId: string | null;
  startedAt: number | null;
  completedAt: number | null;
  restPlannedSeconds: number | null;
  clockRan: boolean;
  typedSeconds: boolean;
  edited: boolean;
};

type PendingLog = {
  runId?: string;
  exerciseId: string;
  sets: {
    setIndex: number;
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
    detail: SetDetail;
  }[];
};

const emptyHold = {
  seconds: '',
  holdRunning: false,
  holdStartedAt: null as number | null,
  holdAccumulated: 0,
  buzzedMin: false,
  buzzedMax: false,
};

const freshDetail = {
  plannedWeight: '',
  plannedReps: '',
  plannedSeconds: '',
  planFrozen: false,
  schemeId: null as string | null,
  startedAt: null as number | null,
  completedAt: null as number | null,
  restPlannedSeconds: null as number | null,
  clockRan: false,
  typedSeconds: false,
  edited: false,
};

function numberOrNull(text: string) {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function openSet(row: SetDraft, at: number): SetDraft {
  const frozen = row.planFrozen
    ? row
    : { ...row, planFrozen: true, plannedWeight: row.weight, plannedReps: row.reps, plannedSeconds: row.seconds };
  return { ...frozen, startedAt: frozen.startedAt ?? at };
}

function draftRows(
  move: GymExercise,
  item: GymFlowItem,
  last?: LoggedSet[] | null,
  openedAt?: number | null,
): SetDraft[] {
  const target = resolveTarget(item);
  const schemeId = schemeById(item.scheme).id;
  const history = setsForProgression(last);
  // First row only: last time, then the estimate, then the flow. Later rows copy what was just logged.
  const start = history.length ? null : (estimateStart(move, item)?.weightKg ?? null);
  const set = planWithScheme(move, item, schemeById(item.scheme), history, start).sets[0];
  if (!set) return [];
  const row: SetDraft = {
    weight: set.weightKg == null ? '' : formatKg(set.weightKg),
    reps: target.kind === 'reps' && set.reps != null ? String(set.reps) : '',
    ticked: false,
    skipped: false,
    touched: false,
    bump: null,
    ...emptyHold,
    seconds: target.kind === 'hold' && set.seconds != null ? String(set.seconds) : '',
    ...freshDetail,
    schemeId,
    restPlannedSeconds: gymRestSeconds(item),
  };
  return openedAt == null ? [row] : [openSet(row, openedAt)];
}

function isHoldTarget(item: GymFlowItem) {
  const target = resolveTarget(item);
  return target.kind === 'hold' || (target.kind === 'max' && target.measure === 'hold');
}

function holdElapsedMs(row: SetDraft, at: number) {
  if (!row.holdRunning || row.holdStartedAt == null) return row.holdAccumulated;
  return row.holdAccumulated + Math.max(0, at - row.holdStartedAt);
}

/** Rebuilds a card's rows from what this run already saved, so ticks survive leaving and resuming. */
/** One more set, starting from the numbers of the set before it. It wasn't in the plan, so it has no planned numbers. */
function extraSet(previous: SetDraft): SetDraft {
  return {
    ...previous,
    ...emptyHold,
    ...freshDetail,
    weight: previous.weight,
    reps: previous.reps,
    seconds: previous.seconds,
    ticked: false,
    skipped: false,
    touched: false,
    bump: null,
    planFrozen: true,
    schemeId: previous.schemeId,
    restPlannedSeconds: previous.restPlannedSeconds,
  };
}

function restoreRows(rows: SetDraft[], saved: HistorySet[] | undefined): SetDraft[] {
  const seed = rows[0];
  if (!seed) return rows;
  const done = (saved ?? []).filter(set => set.status !== 'skipped').sort((left, right) => left.setIndex - right.setIndex);
  if (!done.length) return rows;
  const logged = done.map(set => ({
    ...seed,
    ticked: true,
    skipped: false,
    touched: true,
    weight: set.weightKg == null ? seed.weight : formatKg(set.weightKg),
    reps: set.reps == null ? '' : String(set.reps),
    seconds: set.durationSeconds == null ? '' : String(set.durationSeconds),
    restPlannedSeconds: set.restPlannedSeconds ?? seed.restPlannedSeconds,
    planFrozen: true,
  }));
  return [...logged, extraSet(logged[logged.length - 1])];
}

/** Marks the logged row and adds one next row copied from it. */
function loggedRows(rows: SetDraft[], setIndex: number, patch: Partial<SetDraft>, at: number): SetDraft[] {
  const updated = rows.map((row, index) =>
    index === setIndex
      ? {
          ...openSet(row, at),
          ...patch,
          ticked: true,
          skipped: false,
          holdRunning: false,
          holdStartedAt: null,
          completedAt: row.completedAt ?? at,
        }
      : row,
  );
  if (updated.some(row => !row.ticked && !row.skipped)) return updated;
  const done = updated[setIndex];
  return done ? [...updated, extraSet(done)] : updated;
}


function parseLogged(row: SetDraft, load: LoadType, item: GymFlowItem) {
  if (isHoldTarget(item)) {
    const durationSeconds = Number(row.seconds);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600) return null;
    return { weightKg: null as number | null, reps: null as number | null, durationSeconds };
  }
  const reps = Number(row.reps);
  if (!Number.isInteger(reps) || reps < 1 || reps > 200) return null;
  if (load === 'bodyweight') return { weightKg: null as number | null, reps, durationSeconds: null as number | null };
  const text = row.weight.trim();
  if (!text && load === 'assisted') return { weightKg: null as number | null, reps, durationSeconds: null as number | null };
  const weightKg = Number(text);
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) return null;
  if (Math.abs(weightKg * 4 - Math.round(weightKg * 4)) > 1e-6) return null;
  return { weightKg, reps, durationSeconds: null as number | null };
}

function previewCards(data: MobilePayload, kind: 'flow' | 'personal', id: string, customflow?: Customflow, priorities: readonly MuscleArea[] = []): PreviewCard[] {
  if (kind === 'personal') {
    const flow = data.profile.personalFlows?.find(item => item.id === id);
    return (flow?.cards ?? []).map(reference => ({
      ...reference,
      card: findFlowCard(data.flows, reference.sourceFlowId, reference.cardId),
    }));
  }
  const flow = data.flows.find(item => item.id === id);
  if (!flow) return [];
  const gym = gymFlowById(flow.id);
  // Same exercises the server starts the run with, including a swap.
  if (gym) {
    return memberGymItems(gym.items, priorities, flowLevelOf(gym.level), customflow).map(item => {
      const card = gymHabitCard(gym, item);
      return { cardId: card.id, sourceFlowId: flow.id, title: card.title, card };
    });
  }
  return applyCustomflow(resolveVisualFlow(flow, data.flows).cards, customflow, card => gymExerciseId(card.id) ?? card.id).map(card => ({
    cardId: card.id,
    sourceFlowId: flow.id,
    title: card.title,
    card,
  }));
}

function FlowStartScreen({
  id,
  cards,
  level,
  onLevel,
  metrics,
  gym,
  sessions,
  inProgress,
  loading,
  error,
  busy,
  safeBottomInset,
  onRetry,
  onHistory,
  onStart,
}: {
  id: string;
  cards: PreviewCard[];
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  metrics: UserMetrics | null | undefined;
  gym: ReturnType<typeof gymFlowById>;
  sessions: Record<string, ExerciseSession>;
  inProgress: boolean;
  loading: boolean;
  error: string;
  busy: boolean;
  safeBottomInset: number;
  onRetry: () => void;
  onHistory: () => void;
  onStart: () => void;
}) {
  const customflow = useCustomflow('qram-flow', gym ? id : undefined);
  const priorities = usePersonalMetrics()['gym.priorities']?.areas ?? [];
  const priorityIds = new Set(gym ? prioritySourceIds(gym.items, priorities, flowLevelOf(gym.level)) : []);
  const { colors: C } = useTheme();
  const estimates = cards.map(card => benchmarkFor(id, card.cardId, level, card.card));
  const rest = restFor(id, level);
  const estimateSeconds =
    estimates.reduce((sum, item) => sum + item.seconds, 0) + rest * Math.max(0, cards.length - 1);
  return (
    <View style={{ flex: 1, marginHorizontal: -space.lg, marginBottom: -safeBottomInset }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: 130 + safeBottomInset }}
      >
        {gym ? null : (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {levels.map(option => {
              const selected = option === level;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  accessibilityState={{ selected }}
                  onPress={() => onLevel(option)}
                  style={{
                    flex: 1,
                    minHeight: hit,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? C.lime : C.card,
                    borderWidth: stroke.line,
                    borderColor: selected ? C.lime : C.line,
                  }}
                >
                  <Text style={{ color: selected ? C.onAccent : C.text, fontWeight: '600' }}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {gym ? null : <Text variant="subhead" style={{ color: C.muted }}>About {clock(estimateSeconds)} with rests</Text>}
        {gym
          ? memberGymItems(gym.items, priorities, flowLevelOf(gym.level), customflow).map(item => {
              const move = exercise(item.exerciseId);
              const lastWeight = sessions[item.exerciseId]?.sets.at(-1)?.weightKg;
              const origin = swappedFrom(customflow?.changes, item.exerciseId);
              const sourceId = origin ?? item.exerciseId;
              const priority = priorityIds.has(sourceId);
              return (
                <View key={item.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                  <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
                    <ExerciseVisual exerciseId={move?.id} cover />
                  </View>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text variant="callout" style={{ color: C.text }}>{move?.name ?? item.exerciseId}</Text>
                    <Text variant="footnote" style={{ color: C.muted }}>
                      {gymTargetLabel(item)}
                      {lastWeight != null ? ` · Last ${formatKg(lastWeight)} kg` : ''}
                    </Text>
                    {priority ? <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>Your priority</Text> : null}
                    {origin ? <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>Your swap</Text> : null}
                  </View>
                </View>
              );
            })
          : null}
        {gym
          ? null
          : cards.map((card, index) => {
              const benchmark = estimates[index];
              const load = benchmark && metrics ? targetLoadKg(benchmark, metrics) : null;
              const detail = [
                benchmark ? clock(benchmark.seconds) : '',
                benchmark?.reps ? `${benchmark.reps} reps` : '',
                load != null ? `${load} kg` : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={card.cardId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                  <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
                    {card.card ? <FlowIllustration flow={card.card} cover /> : null}
                  </View>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text variant="callout" style={{ color: C.text }}>{card.title}</Text>
                    <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text>
                  </View>
                </View>
              );
            })}
      </ScrollView>
      <GlassBar bottom={safeBottomInset + space.sm}>
        {error ? (
          <View style={{ flex: 1 }}>
            <Button title="Try again" onPress={onRetry} />
          </View>
        ) : loading ? (
          <View style={{ flex: 1 }}>
            <Button title="Start" busy onPress={onStart} />
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={inProgress ? 'History, one flow in progress' : 'History'}
              onPress={onHistory}
              style={({ pressed }) => ({
                minHeight: hit,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              {inProgress ? (
                <View style={{ width: space.sm, height: space.sm, borderRadius: radius.pill, backgroundColor: C.lime }} />
              ) : null}
              <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>
                History
              </Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Button title="Start" disabled={busy || cards.length === 0} onPress={onStart} />
            </View>
          </>
        )}
      </GlassBar>
    </View>
  );
}

export function FlowRun({
  kind,
  id,
  title,
  data,
  nextTitle,
  onNext,
  onTry,
  onClose,
  resumeOnOpen = false,
  version,
}: {
  kind: 'flow' | 'personal';
  id: string;
  title: string;
  data: MobilePayload;
  nextTitle?: string;
  onNext?: () => void;
  onTry?: (flowId: string, title: string) => void;
  onClose: () => void;
  onPosted?: () => void;
  /** Opened from a workout in progress: carry straight on with it. */
  resumeOnOpen?: boolean;
  /** The published version a community flow keeps running. */
  version?: number;
}) {
  const { colors: C } = useTheme();
  const { completed } = useFlowHabits(data.user.id);
  const customflow = useCustomflow('qram-flow', kind === 'flow' ? id : undefined);
  const personal = usePersonalMetrics();
  const priorities = personal['gym.priorities']?.areas;
  // A tap updates this at once, so two taps in a row build on each other before the saved metric reloads.
  const [tappedFactor, setTappedFactor] = useState<number | null>(null);
  const restFactor = tappedFactor ?? personal['gym.restFactor']?.factor;
  const today = localDate(new Date());
  const todaySeries = useFlowSeries(today, today);
  const community = useCommunityFlow(id.startsWith('community-') ? id : null);
  const cards = useMemo(() => {
    if (!id.startsWith('community-')) return previewCards(data, kind, id, customflow, priorities ?? []);
    const pinned = version != null ? community.value?.versions.find(row => row.version === version) : undefined;
    const source = pinned ?? community.value?.flow;
    return (source?.cards ?? []).map(reference => ({
      ...reference,
      card: findFlowCard(data.flows, reference.sourceFlowId, reference.cardId),
    }));
  }, [community.value, customflow, data, id, kind, priorities, version]);
  const [metrics, setMetrics] = useState<UserMetrics | null | undefined>(undefined);
  const [existing, setExisting] = useState<FlowRunRecord | null | undefined>(undefined);
  const [live, setLive] = useState<FlowRunRecord | null>(null);
  const [state, setState] = useState<FlowRunState | null>(null);
  const { member } = useFlowMember();
  // A level chosen on this flow stays. Otherwise the picker follows the member's level.
  const [pickedLevel, setPickedLevel] = usePaneState<RunLevel | null>(`runLevel:${kind}:${id}`, null, 'account');
  const level = pickedLevel ?? runLevelFor(member.level);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const safeBottomInset = useSafeAreaInsets().bottom;
  const [now, setNow] = useState(() => Date.now());
  const suppressBuzz = useRef(false);
  const seen = useRef<string | null>(null);
  const saved = useRef<string | null>(null);
  const seenPhase = useRef<FlowRunState['phase'] | null>(null);
  const gym = gymFlowById(id);
  const priorityIds = new Set(gym ? prioritySourceIds(gym.items, priorities ?? [], flowLevelOf(gym.level)) : []);
  const appliedItems = useMemo(
    () => (gym ? memberGymItems(gym.items, priorities ?? [], flowLevelOf(gym.level), customflow) : []),
    [gym, customflow, priorities],
  );
  const appliedKey = appliedItems.map(item => item.exerciseId).join('|');
  const cardKey = state?.cards.map(card => card.cardId).join('|') ?? '';
  // A run keeps the exercises on its cards. A swap saved halfway through still resolves the card
  // that already started, and the next start uses the replacement.
  const plannedItem = useCallback(
    (exerciseId: string | null | undefined) => {
      if (!exerciseId) return undefined;
      return appliedItems.find(item => item.exerciseId === exerciseId) ?? gym?.items.find(item => item.exerciseId === exerciseId);
    },
    [appliedItems, gym],
  );
  const setOrder = useMemo(() => {
    if (!gym) return [];
    const source = state?.cards.length
      ? state.cards.flatMap(card => {
          const exerciseId = gymExerciseId(card.cardId);
          const item = exerciseId ? plannedItem(exerciseId) : undefined;
          return item ? [item] : [];
        })
      : appliedItems;
    return gymSetOrder(
      source.map(item => ({
        exerciseId: item.exerciseId,
        sets: item.sets,
        restSeconds: item.restSeconds,
        superset: item.superset,
      })),
    );
    // `state` is read only for its card ids (`cardKey`). The clock replaces `state` every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym, appliedItems, cardKey]);
  const [sessions, setSessions] = useState<Record<string, ExerciseSession>>({});
  const [sessionKey, setSessionKey] = useState('');
  const sessionsReady = !gym || sessionKey === appliedKey;
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});
  const [runSaved, setRunSaved] = useState<{ runId: string; sets: Record<string, HistorySet[]> } | null>(null);
  const savedSets = live && runSaved?.runId === live.id ? runSaved.sets : undefined;
  const openedAt = useRef<Record<string, number>>({});
  const schemesReady = useTrainingSchemes();
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restReason, setRestReason] = useState('');
  const [restCardId, setRestCardId] = useState<string | null>(null);
  const pendingLogs = useRef<PendingLog[]>([]);
  const restBuzzed = useRef<number | null>(null);

  useEffect(() => {
    let cancel = false;
    setError('');
    void flowRunHome()
      .then(home => {
        if (cancel) return;
        setMetrics(home.metrics);
        setExisting(home.running.find(run => run.kind === kind && run.flowId === id) ?? null);
      })
      .catch(reason => {
        if (!cancel) setError(reason instanceof Error ? reason.message : 'Try again.');
      });
    return () => {
      cancel = true;
    };
  }, [kind, id, reloadKey]);

  // Strength numbers fill first-time weights, so fetch them before the first set is drafted.
  useEffect(() => {
    void loadStrength();
  }, []);

  useEffect(() => {
    if (!gym) return;
    let cancel = false;
    const ids = appliedItems.map(item => item.exerciseId);
    const key = ids.join('|');
    void exerciseSessions(ids)
      .then(result => {
        if (cancel) return;
        const next: Record<string, ExerciseSession> = {};
        for (const session of result.sessions) next[session.exerciseId] = session;
        setSessions(next);
        setSessionKey(key);
      })
      .catch(() => {
        if (!cancel) setSessionKey(key);
      });
    return () => {
      cancel = true;
    };
  }, [gym, appliedItems]);

  useEffect(() => {
    if (!gym || !sessionsReady || !schemesReady || !state || state.phase !== 'card') return;
    const card = state.cards[state.index];
    if (!card?.manual || drafts[card.cardId]) return;
    // Wait for this run's saved sets when resuming, so finished sets come back ticked.
    if (live && savedSets === undefined) return;
    const exerciseId = gymExerciseId(card.cardId);
    const entry = exerciseId ? plannedItem(exerciseId) : undefined;
    const move = exerciseId ? exercise(exerciseId) : undefined;
    if (!exerciseId || !entry || !move) return;
    setDrafts(previous =>
      previous[card.cardId]
        ? previous
        : {
            ...previous,
            [card.cardId]: restoreRows(
              draftRows(move, entry, sessions[exerciseId]?.sets, openedAt.current[card.cardId]),
              savedSets?.[exerciseId],
            ),
          },
    );
  }, [gym, sessionsReady, schemesReady, state, drafts, sessions, id, live, savedSets, plannedItem]);

  // Sets this run already saved, read once when the run is picked up again.
  useEffect(() => {
    if (!live || savedSets !== undefined) return;
    let cancel = false;
    void flowRunHistory(kind, id)
      .then(result => {
        if (cancel) return;
        const run = result.runs.find(item => item.id === live.id);
        const next: Record<string, HistorySet[]> = {};
        for (const card of run?.cards ?? []) if (card.exerciseId) next[card.exerciseId] = card.sets;
        setRunSaved({ runId: live.id, sets: next });
      })
      .catch(() => {
        if (!cancel) setRunSaved({ runId: live.id, sets: {} });
      });
    return () => {
      cancel = true;
    };
  // `savedSets` is derived from `live` and `runSaved`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.id, runSaved, kind, id]);

  useEffect(() => {
    if (!state || state.pausedAt != null || state.phase !== 'card') return;
    const card = state.cards[state.index];
    if (!card?.manual) return;
    const exerciseId = gymExerciseId(card.cardId);
    const entry = exerciseId ? plannedItem(exerciseId) : undefined;
    if (!entry) return;
    const target = resolveTarget(entry);
    if (target.kind !== 'hold') return;
    const rows = drafts[card.cardId];
    const index = rows?.findIndex(row => row.holdRunning && row.holdStartedAt != null) ?? -1;
    if (!rows || index < 0) return;
    const seconds = Math.floor(holdElapsedMs(rows[index], now) / 1000);
    const row = rows[index];
    if (seconds >= target.minSeconds && !row.buzzedMin) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setDrafts(previous => {
        const currentRows = previous[card.cardId];
        if (!currentRows) return previous;
        return {
          ...previous,
          [card.cardId]: currentRows.map((item, rowIndex) => (rowIndex === index ? { ...item, buzzedMin: true } : item)),
        };
      });
    }
    if (seconds >= target.maxSeconds && !row.buzzedMax) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setDrafts(previous => {
        const currentRows = previous[card.cardId];
        if (!currentRows) return previous;
        return {
          ...previous,
          [card.cardId]: currentRows.map((item, rowIndex) => (rowIndex === index ? { ...item, buzzedMax: true } : item)),
        };
      });
    }
  }, [drafts, now, plannedItem, state]);

  useEffect(() => {
    if (restUntil == null || state?.pausedAt != null || now < restUntil) return;
    if (restBuzzed.current !== restUntil) {
      restBuzzed.current = restUntil;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void playRestEnd();
    }
    setRestUntil(null);
    setRestReason('');
  }, [now, restUntil, state?.pausedAt]);

  useEffect(() => {
    if (!state || state.phase !== 'rest') return;
    apply(current => (current.phase === 'rest' ? endRest(current, Date.now()) : current));
  }, [state]);

  useEffect(() => {
    if (state?.phase !== 'finished' || !live) return;
    let cancel = false;
    const snapshot = state;
    const queued = pendingLogs.current.splice(0);
    void (async () => {
      for (const body of queued) {
        try {
          await logExerciseSets(body);
        } catch {
          pendingLogs.current.push(body);
        }
      }
      if (!gym) return;
      try {
        await saveFlowRun(live.id, snapshot);
      } catch {
        // The last saved cards still answer.
      }
      if (cancel) return;
    })();
    return () => {
      cancel = true;
    };
    // `live` and `state` are the run at the moment it finishes. A finished run does not tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, id, gym]);

  useEffect(() => {
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      setState(current => (current ? tick(current, at) : current));
    }, 1000);
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      const at = Date.now();
      setNow(at);
      setState(current => (current ? tick(current, at) : current));
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const awake = Boolean(state && (state.phase === 'card' || state.phase === 'rest') && !state.pausedAt);
    if (!awake) {
      void deactivateKeepAwake('flow-run').catch(() => undefined);
      return;
    }
    void activateKeepAwakeAsync('flow-run').catch(() => undefined);
    return () => {
      void deactivateKeepAwake('flow-run').catch(() => undefined);
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const signature = `${state.phase}:${state.index}:${state.cards.map(card => card.status).join('')}`;
    const prior = seen.current;
    seen.current = signature;
    if (!prior || prior === signature) return;
    if (suppressBuzz.current) {
      suppressBuzz.current = false;
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    if (seenPhase.current && seenPhase.current !== 'finished' && state.phase === 'finished') {
      completed(id);
      // The sets just logged belong on the Body flow map, and this flow is done on the routine.
      void reloadBodyFlow();
      void reloadFlowSeries();
    }
    seenPhase.current = state.phase;
  }, [state, id, completed]);

  useEffect(() => {
    if (!live || !state) return;
    const signature = JSON.stringify(state);
    if (saved.current === null) {
      saved.current = signature;
      return;
    }
    if (saved.current === signature) return;
    saved.current = signature;
    void saveFlowRun(live.id, state).catch(() => undefined);
  }, [live, state]);

  function apply(recipe: (current: FlowRunState) => FlowRunState) {
    suppressBuzz.current = true;
    setState(current => (current ? recipe(current) : current));
  }

  /** `allowEmpty`: an undo can leave no sets, which clears this exercise for the run. */
  function loggedSets(cardId: string, rows: SetDraft[], allowEmpty = false) {
    const exerciseId = gymExerciseId(cardId);
    const move = exerciseId ? exercise(exerciseId) : undefined;
    const entry = exerciseId ? plannedItem(exerciseId) : undefined;
    if (!exerciseId || !move || !entry) return null;
    let previous: number | null = null;
    const sets = rows.flatMap((row, index) => {
      if (!row.ticked && !row.skipped) return [];
      const parsed = row.skipped ? null : parseLogged(row, move.load, entry);
      if (!row.skipped && !parsed) return [];
      const detail = buildSetDetail({
        status: row.skipped ? 'skipped' : 'done',
        plannedWeightKg: numberOrNull(row.plannedWeight),
        plannedReps: numberOrNull(row.plannedReps) == null ? null : Math.round(Number(row.plannedReps)),
        plannedSeconds: numberOrNull(row.plannedSeconds) == null ? null : Math.round(Number(row.plannedSeconds)),
        schemeId: row.schemeId,
        openedAt: row.startedAt,
        completedAt: row.completedAt,
        previousCompletedAt: previous,
        restPlannedSeconds: row.restPlannedSeconds,
        durationSeconds: parsed?.durationSeconds ?? null,
        clockRan: row.clockRan,
        typedSeconds: row.typedSeconds,
        edited: row.edited,
      });
      if (row.completedAt != null) previous = row.completedAt;
      return [
        {
          setIndex: index + 1,
          weightKg: row.skipped ? null : (parsed?.weightKg ?? null),
          reps: row.skipped ? null : (parsed?.reps ?? null),
          durationSeconds: row.skipped ? null : (parsed?.durationSeconds ?? null),
          detail,
        },
      ];
    });
    return sets.length || (allowEmpty && live?.id) ? { runId: live?.id, exerciseId, sets } : null;
  }

  function openItems(): GymSetInput[] {
    return (state?.cards ?? []).flatMap(card => {
      const exerciseId = gymExerciseId(card.cardId);
      const item = exerciseId ? plannedItem(exerciseId) : undefined;
      if (!exerciseId || !item) return [];
      return [{ exerciseId, sets: item.sets, restSeconds: item.restSeconds, superset: item.superset }];
    });
  }

  function hintSet(row: SetDraft): RestHintSet {
    return { weightKg: numberOrNull(row.weight), reps: numberOrNull(row.reps), durationSeconds: numberOrNull(row.seconds) };
  }

  /** Puts the rest hint on the next row and, for a superset, moves to the partner at once. */
  function afterSet(exerciseId: string, cardId: string, rows: SetDraft[], setIndex: number, at: number) {
    const entry = plannedItem(exerciseId);
    const move = exercise(exerciseId);
    const loggedRow = rows[setIndex];
    if (!entry || !move || !loggedRow) return rows;
    const target = resolveTarget(entry);
    const range =
      target.kind === 'hold'
        ? { min: target.minSeconds, max: target.maxSeconds }
        : target.kind === 'reps'
          ? { min: target.min, max: target.max }
          : null;
    const earlier = rows.slice(0, setIndex).filter(row => row.ticked).map(hintSet);
    const logged = hintSet(loggedRow);
    const history = (sessions[exerciseId]?.sets ?? []).map(set => ({
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
    }));
    const estimate = estimateStart(move, entry);
    const hint = restHint({
      exerciseId,
      set: logged,
      earlierSets: earlier,
      range,
      best: bestAtLoad(exerciseId, [...history, ...earlier, logged], logged.weightKg),
      estimate: estimate ? { weightKg: estimate.weightKg } : null,
      memberFactor: restFactor,
    });
    const counts: Record<string, number> = {};
    for (const card of state?.cards ?? []) {
      const key = gymExerciseId(card.cardId);
      if (!key) continue;
      const list = drafts[card.cardId];
      counts[key] = list
        ? list.filter(row => row.ticked).length
        : (savedSets?.[key] ?? []).filter(set => set.status !== 'skipped').length;
    }
    counts[exerciseId] = rows.filter(row => row.ticked).length;
    const closed = (state?.cards ?? []).flatMap(card => {
      if (card.status === 'pending') return [];
      const key = gymExerciseId(card.cardId);
      return key ? [key] : [];
    });
    const step = nextAfterSet(openItems(), counts, exerciseId, closed);
    const rested = rows.map((row, index) => (index === setIndex ? { ...row, restPlannedSeconds: step.rest ? hint.seconds : 0 } : row));
    if (step.rest) {
      setRestUntil(at + hint.seconds * 1000);
      setRestReason(hint.reason);
      const destination = (state?.cards ?? []).find(card => gymExerciseId(card.cardId) === step.exerciseId);
      setRestCardId(destination?.cardId ?? cardId);
    } else {
      setRestUntil(null);
      setRestReason('');
      setRestCardId(null);
    }
    if (step.exerciseId !== exerciseId) {
      const index = (state?.cards ?? []).findIndex(card => gymExerciseId(card.cardId) === step.exerciseId);
      if (index >= 0) apply(current => showCard(current, index, at));
    }
    return rested;
  }

  function onExerciseReady(cardId: string) {
    const at = Date.now();
    openedAt.current[cardId] = at;
    apply(currentState => beginCardClock(currentState, at));
    setDrafts(previous => {
      const rows = previous[cardId];
      if (!rows) return previous;
      const index = rows.findIndex(row => !row.ticked && !row.skipped);
      if (index < 0) return previous;
      return { ...previous, [cardId]: rows.map((row, rowIndex) => (rowIndex === index ? openSet(row, at) : row)) };
    });
  }

  function patchDraft(cardId: string, setIndex: number, patch: Partial<SetDraft>) {
    const rows = (drafts[cardId] ?? []).map((row, index) =>
      index === setIndex ? { ...row, ...patch, touched: true, edited: row.ticked ? true : row.edited } : row,
    );
    setDrafts(previous => ({ ...previous, [cardId]: rows }));
    if (rows[setIndex]?.ticked) void persistCard(cardId, rows);
  }

  async function persistCard(cardId: string, rows: SetDraft[], allowEmpty = false) {
    const body = loggedSets(cardId, rows, allowEmpty);
    if (!body) return;
    try {
      await logExerciseSets(body);
    } catch {
      pendingLogs.current.push(body);
    }
  }

  async function leaveExercise(cardId: string, kind: 'next' | 'skip') {
    if (kind === 'next') await persistCard(cardId, drafts[cardId] ?? []);
    setRestUntil(null);
    setRestReason('');
    setRestCardId(null);
    const at = Date.now();
    apply(current => {
      const marked =
        kind === 'skip'
          ? current.phase === 'card' && current.cards[current.index]?.status === 'pending'
            ? {
                ...current,
                cards: current.cards.map((card, index) =>
                  index === current.index ? { ...card, status: 'skipped' as const, seconds: null, closedAt: at } : card,
                ),
              }
            : current
          : completeCard(current, current.index, at);
      const pending = marked.cards.findIndex(card => card.status === 'pending');
      if (pending < 0) return finishRunIfDone(marked, at);
      return showCard(marked, pending, at);
    });
  }

  function nudgeRest(tap: RestFactorTap) {
    const next = nextRestFactor(restFactor, tap);
    setTappedFactor(next);
    void savePersonalMetric('gym.restFactor', { factor: next }).catch(() => setError('Could not save that. Try again.'));
    setRestUntil(current => (current == null ? current : current + (tap === 'harder' ? 30_000 : -30_000)));
  }

  async function begin(replace: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (replace && existing) await finishFlowRun(existing.id, existing.state);
      const result = await startFlowRun({ kind, id, level, ...(version != null ? { version } : {}) });
      saved.current = null;
      seen.current = null;
      setHistoryOpen(false);
      setExisting(null);
      setLive(result.run);
      setState(tick(result.run.state, Date.now()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  // Shown as a small square elsewhere in the app while this run is in progress and its screen is closed.
  useEffect(() => {
    setRunScreenOpen(true);
    return () => setRunScreenOpen(false);
  }, []);
  useEffect(() => {
    if (!live || !state) return;
    if (state.phase === 'finished') setActiveRun(null);
    else setActiveRun({ kind, id, title, state });
  }, [live, state, kind, id, title]);

  const autoResumed = useRef(false);
  useEffect(() => {
    if (!resumeOnOpen || autoResumed.current || !existing || state) return;
    autoResumed.current = true;
    resume();
    // `resume` reads the run that just loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOnOpen, existing, state]);

  function resume() {
    if (!existing) return;
    saved.current = null;
    seen.current = null;
    setLive(existing);
    setState(tick(existing.state, Date.now()));
  }

  async function settle(advance: 'close' | 'next' | 'try', suggestion?: { flowId: string; title: string }) {
    if (busy) return;
    setBusy(true);
    try {
      if (live && state) await finishFlowRun(live.id, state);
    } catch {
      // Leaving still keeps the last saved cards.
    }
    if (advance === 'next') onNext?.();
    else if (advance === 'try' && suggestion) onTry?.(suggestion.flowId, suggestion.title);
    else onClose();
  }

  const activeLevel = live?.level ?? level;
  const estimates = cards.map(card => benchmarkFor(id, card.cardId, activeLevel, card.card));
  const running = state && live ? state : null;
  const current = running?.cards[running.index];
  const manualExerciseId = current?.manual ? gymExerciseId(current.cardId) : null;
  const manualMove = manualExerciseId ? exercise(manualExerciseId) : undefined;
  const manualItem = plannedItem(manualExerciseId);
  const manualLast = manualExerciseId ? sessions[manualExerciseId] : undefined;
  const manualEstimate = manualMove && manualItem && !manualLast ? estimateStart(manualMove, manualItem) : null;
  const manualPlan = manualMove && manualItem
    ? planWithScheme(manualMove, manualItem, schemeById(manualItem.scheme), manualLast?.sets ?? null, manualEstimate?.weightKg ?? null)
    : null;
  const manualNote = !current?.manual || !manualMove || !manualItem
    ? null
    : !sessionsReady
      ? null
      : manualMove.load === 'bodyweight'
        ? effortNote(manualMove, manualItem, manualLast?.sets ?? null)
        : !manualLast
          ? manualEstimate
            ? estimateLine(manualEstimate)
            : noEstimateLine()
          : manualPlan?.raised && manualPlan.sets[0]?.weightKg != null && manualLast.sets[0]?.weightKg != null
            ? `Last time ${formatKg(manualLast.sets[0].weightKg)} kg × ${manualItem.repsMax}. Try ${formatKg(manualPlan.sets[0].weightKg)} kg.`
            : null;
  const swapSource = manualExerciseId ? (swappedFrom(customflow?.changes, manualExerciseId) ?? manualExerciseId) : null;
  const swapOrigin =
    swapSource && (gym?.items.some(item => item.exerciseId === swapSource) || priorityIds.has(swapSource)) ? swapSource : null;
  const priorityExercise = Boolean(swapSource && priorityIds.has(swapSource));
  async function chooseSwap(exerciseId: string) {
    if (!swapFor || !gym) return;
    const card = state?.cards[state.index];
    const rows = card ? (drafts[card.cardId] ?? []) : [];
    const rewrite = Boolean(card && rows.every(row => !row.ticked && !row.skipped));
    if (rewrite && card) {
      const nextId = gymCardId(id, exerciseId);
      const name = exercise(exerciseId)?.name ?? exerciseId;
      setDrafts(previous => {
        const copy = { ...previous };
        delete copy[card.cardId];
        return copy;
      });
      setState(currentState =>
        currentState
          ? {
              ...currentState,
              cards: currentState.cards.map((item, index) =>
                index === currentState.index ? { ...item, cardId: nextId, title: name } : item,
              ),
            }
          : currentState,
      );
    }
    try {
      await saveCustomflowSwap({ kind: 'qram-flow', id, version: null }, swapFor, exerciseId);
      setSwapFor(null);
    } catch (error) {
      if (rewrite && card) {
        setState(currentState =>
          currentState
            ? {
                ...currentState,
                cards: currentState.cards.map((item, index) =>
                  index === currentState.index ? { ...item, cardId: card.cardId, title: card.title } : item,
                ),
              }
            : currentState,
        );
      }
      throw error;
    }
  }
  const todayPicture = useMemo(
    () => (running?.phase === 'finished' ? workedToday(running.cards, drafts, today, focusLevelFor(member.level)) : null),
    [drafts, member.level, running, today],
  );
  const loggedLines = (running?.cards ?? []).flatMap(card => {
    const count = (drafts[card.cardId] ?? []).filter(row => row.ticked).length;
    if (!count) return [];
    return [`${card.title} · ${count} ${count === 1 ? 'set' : 'sets'}`];
  });
  const seriesNext = todaySeries.occurrences.find(item => item.date === today && item.status === 'open' && item.itemId !== id);
  const seriesTitle = !seriesNext
    ? null
    : seriesNext.itemKind === 'flow'
      ? (data.flows.find(flow => flow.id === seriesNext.itemId)?.title ?? gymFlowById(seriesNext.itemId)?.title ?? catalogFlows.find(flow => flow.id === seriesNext.itemId)?.title ?? null)
      : null;
  const nextToday = nextTitle
    ? { title: nextTitle, start: onNext ? () => void settle('next') : null }
    : seriesNext && seriesTitle && seriesNext.itemKind === 'flow' && onTry
      ? { title: seriesTitle, start: () => void settle('try', { flowId: seriesNext.itemId, title: seriesTitle }) }
      : seriesNext && seriesTitle
        ? { title: seriesTitle, start: null }
        : null;
  const showingHistory = historyOpen && !running && metrics !== null;
  const sheetTitle = showingHistory
    ? 'History'
    : !running
    ? metrics === null
      ? 'About you'
      : title
    : running.phase === 'finished'
      ? 'Done'
      : (current?.title ?? title);

  return (
    <>
    <Sheet
      title={sheetTitle}
      presentation="modal"
      fullScreen
      navigation="back"
      headerAction={running && running.phase !== 'finished' ? <SoundToggle /> : undefined}
      scrollable={!((running?.phase === 'card' && current?.manual && gym) || (!running && metrics !== null))}
      onClose={() => {
        if (showingHistory) {
          setHistoryOpen(false);
          return;
        }
        onClose();
      }}
    >
      {error ? (
        <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
      {(metrics === undefined || existing === undefined) && !gym ? (
        error ? (
          <Button
            variant="text"
            size="regular"
            title="Try again"
            accessibilityLabel="Try again"
            onPress={() => setReloadKey(value => value + 1)}
          />
        ) : (
          <Skeleton shape="line" />
        )
      ) : metrics === null ? (
        <AboutYouForm
          initial={null}
          onSaved={savedMetrics => {
            setMetrics(savedMetrics);
          }}
        />
      ) : !running ? (
        showingHistory ? (
          <FlowHistory kind={kind} id={id} bottom={safeBottomInset} onResume={existing ? resume : null} />
        ) : (
          <FlowStartScreen
            id={id}
            cards={cards}
            level={level}
            onLevel={setPickedLevel}
            metrics={metrics}
            gym={gym}
            sessions={sessions}
            inProgress={Boolean(existing)}
            loading={metrics === undefined || existing === undefined || (id.startsWith('community-') && community.loading)}
            error={error}
            busy={busy}
            safeBottomInset={safeBottomInset}
            onRetry={() => setReloadKey(value => value + 1)}
            onHistory={() => setHistoryOpen(true)}
            onStart={() => {
              if (existing) {
                Alert.alert('Start again?', 'Your unfinished run stays in History.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start', onPress: () => void begin(true) },
                ]);
                return;
              }
              void begin(false);
            }}
          />
        )
      ) : running.phase === 'card' && current?.manual && gym ? (
        <GymManualCard
          move={manualMove}
          name={manualMove?.name ?? current.title}
          exerciseId={manualMove?.id}
          planned={manualItem ? plannedLine(manualItem.sets) : ''}
          priority={priorityExercise}
          onSwap={
            swapOrigin && !(drafts[current.cardId] ?? []).some(row => row.ticked)
              ? () => setSwapFor(swapOrigin)
              : undefined
          }
          supersetLabel={manualExerciseId ? supersetCaption(setOrder, manualExerciseId) : null}
          mode={!manualMove || !manualItem ? 'weight' : isHoldTarget(manualItem) ? 'hold' : manualMove.load === 'bodyweight' ? 'reps' : 'weight'}
          note={manualNote}
          scheme={manualItem?.scheme ? schemeById(manualItem.scheme) : null}
          load={manualMove?.load ?? 'weight'}
          index={running.index}
          total={running.cards.length}
          elapsed={elapsedSeconds(running, now)}
          now={now}
          paused={running.pausedAt != null}
          rows={drafts[current.cardId]}
          restLeft={
            restCardId === current.cardId && restUntil != null
              ? Math.max(0, Math.ceil((restUntil - (running.pausedAt ?? now)) / 1000))
              : 0
          }
          restReason={restReason}
          onHarder={() => nudgeRest('harder')}
          onEasier={() => nudgeRest('easier')}
          onSkipRest={() => {
            setRestUntil(null);
            setRestReason('');
          }}
          onWeight={(setIndex, value) => patchDraft(current.cardId, setIndex, { weight: value, bump: null })}
          onReps={(setIndex, value) => patchDraft(current.cardId, setIndex, { reps: value })}
          onTickSet={setIndex => {
            const at = Date.now();
            const exerciseId = gymExerciseId(current.cardId);
            const move = exerciseId ? exercise(exerciseId) : undefined;
            const entry = exerciseId ? plannedItem(exerciseId) : undefined;
            const rows = drafts[current.cardId] ?? [];
            const row = rows[setIndex];
            if (!move || !entry || !row || row.ticked || row.skipped || row.holdRunning) return;
            const prepared = rows.map((item, index) => (index === setIndex ? openSet(item, at) : item));
            const logged = parseLogged(prepared[setIndex] ?? row, move.load, entry);
            if (!logged) {
              setError(isHoldTarget(entry) ? 'Add the time, then tick the set.' : move.load === 'bodyweight' || move.load === 'assisted' ? 'Add the reps, then tick the set.' : 'Add a weight, then tick the set.');
              return;
            }
            setError('');
            const next = loggedRows(prepared, setIndex, {
              weight: logged.weightKg == null ? '' : formatKg(logged.weightKg),
              reps: logged.reps == null ? '' : String(logged.reps),
              seconds: logged.durationSeconds == null ? '' : String(logged.durationSeconds),
              touched: true,
            }, at);
            const rested = afterSet(entry.exerciseId, current.cardId, next, setIndex, at);
            setDrafts(previous => ({ ...previous, [current.cardId]: rested }));
            void persistCard(current.cardId, rested);
          }}
          moving={manualItem ? canMoveOn((drafts[current.cardId] ?? []).filter(row => row.ticked).length, manualItem.sets) : true}
          onNext={() => void leaveExercise(current.cardId, 'next')}
          onSkip={() => void leaveExercise(current.cardId, 'skip')}
          onSeconds={(setIndex, value) => patchDraft(current.cardId, setIndex, { seconds: value, typedSeconds: true })}
          onStartHold={setIndex => {
            const at = Date.now();
            setDrafts(previous => {
              const rows = previous[current.cardId];
              if (!rows || rows.some(row => row.holdRunning)) return previous;
              return {
                ...previous,
                [current.cardId]: rows.map((row, rowIndex) =>
                  rowIndex === setIndex
                    ? { ...openSet(row, at), ...emptyHold, holdRunning: true, holdStartedAt: at, startedAt: at, clockRan: true }
                    : row,
                ),
              };
            });
          }}
          plannedSets={manualItem?.sets ?? 0}
          onUntickSet={setIndex => {
            const rows = drafts[current.cardId] ?? [];
            const row = rows[setIndex];
            if (!row?.ticked) return;
            // The set goes back to open with its numbers kept; the spare row added after it goes.
            const next = rows
              .slice(0, setIndex + 1)
              .map((item, index) => (index === setIndex ? { ...item, ticked: false, completedAt: null } : item));
            setRestUntil(null);
            setRestReason('');
            setRestCardId(null);
            setDrafts(previous => ({ ...previous, [current.cardId]: next }));
            void persistCard(current.cardId, next, true);
          }}
          onStopHold={setIndex => {
            const entry = manualItem;
            const row = drafts[current.cardId]?.[setIndex];
            if (!entry || !manualMove || !row || row.ticked || !row.holdRunning) return;
            const at = Date.now();
            const seconds = Math.min(3600, Math.max(1, Math.round(holdElapsedMs(row, at) / 1000)));
            const stamped = (drafts[current.cardId] ?? []).map((item, rowIndex) =>
              rowIndex === setIndex ? { ...item, clockRan: true, typedSeconds: false, seconds: String(seconds) } : item,
            );
            const next = loggedRows(stamped, setIndex, { seconds: String(seconds) }, at);
            const rested = afterSet(entry.exerciseId, current.cardId, next, setIndex, at);
            setDrafts(previous => ({ ...previous, [current.cardId]: rested }));
            void persistCard(current.cardId, rested);
          }}
          onPause={() => {
            const at = Date.now();
            const pausing = running.pausedAt == null;
            setDrafts(previous => {
              const next: Record<string, SetDraft[]> = {};
              for (const [cardId, rows] of Object.entries(previous)) {
                next[cardId] = rows.map(row => {
                  if (!row.holdRunning) return row;
                  if (pausing) {
                    return {
                      ...row,
                      holdAccumulated: holdElapsedMs(row, at),
                      holdStartedAt: null,
                    };
                  }
                  return { ...row, holdStartedAt: at };
                });
              }
              return next;
            });
            apply(currentState => {
              if (currentState.pausedAt != null) {
                if (restUntil != null) {
                  const left = Math.max(0, restUntil - currentState.pausedAt);
                  setRestUntil(Date.now() + left);
                }
                return resumeRun(currentState, Date.now());
              }
              return pauseRun(currentState, Date.now());
            });
          }}
          countdown={current.openedAt == null}
          onCountdownDone={() => onExerciseReady(current.cardId)}
        />
      ) : running.phase === 'card' && current ? (
        <CardStep
          card={cards.find(item => item.cardId === current.cardId)?.card}
          title={current.title}
          index={running.index}
          total={running.cards.length}
          remaining={remainingSeconds(running, now)}
          paused={running.pausedAt != null}
          reps={estimates[running.index]?.reps}
          load={
            estimates[running.index] && metrics ? targetLoadKg(estimates[running.index], metrics) : null
          }
          progress={running.cards.filter(card => card.status !== 'pending').length / running.cards.length}
          onDone={() => apply(currentState => doneCard(currentState, Date.now()))}
          onSkip={() => apply(currentState => skipCard(currentState, Date.now()))}
          onPause={() =>
            apply(currentState =>
              currentState.pausedAt != null ? resumeRun(currentState, Date.now()) : pauseRun(currentState, Date.now()),
            )
          }
        />
      ) : running.phase === 'rest' ? null : (
        <View style={{ gap: space.md }}>
          <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>Done</Text>
          {todayPicture ? (
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <Text variant="footnote" style={{ color: C.muted }}>Worked today</Text>
              <BodyPicture areas={todayPicture} width={240} showLegend />
            </View>
          ) : null}
          {loggedLines.map(line => (
            <Text key={line} variant="callout" style={{ color: C.text }}>{line}</Text>
          ))}
          {nextToday ? (
            <View style={{ gap: space.sm }}>
              <Text variant="footnote" style={{ color: C.muted }}>Next today</Text>
              <Text variant="callout" style={{ color: C.text }}>{nextToday.title}</Text>
            </View>
          ) : null}
          {nextToday?.start ? (
            <Button title="Start" accessibilityLabel="Start" disabled={busy} onPress={nextToday.start} />
          ) : (
            <Button title="Done" accessibilityLabel="Done" disabled={busy} onPress={() => void settle('close')} />
          )}
          {nextToday?.start ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              disabled={busy}
              onPress={() => void settle('close')}
              style={{ minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text variant="callout" style={{ color: C.muted, fontWeight: '600' }}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Sheet>
    {swapFor && gym ? (
      <SwapChooser
        sourceId={swapFor}
        avoidMainAreas={supersetPartnerAreas(
          gym.items.map(item => ({ key: item.exerciseId, exerciseId: item.exerciseId, superset: item.superset })),
          swapFor,
          item => {
            const replacement = customflow?.changes.swaps?.[item.key];
            return replacement && replacement !== item.exerciseId ? replacement : item.exerciseId;
          },
        )}
        library={data.flows}
        onClose={() => setSwapFor(null)}
        onChoose={chooseSwap}
        onView={flow => {
          setSwapFor(null);
          onTry?.(flow.id, flow.title);
        }}
      />
    ) : null}
    </>
  );
}

function CardStep({
  card,
  title,
  index,
  total,
  remaining,
  paused,
  reps,
  load,
  progress,
  onDone,
  onSkip,
  onPause,
}: {
  card?: HabitFlow;
  title: string;
  index: number;
  total: number;
  remaining: number;
  paused: boolean;
  reps?: number;
  load: number | null;
  progress: number;
  onDone: () => void;
  onSkip: () => void;
  onPause: () => void;
}) {
  const { colors: C } = useTheme();
  const target = [reps ? `${reps} reps` : '', load != null ? `${load} kg` : ''].filter(Boolean).join(' · ');
  return (
    <View style={{ gap: space.md, paddingTop: space.sm }}>
      <View style={{ height: 220, borderRadius: radius.card, overflow: 'hidden', backgroundColor: C.card }}>
        {card ? <FlowIllustration flow={card} cover /> : null}
      </View>
      <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
        {title}
      </Text>
      <Text variant="numeric" style={{ color: C.text, fontSize: 72, fontWeight: '700' }}>
        {clock(remaining)}
      </Text>
      <Text variant="callout" style={{ color: C.muted }}>
        Card {index + 1} of {total}
      </Text>
      {target ? <Text variant="callout" style={{ color: C.text }}>{target}</Text> : null}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: C.lime }} />
      </View>
      <Button title="Done" accessibilityLabel="Done" onPress={onDone} />
      <View style={{ flexDirection: 'row', gap: space.ms }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip"
          onPress={onSkip}
          style={{ flex: 1, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
          onPress={onPause}
          style={{ flex: 1, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GymManualCard({
  move,
  name,
  exerciseId,
  planned,
  priority,
  onSwap,
  supersetLabel,
  mode,
  note,
  scheme,
  load,
  index,
  total,
  elapsed,
  now,
  paused,
  rows,
  restLeft,
  restReason,
  onHarder,
  onEasier,
  onSkipRest,
  onWeight,
  onReps,
  onSeconds,
  onTickSet,
  onStartHold,
  onStopHold,
  onUntickSet,
  plannedSets,
  moving,
  onNext,
  onSkip,
  onPause,
  countdown,
  onCountdownDone,
}: {
  move?: GymExercise;
  name: string;
  exerciseId?: string;
  planned: string;
  priority?: boolean;
  onSwap?: () => void;
  supersetLabel?: string | null;
  mode: 'weight' | 'reps' | 'hold';
  note: string | null;
  scheme: SetScheme | null;
  load: LoadType;
  index: number;
  total: number;
  elapsed: number;
  now: number;
  paused: boolean;
  rows?: SetDraft[];
  restLeft: number;
  restReason: string;
  onHarder: () => void;
  onEasier: () => void;
  onSkipRest: () => void;
  onWeight: (setIndex: number, value: string) => void;
  onReps: (setIndex: number, value: string) => void;
  onSeconds: (setIndex: number, value: string) => void;
  onTickSet: (setIndex: number) => void;
  onStartHold: (setIndex: number) => void;
  onStopHold: (setIndex: number) => void;
  /** Undo the most recent tick. */
  onUntickSet: (setIndex: number) => void;
  /** How many sets the flow plans, for "Set 2 of 3". */
  plannedSets: number;
  moving: boolean;
  onNext: () => void;
  onSkip: () => void;
  onPause: () => void;
  countdown: boolean;
  onCountdownDone: () => void;
}) {
  const { colors: C } = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);
  const [editor, setEditor] = useState<{ setIndex: number; field: 'weight' | 'reps' | 'seconds'; typing: boolean } | null>(null);
  useEffect(() => {
    setEditor(null);
  }, [exerciseId]);
  const list = rows ?? [];
  const openIndex = list.findIndex(row => !row.ticked && !row.skipped);
  const runningHold = list.find(row => row.holdRunning) ?? null;
  // The current set has its wheel open without a tap; tapping another set moves it there.
  const active =
    editor ??
    (openIndex >= 0 && !runningHold
      ? { setIndex: openIndex, field: mode === 'hold' ? ('seconds' as const) : ('reps' as const), typing: false }
      : null);
  const highlighted = active?.setIndex ?? openIndex;
  const anyTicked = list.some(row => row.ticked);
  const lastTicked = list.reduce((found, row, rowIndex) => (row.ticked ? rowIndex : found), -1);
  const setCount = Math.max(1, plannedSets);
  // A tick moves the next set's tick under the same finger. A second tap this soon is a double tap, not a set.
  const lastTap = useRef(0);
  const tapTooSoon = () => {
    const at = Date.now();
    if (at - lastTap.current < 900) return true;
    lastTap.current = at;
    return false;
  };
  // Rows are added one at a time, so the plan is done once that many sets are logged or skipped.
  const dealtWith = list.filter(row => row.ticked || row.skipped).length;
  const allDone = list.length > 0 && (openIndex < 0 || (plannedSets > 0 && dealtWith >= plannedSets));
  const safeBottom = useSafeAreaInsets().bottom;
  // The footer floats over the list; the list leaves exactly its height free at the end.
  const [footerHeight, setFooterHeight] = useState(0);
  const flowColumns = (row: SetDraft, setIndex: number): NumberWheelProps[] => {
    if (mode === 'hold') return durationColumns(row.seconds, value => onSeconds(setIndex, value), 'Time');
    const columns: NumberWheelProps[] = [];
    if (mode !== 'reps' && load !== 'bodyweight') columns.push(weightColumn(move?.equipment, row.weight, value => onWeight(setIndex, value), 'Weight'));
    columns.push(repsColumn(row.reps, value => onReps(setIndex, value), 'Reps'));
    return columns;
  };
  const showNumber = (setIndex: number, field: 'weight' | 'reps' | 'seconds', value: string, label: string, big: boolean) => {
    const typing = editor?.setIndex === setIndex && editor.field === field && editor.typing;
    if (typing) {
      return (
        <WheelEntry
          accessibilityLabel={label}
          value={value}
          onChangeText={next => {
            if (field === 'weight') onWeight(setIndex, next);
            else if (field === 'reps') onReps(setIndex, next.replace(/[^0-9]/g, ''));
            else onSeconds(setIndex, next.replace(/[^0-9]/g, ''));
          }}
          onPress={() => setEditor({ setIndex, field, typing: false })}
          onTypingEnd={() => setEditor(current => (current?.typing ? null : current))}
          focused
          typing
          keyboardType={field === 'weight' ? 'decimal-pad' : 'number-pad'}
          placeholder={field === 'weight' ? 'kg' : field === 'reps' ? 'reps' : 'sec'}
          placeholderTextColor={C.muted}
          style={{ minWidth: 72, minHeight: hit, color: C.text, fontSize: big ? 28 : 18, fontWeight: '600', paddingHorizontal: space.xs }}
        />
      );
    }
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setEditor({ setIndex, field, typing: false })}
        style={{ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.xs }}
      >
        <Text variant="numeric" style={{ color: big ? C.text : C.muted, fontSize: big ? 32 : 18, fontWeight: '600' }}>
          {value || '—'}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flex: 1, marginHorizontal: -space.lg, marginBottom: -safeBottom }}>
      <ScrollView
        key={exerciseId}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ gap: space.ms, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: footerHeight + space.md }}
      >
        <Text variant="footnote" style={{ color: C.muted }}>
          {`Exercise ${index + 1} of ${total}`}
        </Text>
        {exerciseId ? (
          <ExercisePicture
            exerciseId={exerciseId}
            name={name}
            onPress={() => {
              if (move) setInfoOpen(true);
            }}
          />
        ) : null}
        {supersetLabel ? <Text variant="footnote" style={{ color: C.muted }}>{supersetLabel}</Text> : null}
        {priority ? <Text variant="footnote" style={{ color: C.muted }}>Your priority</Text> : null}
        {onSwap ? (
          <Button variant="text" size="regular" title="Swap" accessibilityLabel="Swap this exercise" onPress={onSwap} />
        ) : null}
        {planned ? <Text variant="footnote" style={{ color: C.muted }}>{planned}</Text> : null}
        {infoOpen && move ? <ExerciseHowToSheet item={move} scheme={scheme} onClose={() => setInfoOpen(false)} /> : null}
        {note ? <Text variant="subhead" style={{ color: C.text }}>{note}</Text> : null}
        {list.length ? (
          list.map((row, setIndex) => {
            const open = !row.ticked && !row.skipped;
            const big = setIndex === highlighted;
            const showRest = open && restLeft > 0 && setIndex === openIndex;
            // While the wheel is open it is the row: the numbers aren't shown twice.
            const wheel = active?.setIndex === setIndex && !active.typing && !row.holdRunning;
            const startHold =
              mode === 'hold' && open && !row.holdRunning ? (
                <Button
                  variant="secondary"
                  size="regular"
                  fit
                  title="Start"
                  accessibilityLabel={`Start set ${setIndex + 1}`}
                  onPress={() => onStartHold(setIndex)}
                />
              ) : null;
            // Only the active set's tick is filled: one filled green thing on the screen at a time.
            const tick = open ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Tick set ${setIndex + 1}`}
                onPress={() => {
                  if (tapTooSoon()) return;
                  setEditor(null);
                  onTickSet(setIndex);
                }}
                style={({ pressed }) => ({
                  width: size.button,
                  height: size.button,
                  borderRadius: radius.control,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Once the plan is met, Next is the filled button; an extra set's tick is outlined.
                  backgroundColor: big && !allDone ? C.lime : 'transparent',
                  borderWidth: big && !allDone ? 0 : stroke.line,
                  borderColor: C.line,
                  opacity: pressed ? opacity.pressed : 1,
                })}
              >
                <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={big && !allDone ? C.onAccent : C.muted} size={space.lg} />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View accessible accessibilityLabel={`Set ${setIndex + 1} done`} style={{ minWidth: hit, alignItems: 'center' }}>
                  <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.muted} size={space.md} />
                </View>
                {/* Only the latest tick can be undone, so earlier sets stay as they were logged. */}
                {setIndex === lastTicked && !row.skipped ? (
                  <Button
                    variant="text"
                    tone="neutral"
                    size="regular"
                    title="Undo"
                    accessibilityLabel={`Undo set ${setIndex + 1}`}
                    onPress={() => {
                      if (tapTooSoon()) return;
                      setEditor(null);
                      onUntickSet(setIndex);
                    }}
                  />
                ) : null}
              </View>
            );
            const setLabel = (
              <Text variant="footnote" style={{ color: big ? C.text : C.muted, fontWeight: big ? '600' : '400', minWidth: space.xxl + space.md }}>
                {setIndex >= setCount
                  ? `Set ${setIndex + 1} · extra`
                  : big
                    ? `Set ${setIndex + 1} of ${setCount}`
                    : `Set ${setIndex + 1}`}
              </Text>
            );
            return (
              <View
                key={setIndex}
                style={{
                  borderRadius: radius.control,
                  borderWidth: big ? stroke.active : 0,
                  borderColor: C.lime,
                  paddingHorizontal: big ? space.ms : 0,
                  paddingVertical: big ? space.sm : 0,
                  gap: space.sm,
                }}
              >
                {wheel ? setLabel : null}
                {wheel ? null : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  {setLabel}
                  {mode === 'hold' && row.holdRunning ? (
                    <>
                      <Text variant="display" numeric accessibilityLabel={`Set ${setIndex + 1} time`} style={{ flex: 1, color: C.text }}>
                        {clock(Math.floor(holdElapsedMs(row, now) / 1000))}
                      </Text>
                      <Button
                        size="regular"
                        fit
                        title="Stop"
                        accessibilityLabel={`Stop set ${setIndex + 1}`}
                        onPress={() => onStopHold(setIndex)}
                      />
                    </>
                  ) : (
                    <>
                      {mode === 'hold' ? (
                        showNumber(setIndex, 'seconds', row.seconds, adjustLabel(setIndex + 1, 'time', row.seconds, 'sec'), big)
                      ) : mode === 'reps' || load === 'bodyweight' ? null : (
                        showNumber(setIndex, 'weight', row.weight, adjustLabel(setIndex + 1, 'weight', row.weight, 'kg'), big)
                      )}
                      {mode === 'hold' ? (
                        <Text variant="footnote" style={{ color: C.muted }}>sec</Text>
                      ) : (
                        <>
                          {mode === 'reps' || load === 'bodyweight' ? null : <Text variant="footnote" style={{ color: C.muted }}>kg</Text>}
                          {showNumber(setIndex, 'reps', row.reps, adjustLabel(setIndex + 1, 'reps', row.reps, 'reps'), big)}
                          <Text variant="footnote" style={{ color: C.muted }}>reps</Text>
                        </>
                      )}
                      {startHold}
                      {tick}
                    </>
                  )}
                </View>
                )}
                {wheel ? (
                  <View style={{ gap: space.xs }}>
                    <InlineWheels columns={flowColumns(row, setIndex)} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Type the number"
                        onPress={() => setEditor(active ? { ...active, typing: true } : null)}
                        style={{ flex: 1, minHeight: hit, justifyContent: 'center' }}
                      >
                        <Text variant="footnote" style={{ color: C.muted }}>Type</Text>
                      </Pressable>
                      {startHold}
                      {tick}
                    </View>
                  </View>
                ) : null}
                {/* The rest clock lives in the footer; the card keeps only why this rest is the length it is. */}
                {showRest && restReason ? <ReasonLine>{restReason}</ReasonLine> : null}
              </View>
            );
          })
        ) : (
          <Skeleton shape="block" />
        )}
        {exerciseId ? <FocusArea exerciseId={exerciseId} /> : null}
      </ScrollView>
      <RunFooter
        noun="Exercise"
        index={index}
        total={total}
        elapsed={elapsed}
        paused={paused}
        hold={runningHold ? { seconds: Math.floor(holdElapsedMs(runningHold, now) / 1000), target: Number(runningHold.seconds) || 0 } : null}
        restLeft={restLeft}
        onSkipRest={onSkipRest}
        onHarder={onHarder}
        onEasier={onEasier}
        // Next appears once every planned set is dealt with; before that End exercise leaves early.
        ready={moving && allDone && !runningHold}
        emphasis="primary"
        hint={runningHold ? 'Stop the hold first' : ''}
        onNext={onNext}
        onEndEarly={anyTicked && !runningHold ? onNext : undefined}
        skipLabel={anyTicked ? null : 'Skip'}
        onSkip={onSkip}
        pauseLabel={paused ? 'Resume' : 'Pause'}
        onPause={onPause}
        bottom={safeBottom + space.sm}
        onHeight={setFooterHeight}
      />
      {countdown ? <RunCountdown key={`countdown-${exerciseId ?? name}`} name={name} onDone={onCountdownDone} /> : null}
    </View>
  );
}
