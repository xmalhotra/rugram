import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Pressable, ScrollView, TextInput, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import { findFlowCard } from '../../shared/personal-flows';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { catalogFlows } from '../../shared/flow-catalog';
import {
  benchmarkFor,
  nextFlowSuggestion,
  restFor,
  startingLevel,
  targetLoadKg,
  type RunLevel,
  type UserMetrics,
} from '../../shared/flow-benchmarks';
import {
  beginCardClock,
  doneCard,
  elapsedSeconds,
  endRest,
  pauseRun,
  remainingSeconds,
  resumeRun,
  skipCard,
  tick,
  type FlowRunState,
} from '../../shared/flow-run';
import { exercise, type GymExercise, type LoadType } from '../../shared/exercises';
import { runFooterState } from '../../shared/run-footer';
import { gymExerciseId, gymFlowById, gymFlowItem, gymTargetLabel, resolveTarget, setTargetText, type GymFlowItem } from '../../shared/gym-flows';
import { effortNote, formatKg, type LoggedSet } from '../../shared/progression';
import { nextSetAfterTick, planWithScheme, schemeById, schemeLine, type SetScheme } from '../../shared/set-schemes';
import { estimateLine, estimateStart, loadStrength } from './strength';
import { applyCustomflow, type Customflow } from '../../shared/customflows';
import { useCustomflow } from './customflows';
import { buildSetDetail, setsForProgression, type SetDetail } from '../../shared/set-detail';
import { useTrainingSchemes } from './training-api';
import { communityLimits } from '../../shared/community-flows';
import { Text } from './design/Text';
import { Sheet } from './design/components';
import { useTheme } from './design/theme';
import { useAnimations } from './motion';
import { FlowIllustration } from './FlowIllustration';
import { AboutYouForm } from './AboutYou';
import { useFlowHabits } from './flow-habits';
import {
  exerciseSessions,
  finishFlowRun,
  flowRunHome,
  logExerciseSets,
  postFlowRun,
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
import { space } from './design/tokens';

const levels: RunLevel[] = ['Beginner', 'Regular', 'Trained'];

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

function riseNote(from: number, to: number) {
  const delta = Math.round((to - from) * 100) / 100;
  if (delta === 0) return null;
  return `${delta > 0 ? '+' : '−'}${formatKg(Math.abs(delta))} kg`;
}
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

function markSkipped(row: SetDraft, at: number): SetDraft {
  if (row.ticked) return row;
  const opened = openSet(row, at);
  return { ...opened, skipped: true, ticked: false, holdRunning: false, holdStartedAt: null, completedAt: row.completedAt ?? at };
}

function draftRows(move: GymExercise, item: GymFlowItem, last?: LoggedSet[] | null, openedAt?: number | null): SetDraft[] {
  const target = resolveTarget(item);
  const schemeId = schemeById(item.scheme).id;
  const history = setsForProgression(last);
  // Never done before: start from our estimate of the member's strength, when we have one.
  const start = history.length ? null : (estimateStart(move, item)?.weightKg ?? null);
  const rows = planWithScheme(move, item, schemeById(item.scheme), history, start).sets.map(set => ({
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
    restPlannedSeconds: item.restSeconds ?? null,
  }));
  // Each set starts from the rest you used after it last time; the flow's default otherwise.
  rows.forEach((row, index) => {
    const lastRest = last?.find(set => set.setIndex === index + 1)?.restSeconds;
    if (lastRest != null) row.restPlannedSeconds = lastRest;
  });
  if (openedAt == null || !rows[0]) return rows;
  return rows.map((row, index) => (index === 0 ? openSet(row, openedAt) : row));
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
  if (!saved?.length) return rows;
  // Sets added beyond the plan come back too.
  const highest = Math.max(rows.length, ...saved.map(set => set.setIndex));
  while (rows.length < highest && rows.length > 0) rows = [...rows, extraSet(rows[rows.length - 1])];
  return rows.map((row, index) => {
    const set = saved.find(item => item.setIndex === index + 1);
    if (!set) return row;
    if (set.status === 'skipped') return { ...row, skipped: true, ticked: false, restPlannedSeconds: set.restPlannedSeconds ?? row.restPlannedSeconds };
    return {
      ...row,
      ticked: true,
      skipped: false,
      touched: true,
      weight: set.weightKg == null ? row.weight : formatKg(set.weightKg),
      reps: set.reps == null ? row.reps : String(set.reps),
      seconds: set.durationSeconds == null ? row.seconds : String(set.durationSeconds),
      restPlannedSeconds: set.restPlannedSeconds ?? row.restPlannedSeconds,
    };
  });
}

const restClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** The rest after a set: shown between sets, and adjustable in 15-second steps. */
function RestStepper({
  seconds,
  label,
  flowDefault,
  onChange,
}: {
  seconds: number;
  label: string;
  /** The flow's own rest, shown when yours differs. */
  flowDefault: number | null;
  onChange: (seconds: number) => void;
}) {
  const { colors: C } = useTheme();
  const step = (delta: number) => onChange(Math.max(0, Math.min(600, seconds + delta)));
  const button = (text: string, delta: number, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => step(delta)}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 36,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
  return (
    <View
      accessibilityLabel={`${label} ${restClock(seconds)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 32 }}
    >
      <Text style={{ flex: 1, color: C.muted, fontSize: 13 }}>
        {label} <Text variant="numeric" style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{restClock(seconds)}</Text>
        {flowDefault != null && flowDefault !== seconds ? ` (flow: ${restClock(flowDefault)})` : ''}
      </Text>
      {button('−', -15, `Shorter ${label.toLowerCase()}`)}
      {button('+', 15, `Longer ${label.toLowerCase()}`)}
    </View>
  );
}

function tickedRows(
  rows: SetDraft[],
  setIndex: number,
  move: GymExercise,
  item: GymFlowItem,
  logged: { weightKg: number | null; reps: number | null; durationSeconds: number | null },
  at = Date.now(),
) {
  const open = rows.map((row, index) => ({
    weightKg: index === setIndex ? logged.weightKg : row.weight.trim() === '' ? null : Number(row.weight),
    reps: index === setIndex ? logged.reps : row.reps.trim() === '' ? null : Number(row.reps),
    seconds: index === setIndex ? logged.durationSeconds : row.seconds.trim() === '' ? null : Number(row.seconds),
    ticked: row.ticked || row.skipped,
    touched: row.touched || row.skipped,
  }));
  const updated = nextSetAfterTick(move, item, schemeById(item.scheme), open, setIndex);
  const targetIndex = rows.findIndex((row, index) => index > setIndex && !row.ticked && !row.skipped);
  return rows.map((row, index) => {
    if (index === setIndex) {
      const completed = { ...row, ticked: true, skipped: false, completedAt: row.completedAt ?? at };
      return logged.durationSeconds != null
        ? { ...completed, ...emptyHold, seconds: String(logged.durationSeconds) }
        : completed;
    }
    if (index !== targetIndex || row.touched || row.ticked) return row;
    const next = updated[index];
    if (!next) return row;
    const used = open[setIndex]?.weightKg;
    const weight = next.weightKg == null ? '' : formatKg(next.weightKg);
    return {
      ...row,
      weight,
      reps: next.reps == null ? '' : String(next.reps),
      seconds: next.seconds == null ? '' : String(next.seconds),
      bump: next.weightKg != null && used != null && next.weightKg !== used ? riseNote(used, next.weightKg) : null,
    };
  });
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

function previewCards(data: MobilePayload, kind: 'flow' | 'personal', id: string, customflow?: Customflow): PreviewCard[] {
  if (kind === 'personal') {
    const flow = data.profile.personalFlows?.find(item => item.id === id);
    return (flow?.cards ?? []).map(reference => ({
      ...reference,
      card: findFlowCard(data.flows, reference.sourceFlowId, reference.cardId),
    }));
  }
  const flow = data.flows.find(item => item.id === id);
  if (!flow) return [];
  // Same order the server starts the run in: the member's Customflow, when they have one.
  return applyCustomflow(resolveVisualFlow(flow, data.flows).cards, customflow, card => gymExerciseId(card.id) ?? card.id).map(card => ({
    cardId: card.id,
    sourceFlowId: flow.id,
    title: card.title,
    card,
  }));
}

function Confetti({ play }: { play: boolean }) {
  const { colors: C } = useTheme();
  const pieces = useRef(Array.from({ length: 16 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!play) return;
    pieces.forEach(value => value.setValue(0));
    const group = Animated.stagger(
      40,
      pieces.map(value =>
        Animated.timing(value, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ),
    );
    group.start();
    return () => group.stop();
  }, [play, pieces]);
  return (
    <View style={{ height: 110 }} pointerEvents="none">
      {pieces.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            left: 8 + ((index * 23) % 300),
            top: play ? 0 : 16 + (index % 4) * 18,
            width: 8,
            height: 14,
            borderRadius: 2,
            backgroundColor: index % 2 === 0 ? C.lime : C.text,
            opacity: play ? value.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0.35] }) : 0.85,
            transform: play
              ? [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-12, 96] }) }]
              : [{ translateY: 0 }],
          }}
        />
      ))}
    </View>
  );
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
  const { colors: C } = useTheme();
  const estimates = cards.map(card => benchmarkFor(id, card.cardId, level, card.card));
  const rest = restFor(id, level);
  const estimateSeconds =
    estimates.reduce((sum, item) => sum + item.seconds, 0) + rest * Math.max(0, cards.length - 1);
  return (
    <View style={{ flex: 1, marginHorizontal: -space.lg, marginBottom: -safeBottomInset }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: 130 + safeBottomInset }}
      >
        {gym ? null : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
                    minHeight: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? C.lime : C.card,
                    borderWidth: 1,
                    borderColor: selected ? C.lime : C.line,
                  }}
                >
                  <Text style={{ color: selected ? C.onAccent : C.text, fontWeight: '600' }}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {gym ? null : <Text style={{ color: C.muted, fontSize: 15 }}>About {clock(estimateSeconds)} with rests</Text>}
        {gym
          ? applyCustomflow(gym.items, customflow, item => item.exerciseId).map(item => {
              const move = exercise(item.exerciseId);
              const lastWeight = sessions[item.exerciseId]?.sets.at(-1)?.weightKg;
              return (
                <View key={item.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: C.card }}>
                    <ExerciseVisual exerciseId={move?.id} cover />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: C.text, fontSize: 16 }}>{move?.name ?? item.exerciseId}</Text>
                    <Text style={{ color: C.muted, fontSize: 13 }}>
                      {gymTargetLabel(item)}
                      {lastWeight != null ? ` · Last ${formatKg(lastWeight)} kg` : ''}
                    </Text>
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
                <View key={card.cardId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: C.card }}>
                    {card.card ? <FlowIllustration flow={card.card} cover /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: C.text, fontSize: 16 }}>{card.title}</Text>
                    <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text>
                  </View>
                </View>
              );
            })}
      </ScrollView>
      <GlassBar bottom={safeBottomInset + 8}>
        {error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={onRetry}
            style={{ flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
          >
            <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        ) : loading ? (
          <View style={{ flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }}>
            <Text style={{ color: C.muted, fontSize: 16 }}>Loading…</Text>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={inProgress ? 'History, one flow in progress' : 'History'}
              onPress={onHistory}
              style={{ minHeight: 56, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {inProgress ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime }} />
              ) : null}
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>History</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start"
              disabled={busy || cards.length === 0}
              onPress={onStart}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.lime,
                opacity: busy || cards.length === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Start</Text>
            </Pressable>
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
  onPosted,
  resumeOnOpen = false,
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
}) {
  const { colors: C } = useTheme();
  const animations = useAnimations();
  const { completed } = useFlowHabits(data.user.id);
  const customflow = useCustomflow('qram-flow', kind === 'flow' ? id : undefined);
  const cards = useMemo(() => previewCards(data, kind, id, customflow), [data, kind, id, customflow]);
  const [metrics, setMetrics] = useState<UserMetrics | null | undefined>(undefined);
  const [existing, setExisting] = useState<FlowRunRecord | null | undefined>(undefined);
  const [live, setLive] = useState<FlowRunRecord | null>(null);
  const [state, setState] = useState<FlowRunState | null>(null);
  const [level, setLevel] = useState<RunLevel>('Regular');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const safeBottomInset = useSafeAreaInsets().bottom;
  const [now, setNow] = useState(() => Date.now());
  const posted = useRef(false);
  const suppressBuzz = useRef(false);
  const seen = useRef<string | null>(null);
  const saved = useRef<string | null>(null);
  const seenPhase = useRef<FlowRunState['phase'] | null>(null);
  const gym = gymFlowById(id);
  const [sessions, setSessions] = useState<Record<string, ExerciseSession>>({});
  const [sessionsReady, setSessionsReady] = useState(gym == null);
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});
  const [runSaved, setRunSaved] = useState<{ runId: string; sets: Record<string, HistorySet[]> } | null>(null);
  const savedSets = live && runSaved?.runId === live.id ? runSaved.sets : undefined;
  const [effort, setEffort] = useState<number | null>(null);
  const openedAt = useRef<Record<string, number>>({});
  const schemesReady = useTrainingSchemes();
  const [restUntil, setRestUntil] = useState<number | null>(null);
  // Which set's rest is counting down, so changing that rest changes the countdown.
  const [restFor, setRestFor] = useState<{ cardId: string; setIndex: number; at: number } | null>(null);
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
        if (home.metrics) setLevel(startingLevel(home.metrics, Date.now()));
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
    void exerciseSessions(gym.items.map(item => item.exerciseId))
      .then(result => {
        if (cancel) return;
        const next: Record<string, ExerciseSession> = {};
        for (const session of result.sessions) next[session.exerciseId] = session;
        setSessions(next);
        setSessionsReady(true);
      })
      .catch(() => {
        if (!cancel) setSessionsReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [gym]);

  useEffect(() => {
    if (!gym || !sessionsReady || !schemesReady || !state || state.phase !== 'card') return;
    const card = state.cards[state.index];
    if (!card?.manual || drafts[card.cardId]) return;
    // Wait for this run's saved sets when resuming, so finished sets come back ticked.
    if (live && savedSets === undefined) return;
    const exerciseId = gymExerciseId(card.cardId);
    const entry = exerciseId ? gymFlowItem(id, exerciseId) : undefined;
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
  }, [gym, sessionsReady, schemesReady, state, drafts, sessions, id, live, savedSets]);

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
    const entry = exerciseId ? gymFlowItem(id, exerciseId) : undefined;
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
  }, [drafts, id, now, state]);

  useEffect(() => {
    if (restUntil == null || state?.pausedAt != null || now < restUntil) return;
    if (restBuzzed.current !== restUntil) {
      restBuzzed.current = restUntil;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void playRestEnd();
      const card = state?.cards[state.index];
      if (card) stampNextOpen(card.cardId, Date.now());
      // Every set dealt with: the rest was the last thing on this exercise, so move on by itself.
      const cardRows = card ? drafts[card.cardId] : undefined;
      const allDealtWith = cardRows?.length ? runFooterState(cardRows.map(row => ({ ticked: row.ticked, skipped: row.skipped, running: row.holdRunning }))).ready : false;
      const isLast = state ? state.index + 1 >= state.cards.length : true;
      if (card?.manual && allDealtWith && !isLast) void leaveManual(card.cardId, 'next');
    }
    setRestUntil(null);
    // `drafts` and `leaveManual` are read at the moment rest ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, restUntil, state?.pausedAt]);

  useEffect(() => {
    if (state?.phase !== 'finished' || pendingLogs.current.length === 0) return;
    const queued = pendingLogs.current.splice(0);
    void (async () => {
      for (const body of queued) {
        try {
          await logExerciseSets(body);
        } catch {
          pendingLogs.current.push(body);
        }
      }
    })();
  }, [state?.phase]);

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
    if (seenPhase.current && seenPhase.current !== 'finished' && state.phase === 'finished') completed(id);
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

  function loggedSets(cardId: string, rows: SetDraft[]) {
    const exerciseId = gymExerciseId(cardId);
    const move = exerciseId ? exercise(exerciseId) : undefined;
    const entry = exerciseId ? gymFlowItem(id, exerciseId) : undefined;
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
    return sets.length ? { runId: live?.id, exerciseId, sets } : null;
  }

  function stampNextOpen(cardId: string, at: number) {
    setDrafts(previous => {
      const rows = previous[cardId];
      if (!rows) return previous;
      const index = rows.findIndex(row => !row.ticked && !row.skipped && row.startedAt == null);
      if (index < 0) return previous;
      return { ...previous, [cardId]: rows.map((row, rowIndex) => (rowIndex === index ? openSet(row, at) : row)) };
    });
  }

  function onExerciseReady(cardId: string) {
    const at = Date.now();
    openedAt.current[cardId] = at;
    apply(currentState => beginCardClock(currentState, at));
    setDrafts(previous => {
      const rows = previous[cardId];
      if (!rows?.[0]) return previous;
      return { ...previous, [cardId]: rows.map((row, index) => (index === 0 ? openSet(row, at) : row)) };
    });
  }

  async function persistCard(cardId: string, rows: SetDraft[]) {
    const body = loggedSets(cardId, rows);
    if (!body) return;
    try {
      await logExerciseSets(body);
    } catch {
      pendingLogs.current.push(body);
    }
  }

  async function leaveManual(cardId: string, kind: 'next' | 'skip', rows?: SetDraft[]) {
    await persistCard(cardId, rows ?? drafts[cardId] ?? []);
    setRestUntil(null);
    apply(currentState =>
      kind === 'skip' ? skipCard(currentState, Date.now()) : doneCard(currentState, Date.now()),
    );
  }

  async function begin(replace: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (replace && existing) await finishFlowRun(existing.id, existing.state);
      const result = await startFlowRun({ kind, id, level });
      saved.current = null;
      seen.current = null;
      setHistoryOpen(false);
      setExisting(null);
      setLive(result.run);
      setEffort(result.run.effort ?? null);
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
    setEffort(existing.effort ?? null);
    setState(tick(existing.state, Date.now()));
  }

  async function settle(advance: 'close' | 'next' | 'try', suggestion?: { flowId: string; title: string }) {
    if (busy) return;
    setBusy(true);
    try {
      if (live && state && !posted.current) await finishFlowRun(live.id, state, effort ?? undefined);
    } catch {
      // Leaving still keeps the last saved cards.
    }
    if (advance === 'next') onNext?.();
    else if (advance === 'try' && suggestion) onTry?.(suggestion.flowId, suggestion.title);
    else onClose();
  }

  async function post() {
    if (!live || !state || busy) return;
    setBusy(true);
    setError('');
    try {
      await saveFlowRun(live.id, state, effort ?? undefined);
      await postFlowRun(live.id, note.trim() || undefined);
      posted.current = true;
      onPosted?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  const activeLevel = live?.level ?? level;
  const estimates = cards.map(card => benchmarkFor(id, card.cardId, activeLevel, card.card));
  const running = state && live ? state : null;
  const current = running?.cards[running.index];
  const manualExerciseId = current?.manual ? gymExerciseId(current.cardId) : null;
  const manualMove = manualExerciseId ? exercise(manualExerciseId) : undefined;
  const manualItem = manualExerciseId ? gymFlowItem(id, manualExerciseId) : undefined;
  const manualLast = manualExerciseId ? sessions[manualExerciseId] : undefined;
  const manualEstimate = manualMove && manualItem && !manualLast ? estimateStart(manualMove, manualItem) : null;
  const manualPlan = manualMove && manualItem
    ? planWithScheme(manualMove, manualItem, schemeById(manualItem.scheme), manualLast?.sets ?? null, manualEstimate?.weightKg ?? null)
    : null;
  const manualPattern = manualItem?.scheme && manualPlan ? schemeLine(schemeById(manualItem.scheme), manualPlan) : null;
  const manualNote = !current?.manual || !manualMove || !manualItem
    ? null
    : !sessionsReady
      ? null
      : manualMove.load === 'bodyweight'
        ? effortNote(manualMove, manualItem, manualLast?.sets ?? null)
        : !manualLast
          ? manualEstimate
            ? estimateLine(manualEstimate)
            : "First time on this one. Add your weight and we'll remember it."
          : manualPlan?.raised && manualPlan.sets[0]?.weightKg != null && manualLast.sets[0]?.weightKg != null
            ? `Last time ${formatKg(manualLast.sets[0].weightKg)} kg × ${manualItem.repsMax}. Try ${formatKg(manualPlan.sets[0].weightKg)} kg.`
            : null;
  const suggestion =
    running?.phase === 'finished'
      ? nextFlowSuggestion(
          id,
          running.cards.reduce((sum, card) => sum + (card.status === 'done' ? (card.seconds ?? 0) : 0), 0),
          running.cards.reduce((sum, card) => sum + (card.status === 'done' ? card.targetSeconds : 0), 0),
          catalogFlows,
        )
      : null;
  const showingHistory = historyOpen && !running && metrics !== null;
  const sheetTitle = showingHistory
    ? 'History'
    : !running
    ? metrics === null
      ? 'About you'
      : title
    : running.phase === 'finished'
      ? 'Flow complete'
      : running.phase === 'rest'
        ? 'Rest'
        : (current?.title ?? title);

  return (
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
        <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 15 }}>
          {error}
        </Text>
      ) : null}
      {(metrics === undefined || existing === undefined) && !gym ? (
        error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => setReloadKey(value => value + 1)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        ) : (
          <Text style={{ color: C.muted, fontSize: 16 }}>Loading…</Text>
        )
      ) : metrics === null ? (
        <AboutYouForm
          initial={null}
          onSaved={savedMetrics => {
            setMetrics(savedMetrics);
            setLevel(startingLevel(savedMetrics, Date.now()));
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
            onLevel={setLevel}
            metrics={metrics}
            gym={gym}
            sessions={sessions}
            inProgress={Boolean(existing)}
            loading={metrics === undefined || existing === undefined}
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
          target={manualItem ? gymTargetLabel(manualItem) : ''}
          rowTarget={manualItem ? setTargetText(manualItem) : ''}
          flowRest={manualItem?.restSeconds ?? null}
          onAddSet={() =>
            setDrafts(previous => {
              const list = previous[current.cardId];
              if (!list?.length || list.length >= 20) return previous;
              return { ...previous, [current.cardId]: [...list, extraSet(list[list.length - 1])] };
            })
          }
          onRemoveSet={() =>
            setDrafts(previous => {
              const list = previous[current.cardId];
              const last = list?.[list.length - 1];
              if (!list || list.length <= 1 || !last || last.ticked || last.skipped || last.holdRunning) return previous;
              return { ...previous, [current.cardId]: list.slice(0, -1) };
            })
          }
          mode={!manualMove || !manualItem ? 'weight' : isHoldTarget(manualItem) ? 'hold' : manualMove.load === 'bodyweight' ? 'reps' : 'weight'}
          note={manualNote}
          pattern={manualPattern}
          scheme={manualItem?.scheme ? schemeById(manualItem.scheme) : null}
          load={manualMove?.load ?? 'weight'}
          index={running.index}
          total={running.cards.length}
          elapsed={elapsedSeconds(running, now)}
          now={now}
          paused={running.pausedAt != null}
          rows={drafts[current.cardId]}
          restLeft={restUntil == null ? 0 : Math.max(0, Math.ceil((restUntil - (running.pausedAt ?? now)) / 1000))}
          onWeight={(setIndex, value) =>
            setDrafts(previous => {
              const rows = previous[current.cardId];
              if (!rows) return previous;
              return {
                ...previous,
                [current.cardId]: rows.map((row, rowIndex) => {
                  if (rowIndex === setIndex)
                    return { ...row, weight: value, touched: true, bump: null, edited: row.ticked ? true : row.edited };
                  if (setIndex === 0 && !row.ticked && !row.touched && row.weight.trim() === '') return { ...row, weight: value };
                  return row;
                }),
              };
            })
          }
          onReps={(setIndex, value) =>
            setDrafts(previous => {
              const rows = previous[current.cardId];
              if (!rows) return previous;
              return {
                ...previous,
                [current.cardId]: rows.map((row, rowIndex) =>
                  rowIndex === setIndex ? { ...row, reps: value, touched: true, edited: row.ticked ? true : row.edited } : row,
                ),
              };
            })
          }
          onTickSet={setIndex => {
            const at = Date.now();
            const exerciseId = gymExerciseId(current.cardId);
            const move = exerciseId ? exercise(exerciseId) : undefined;
            const entry = exerciseId ? gymFlowItem(id, exerciseId) : undefined;
            const prepared = (drafts[current.cardId] ?? []).map((row, index) => (index === setIndex ? openSet(row, at) : row));
            const row = prepared[setIndex];
            const logged = !move || !entry || !row || row.ticked || row.skipped ? null : parseLogged(row, move.load, entry);
            if (!move || !entry || !row || row.ticked || row.skipped || !logged) return;
            // Saved straight away, so a ticked set survives leaving the workout.
            const nowTicked = tickedRows(prepared, setIndex, move, entry, logged, at);
            setDrafts(previous => ({ ...previous, [current.cardId]: nowTicked }));
            void persistCard(current.cardId, nowTicked);
            setRestUntil(at + (row.restPlannedSeconds ?? entry.restSeconds ?? 90) * 1000);
            setRestFor({ cardId: current.cardId, setIndex, at });
          }}
          onSkipRest={() => {
            setRestUntil(null);
            stampNextOpen(current.cardId, Date.now());
            // Skipping the rest after the last set moves on, as the rest ending would.
            const cardRows = drafts[current.cardId] ?? [];
            const dealtWith = cardRows.length > 0 && runFooterState(cardRows.map(row => ({ ticked: row.ticked, skipped: row.skipped, running: row.holdRunning }))).ready;
            if (dealtWith && running.index + 1 < running.cards.length) void leaveManual(current.cardId, 'next');
          }}
          onNext={() => void leaveManual(current.cardId, 'next')}
          onSkip={() => {
            const at = Date.now();
            const cardRows = drafts[current.cardId] ?? [];
            const noneTicked = !cardRows.some(row => row.ticked);
            const nextRows = cardRows.map(row => (noneTicked || (!row.ticked && !row.skipped) ? markSkipped(row, at) : row));
            setDrafts(previous => ({ ...previous, [current.cardId]: nextRows }));
            void leaveManual(current.cardId, noneTicked ? 'skip' : 'next', nextRows);
          }}
          onRest={(setIndex, seconds) => {
            if (restFor && restFor.cardId === current.cardId && restFor.setIndex === setIndex && restUntil != null) {
              setRestUntil(restFor.at + seconds * 1000);
            }
            setDrafts(previous => {
              const list = previous[current.cardId];
              if (!list) return previous;
              return {
                ...previous,
                [current.cardId]: list.map((row, index) => (index === setIndex ? { ...row, restPlannedSeconds: seconds } : row)),
              };
            });
          }}
          onSeconds={(setIndex, value) =>
            setDrafts(previous => {
              const rows = previous[current.cardId];
              if (!rows) return previous;
              return {
                ...previous,
                [current.cardId]: rows.map((row, rowIndex) =>
                  rowIndex === setIndex
                    ? { ...row, seconds: value, touched: true, typedSeconds: true, edited: row.ticked ? true : row.edited }
                    : row,
                ),
              };
            })
          }
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
          onStopHold={setIndex => {
            const entry = manualItem;
            const row = drafts[current.cardId]?.[setIndex];
            if (!entry || !row || row.ticked || !row.holdRunning) return;
            const at = Date.now();
            const seconds = Math.min(3600, Math.max(1, Math.round(holdElapsedMs(row, at) / 1000)));
            setDrafts(previous => {
              const rows = previous[current.cardId];
              if (!rows) return previous;
              const stamped = rows.map((item, rowIndex) =>
                rowIndex === setIndex ? { ...item, clockRan: true, typedSeconds: false, seconds: String(seconds) } : item,
              );
              if (!manualMove) {
                return {
                  ...previous,
                  [current.cardId]: stamped.map((item, rowIndex) =>
                    rowIndex === setIndex
                      ? { ...item, ...emptyHold, seconds: String(seconds), ticked: true, skipped: false, completedAt: item.completedAt ?? at }
                      : item,
                  ),
                };
              }
              return {
                ...previous,
                [current.cardId]: tickedRows(stamped, setIndex, manualMove, entry, { weightKg: null, reps: null, durationSeconds: seconds }, at),
              };
            });
            setRestUntil(Date.now() + (entry.restSeconds ?? 90) * 1000);
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
      ) : running.phase === 'rest' && current ? (
        <View style={{ gap: 18, paddingTop: 24 }}>
          <Text variant="numeric" style={{ color: C.text, fontSize: 72, fontWeight: '700', textAlign: 'center' }}>
            {clock(remainingSeconds(running, now))}
          </Text>
          <Text style={{ color: C.muted, fontSize: 18, textAlign: 'center' }}>Next: {current.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start next"
            onPress={() => apply(currentState => endRest(currentState, Date.now()))}
            style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
          >
            <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Start next</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running.pausedAt ? 'Resume' : 'Pause'}
            onPress={() =>
              apply(currentState =>
                currentState.pausedAt != null ? resumeRun(currentState, Date.now()) : pauseRun(currentState, Date.now()),
              )
            }
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
              {running.pausedAt ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <Confetti play={animations} />
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 32, fontWeight: '700' }}>
            Flow complete!
          </Text>
          <Text style={{ color: C.muted, fontSize: 18 }}>
            Time taken {clock(running.cards.reduce((sum, card) => sum + (card.status === 'done' ? (card.seconds ?? 0) : 0), 0))}
          </Text>
          {gym ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>How hard was it?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>Easy</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>All out</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map(value => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} out of 10`}
                    accessibilityState={{ selected: effort === value }}
                    onPress={() => {
                      setEffort(value);
                      if (live && state) void saveFlowRun(live.id, state, value).catch(() => undefined);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: effort === value ? C.lime : C.card,
                    }}
                  >
                    <Text style={{ color: effort === value ? C.onAccent : C.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {posted.current ? (
            <View style={{ gap: 12 }}>
              <Text accessibilityRole="alert" style={{ color: C.lime, fontSize: 17, fontWeight: '700' }}>
                ✓ Posted to your timeline
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                disabled={busy}
                onPress={() => void settle('close')}
                style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
              >
                <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </View>
          ) : (
          <>
          <TextInput
            accessibilityLabel="Add a note"
            value={note}
            onChangeText={setNote}
            placeholder="Add a note"
            placeholderTextColor={C.muted}
            maxLength={communityLimits.description}
            multiline
            style={{
              minHeight: 80,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.card,
              color: C.text,
              padding: 14,
              fontSize: 16,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post to timeline"
            disabled={busy || posted.current}
            onPress={() => void post()}
            style={{
              minHeight: 56,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.lime,
              opacity: busy || posted.current ? 0.5 : 1,
            }}
          >
            <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>
              {posted.current ? 'Posted' : 'Post to timeline'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            disabled={busy}
            onPress={() => void settle('close')}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>Not now</Text>
          </Pressable>
          </>
          )}
          {nextTitle && onNext ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Next: ${nextTitle}`}
              disabled={busy}
              onPress={() => void settle('next')}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>Next: {nextTitle}</Text>
            </Pressable>
          ) : null}
          {suggestion ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>
                Your body seems used to this flow. Try {suggestion.title} next.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Try ${suggestion.title}`}
                disabled={busy}
                onPress={() =>
                  void settle('try', {
                    flowId: suggestion.flowId ?? suggestion.id,
                    title: suggestion.title,
                  })
                }
                style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>Try {suggestion.title}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </Sheet>
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
    <View style={{ gap: 16, paddingTop: 8 }}>
      <View style={{ height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card }}>
        {card ? <FlowIllustration flow={card} cover /> : null}
      </View>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '700' }}>
        {title}
      </Text>
      <Text variant="numeric" style={{ color: C.text, fontSize: 72, fontWeight: '700' }}>
        {clock(remaining)}
      </Text>
      <Text style={{ color: C.muted, fontSize: 16 }}>
        Card {index + 1} of {total}
      </Text>
      {target ? <Text style={{ color: C.text, fontSize: 16 }}>{target}</Text> : null}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: C.lime }} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        onPress={onDone}
        style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
      >
        <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Done</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip"
          onPress={onSkip}
          style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
          onPress={onPause}
          style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GymManualCard({
  move,
  name,
  exerciseId,
  target,
  rowTarget,
  flowRest,
  onAddSet,
  onRemoveSet,
  mode,
  note,
  pattern,
  scheme,
  load,
  index,
  total,
  elapsed,
  now,
  paused,
  rows,
  restLeft,
  onWeight,
  onReps,
  onSeconds,
  onRest,
  onTickSet,
  onStartHold,
  onStopHold,
  onSkipRest,
  onNext,
  onSkip,
  onPause,
  countdown,
  onCountdownDone,
}: {
  move?: GymExercise;
  name: string;
  exerciseId?: string;
  target: string;
  rowTarget: string;
  /** The flow's default rest between sets. */
  flowRest: number | null;
  onAddSet: () => void;
  /** Drops the last set, only while it hasn't been done. */
  onRemoveSet: () => void;
  mode: 'weight' | 'reps' | 'hold';
  note: string | null;
  pattern: string | null;
  scheme: SetScheme | null;
  load: LoadType;
  index: number;
  total: number;
  elapsed: number;
  now: number;
  paused: boolean;
  rows?: SetDraft[];
  restLeft: number;
  onWeight: (setIndex: number, value: string) => void;
  onReps: (setIndex: number, value: string) => void;
  onSeconds: (setIndex: number, value: string) => void;
  /** The rest after this set, which the person may change. */
  onRest: (setIndex: number, seconds: number) => void;
  onTickSet: (setIndex: number) => void;
  onStartHold: (setIndex: number) => void;
  onStopHold: (setIndex: number) => void;
  onSkipRest: () => void;
  onNext: () => void;
  onSkip: () => void;
  onPause: () => void;
  countdown: boolean;
  onCountdownDone: () => void;
}) {
  const { colors: C } = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);
  const footer = runFooterState(
    (rows ?? []).map(row => ({ ticked: row.ticked, skipped: row.skipped, running: row.holdRunning })),
  );
  const safeBottom = useSafeAreaInsets().bottom;
  const runningHold = rows?.find(row => row.holdRunning) ?? null;
  const lastRow = rows?.[rows.length - 1];
  const canRemoveSet = Boolean(rows && rows.length > 1 && lastRow && !lastRow.ticked && !lastRow.skipped && !lastRow.holdRunning);
  return (
    // The modal already keeps clear of the home indicator; the bar's glass runs past it to the edge.
    <View style={{ flex: 1, marginHorizontal: -space.lg, marginBottom: -safeBottom }}>
    <ScrollView
      key={exerciseId}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ gap: 14, paddingHorizontal: space.lg, paddingTop: 8, paddingBottom: 290 + safeBottom }}
    >
      {exerciseId ? (
        <ExercisePicture
          exerciseId={exerciseId}
          name={name}
          onPress={() => {
            if (move) setInfoOpen(true);
          }}
        />
      ) : null}
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{target}</Text>
      {infoOpen && move ? <ExerciseHowToSheet item={move} scheme={scheme} onClose={() => setInfoOpen(false)} /> : null}
      {note ? <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{note}</Text> : null}
      {pattern && mode === 'weight' ? <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{pattern}</Text> : null}
      {rows ? (
        rows.map((row, setIndex) => (
          <Fragment key={setIndex}>
          {mode === 'hold' ? (
            <View key={setIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 24, color: C.muted, fontSize: 16 }}>{setIndex + 1}</Text>
              {row.holdRunning ? (
                <>
                  <Text
                    variant="numeric"
                    accessibilityLabel={`Set ${setIndex + 1} time`}
                    style={{ flex: 1, color: C.text, fontSize: 28, fontWeight: '700' }}
                  >
                    {clock(Math.floor(holdElapsedMs(row, now) / 1000))}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Stop set ${setIndex + 1}`}
                    onPress={() => onStopHold(setIndex)}
                    style={{ minWidth: 96, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
                  >
                    <Text style={{ color: C.onAccent, fontSize: 17, fontWeight: '700' }}>Stop</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel={`Set ${setIndex + 1} seconds`}
                    value={row.seconds}
                    onChangeText={value => onSeconds(setIndex, value.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="sec"
                    placeholderTextColor={C.muted}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 56,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.line,
                      backgroundColor: C.card,
                      color: C.text,
                      fontSize: 22,
                      fontWeight: '700',
                      paddingHorizontal: 12,
                    }}
                  />
                  <Text style={{ color: C.muted, fontSize: 14 }}>sec</Text>
                  {!row.ticked ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Start set ${setIndex + 1}`}
                      onPress={() => onStartHold(setIndex)}
                      style={{ minWidth: 72, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.lime }}
                    >
                      <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>Start</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={row.ticked ? `Set ${setIndex + 1} done` : `Tick set ${setIndex + 1}`}
                    accessibilityState={{ disabled: row.ticked }}
                    disabled={row.ticked}
                    onPress={() => onTickSet(setIndex)}
                    style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: row.ticked ? C.line : C.lime }}
                  >
                    <Text style={{ color: row.ticked ? C.muted : C.onAccent, fontSize: 22, fontWeight: '700' }}>✓</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
          <View key={setIndex} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ width: 28, color: C.muted, fontSize: 16, lineHeight: 56 }}>{setIndex + 1}</Text>
            {mode === 'reps' ? null : load === 'bodyweight' ? (
              <Text style={{ flex: 1, color: C.muted, fontSize: 16, lineHeight: 56 }}>Bodyweight</Text>
            ) : (
              <View style={{ flex: 1.4, gap: 4 }}>
                <TextInput
                  accessibilityLabel={`Set ${setIndex + 1} weight kilograms`}
                  value={row.weight}
                  onChangeText={value => onWeight(setIndex, value)}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  placeholderTextColor={C.muted}
                  style={{
                    minHeight: 56,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.line,
                    backgroundColor: C.card,
                    color: C.text,
                    fontSize: 28,
                    fontWeight: '700',
                    paddingHorizontal: 12,
                  }}
                />
                {row.bump ? <Text style={{ color: C.muted, fontSize: 12 }}>{row.bump}</Text> : null}
              </View>
            )}
            <TextInput
              accessibilityLabel={`Set ${setIndex + 1} reps`}
              value={row.reps}
              onChangeText={value => onReps(setIndex, value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={rowTarget === 'max' ? 'max' : 'reps'}
              placeholderTextColor={C.muted}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.line,
                backgroundColor: C.card,
                color: C.text,
                fontSize: 22,
                fontWeight: '700',
                paddingHorizontal: 12,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.ticked ? `Set ${setIndex + 1} done` : `Tick set ${setIndex + 1}`}
              accessibilityState={{ disabled: row.ticked }}
              disabled={row.ticked}
              onPress={() => onTickSet(setIndex)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: row.ticked ? C.line : C.lime,
              }}
            >
              <Text style={{ color: row.ticked ? C.muted : C.onAccent, fontSize: 22, fontWeight: '700' }}>✓</Text>
            </Pressable>
          </View>
          )}
          {setIndex < rows.length - 1 || index + 1 < total ? (
            <RestStepper
              seconds={row.restPlannedSeconds ?? 0}
              label={setIndex < rows.length - 1 ? 'Rest' : 'Rest before next exercise'}
              flowDefault={flowRest}
              onChange={value => onRest(setIndex, value)}
            />
          ) : null}
          </Fragment>
        ))
      ) : (
        <Text style={{ color: C.muted, fontSize: 16 }}>Loading…</Text>
      )}
      {rows?.length ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a set"
            onPress={onAddSet}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: C.lime, fontSize: 15, fontWeight: '700' }}>+ Add set</Text>
          </Pressable>
          {canRemoveSet ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove the last set"
              onPress={onRemoveSet}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.line,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>− Remove set</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
      ready={Boolean(rows?.length) && footer.ready}
      hint={footer.hint || 'Finish or skip 1 more set'}
      onNext={onNext}
      skipLabel={rows?.length ? footer.skipLabel : 'Skip'}
      onSkip={onSkip}
      pauseLabel={paused ? 'Resume' : 'Pause'}
      onPause={onPause}
      bottom={safeBottom + 8}
    />
    {countdown ? <RunCountdown key={`countdown-${exerciseId ?? name}`} name={name} onDone={onCountdownDone} /> : null}
    </View>
  );
}
