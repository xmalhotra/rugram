import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { DetailSurface } from './design/DetailSurface';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { exercise } from '../../shared/exercises';
import type { HabitFlow } from '../../shared/mobile';
import { estimateStart, loadStrength } from './strength';
import { applyCustomflow } from '../../shared/customflows';
import { intensityShare, paceText, type RunIntensity } from '../../shared/running-paces';
import { runPace, usePersonalMetrics } from './personal-metrics';
import { customflowFor, loadCustomflows, saveCustomflowSwap, useCustomflow } from './customflows';
import { SwapChooser } from './EquipmentCheck';
import { runFooterState } from '../../shared/run-footer';
import {
  blockFields,
  blockTargetItem,
  fieldRole,
  formatClock,
  lastTimeLine,
  parseClock,
  targetLabel,
  setPrefill,
  type Field,
  type LogValue,
  type SessionBlock,
  type TrainingType
} from '../../shared/training';
import { nextSetAfterTick, planBlock, registerSchemes, schemeById, schemeLine, type SetScheme } from '../../shared/set-schemes';
import { buildSetDetail, setsForProgression, type SetDetail } from '../../shared/set-detail';
import { Glyph } from './design/Glyph';
import { Button, Skeleton } from './design/components';
import { Text } from './design/Text';
import { WheelEntry, WheelSheet, adjustLabel, fieldColumns, fieldUnit, isWheelField } from './design/NumberWheels';
import { useTheme, space, radius, stroke, hit, opacity, textRoles } from './design/theme';
import { CatalogBar } from './FlowCatalogTile';
import { RunFooter } from './RunFooter';
import { playRestEnd } from './run-sound';
import { RunCountdown } from './RunCountdown';
import { SoundToggle } from './SoundToggle';
import { ExerciseHowToSheet } from './ExerciseHowTo';
import { ExercisePicture, FocusArea } from './ExerciseRunMedia';
import { logTraining, postTraining, trainingSession, useTrainingSchemes, type TrainingSessionDetail } from './training-api';
import { useTrainingSessionPane, useTrainingTick } from './training-route';

type DraftSet = {
  text: Record<string, string>;
  checks: Record<string, boolean>;
  skipped: boolean;
  ticked: boolean;
  touched: boolean;
  runningKey: string | null;
  runningSince: number | null;
  runningBase: number;
  plannedWeight: number | null;
  plannedReps: number | null;
  plannedSeconds: number | null;
  planFrozen: boolean;
  startedAt: number | null;
  completedAt: number | null;
  clockRan: boolean;
  typedSeconds: boolean;
  edited: boolean;
};

const freshTiming = {
  plannedWeight: null as number | null,
  plannedReps: null as number | null,
  plannedSeconds: null as number | null,
  planFrozen: false,
  startedAt: null as number | null,
  completedAt: null as number | null,
  clockRan: false,
  typedSeconds: false,
  edited: false
};

type DraftBlock = { id: string; exerciseId?: string; skipped: boolean; sets: DraftSet[] };

function readValues(fields: Field[], set: DraftSet, now: number): Record<string, LogValue> {
  const values: Record<string, LogValue> = {};
  for (const field of fields) {
    if (field.input === 'check') {
      if (set.checks[field.key]) values[field.key] = true;
      continue;
    }
    const live =
      field.input === 'duration' && set.runningKey === field.key && set.runningSince != null
        ? String(Math.round(set.runningBase + (now - set.runningSince) / 1000))
        : (set.text[field.key] ?? '');
    if (!live.trim()) continue;
    if (field.input === 'duration') {
      const parsed = parseClock(live);
      if (parsed != null) values[field.key] = parsed;
      continue;
    }
    const parsed = Number(live);
    if (Number.isFinite(parsed)) values[field.key] = field.input === 'rating' ? Math.round(parsed) : parsed;
  }
  return values;
}

function readOpen(fields: Field[], set: DraftSet, now: number) {
  const values = readValues(fields, set, now);
  const numberOf = (role: 'weight' | 'reps' | 'seconds') => {
    const field = fields.find(item => fieldRole(item) === role);
    const value = field ? values[field.key] : null;
    return typeof value === 'number' ? value : null;
  };
  return {
    weightKg: numberOf('weight'),
    reps: numberOf('reps'),
    seconds: numberOf('seconds'),
    ticked: set.ticked,
    touched: set.touched
  };
}

function writeOpen(set: DraftSet, fields: Field[], open: { weightKg: number | null; reps: number | null; seconds: number | null }) {
  const text = { ...set.text };
  const write = (role: 'weight' | 'reps' | 'seconds', value: number | null) => {
    const field = fields.find(item => fieldRole(item) === role);
    if (!field) return;
    text[field.key] = value == null ? '' : String(value);
  };
  write('weight', open.weightKg);
  write('reps', open.reps);
  write('seconds', open.seconds);
  return { ...set, text };
}

function openTrainingSet(set: DraftSet, fields: Field[], at: number): DraftSet {
  if (set.planFrozen && set.startedAt != null) return set;
  const values = readOpen(fields, set, at);
  return {
    ...set,
    planFrozen: true,
    plannedWeight: set.planFrozen ? set.plannedWeight : values.weightKg,
    plannedReps: set.planFrozen ? set.plannedReps : values.reps,
    plannedSeconds: set.planFrozen ? set.plannedSeconds : values.seconds,
    startedAt: set.startedAt ?? at
  };
}

function markTrainingSkipped(set: DraftSet, fields: Field[], at: number): DraftSet {
  if (set.ticked) return set;
  const opened = openTrainingSet(set, fields, at);
  return { ...opened, skipped: true, ticked: false, runningKey: null, runningSince: null, completedAt: set.completedAt ?? at };
}

function draftBlock(detail: TrainingSessionDetail, block: SessionBlock): DraftBlock {
  const fields = blockFields(detail.type, block);
  const records = setsForProgression(detail.records.find(row => row.exerciseId === block.exerciseId)?.sets ?? null);
  // Never done before: start from our estimate of the member's strength, when we have one.
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  const start = !records.length && move ? (estimateStart(move, blockTargetItem(block))?.weightKg ?? null) : null;
  return {
    id: block.id,
    exerciseId: block.exerciseId,
    skipped: false,
    sets: Array.from({ length: block.sets }, (_, index) => {
      const last = detail.last?.sets.find(row => row.blockId === block.id && row.setIndex === index + 1)?.values ?? null;
      const values = setPrefill(detail.type, block, index, records, last, detail.schemes, start);
      const text: Record<string, string> = {};
      const checks: Record<string, boolean> = {};
      for (const field of fields) {
        const value = values[field.key];
        if (typeof value === 'boolean') checks[field.key] = value;
        else if (typeof value === 'number') text[field.key] = String(value);
      }
      return { text, checks, skipped: false, ticked: false, touched: false, runningKey: null, runningSince: null, runningBase: 0, ...freshTiming };
    })
  };
}

export function TrainingSession({
  sessionId,
  planDate,
  library,
  onClose,
  onSaved
}: {
  sessionId: string;
  planDate: string;
  library: HabitFlow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors: C } = useTheme();
  useTrainingSchemes();
  const inset = useSafeAreaInsets();
  const [detail, setDetail] = useState<TrainingSessionDetail | null>(null);
  const [drafts, setDrafts] = useState<DraftBlock[]>([]);
  // The footer floats over the list; the list leaves its measured height free.
  const [footerHeight, setFooterHeight] = useState(0);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const customflow = useCustomflow('qram-session', sessionId);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapNote, setSwapNote] = useState('');
  const [sessionText, setSessionText] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'work' | 'fields' | 'post'>('work');
  const [now, setNow] = useState(() => Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const buzzed = useRef(new Set<string>());
  // Strength numbers fill first-time weights, so fetch them before sets are drafted.
  useEffect(() => {
    void loadStrength();
  }, []);

  useEffect(() => {
    let live = true;
    // The member's Customflow of this session, when they have one. Sets are logged by block, so order is free to change.
    Promise.all([trainingSession(sessionId), loadCustomflows()])
      .then(([loaded]) => {
        if (loaded.schemes) registerSchemes(loaded.schemes);
        if (!live) return;
        const applied = applyCustomflow(loaded.session.blocks, customflowFor('qram-session', loaded.session.id), block => block.id);
        setDetail(loaded);
        setDrafts(applied.map(block => draftBlock(loaded, block)));
      })
      .catch(reason => {
        if (live) setError(reason instanceof Error ? reason.message : 'Try again.');
      });
    return () => {
      live = false;
    };
  }, [sessionId]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const appliedBlocks = useMemo(
    () => (detail ? applyCustomflow(detail.session.blocks, customflow, block => block.id) : []),
    [detail, customflow],
  );
  useEffect(() => {
    if (!detail) return;
    const current = draftsRef.current;
    let held = false;
    const next = appliedBlocks.map(block => {
      const existing = current.find(item => item.id === block.id);
      const ticked = Boolean(existing?.sets.some(set => set.ticked));
      // A set already ticked stays on the exercise it was started as.
      if (existing && ticked && existing.exerciseId && existing.exerciseId !== block.exerciseId) {
        held = true;
        return existing;
      }
      if (existing && existing.exerciseId === block.exerciseId) return existing;
      return draftBlock(detail, block);
    });
    const unchanged = next.length === current.length && next.every((item, index) => item === current[index]);
    if (!unchanged) setDrafts(next);
    if (held) setSwapNote('This set stays. The swap is used the next time you start.');
  }, [detail, appliedBlocks]);
  const blocks = appliedBlocks.map(block => {
    const draft = drafts.find(item => item.id === block.id);
    if (draft?.sets.some(set => set.ticked) && draft.exerciseId) return { ...block, exerciseId: draft.exerciseId };
    return block;
  });
  const session = detail ? { ...detail.session, blocks } : undefined;
  const type = detail?.type;
  const block = session?.blocks[index];
  const fields = type && block ? blockFields(type, block) : [];
  useEffect(() => {
    if (!type || !block) return;
    const draft = drafts[index];
    if (!draft) return;
    draft.sets.forEach((set, setIndex) => {
      const duration = fields.find(field => field.input === 'duration');
      if (!duration || set.runningKey !== duration.key || set.runningSince == null) return;
      const elapsed = set.runningBase + (now - set.runningSince) / 1000;
      const target = block.targets?.[duration.key];
      for (const edge of [target?.min, target?.max]) {
        if (edge == null) continue;
        const key = `${block.id}:${setIndex}:${edge}`;
        if (elapsed >= edge && !buzzed.current.has(key)) {
          buzzed.current.add(key);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        }
      }
    });
  }, [now, drafts, index, type, block, fields]);
  useEffect(() => {
    if (restUntil == null || now < restUntil) return;
    setRestUntil(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void playRestEnd();
    if (type && block) {
      const at = Date.now();
      setDrafts(current =>
        current.map((item, itemIndex) => {
          if (itemIndex !== index) return item;
          const openIndex = item.sets.findIndex(set => !set.ticked && !set.skipped && set.startedAt == null);
          if (openIndex < 0) return item;
          return { ...item, sets: item.sets.map((set, setIndex) => (setIndex === openIndex ? openTrainingSet(set, fields, at) : set)) };
        }),
      );
    }
    // Every set dealt with: the rest was the last thing on this exercise, so move on by itself.
    const sets = drafts[index]?.sets ?? [];
    const allDealtWith =
      sets.length > 0 &&
      runFooterState(sets.map(set => ({ ticked: set.ticked, skipped: set.skipped, running: set.runningKey != null }))).ready;
    if (allDealtWith && session && index + 1 < session.blocks.length) setIndex(index + 1);
    // Runs only when rest ends; the rest are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, restUntil]);
  function patchSet(setIndex: number, change: (set: DraftSet) => DraftSet) {
    setDrafts(current => current.map((item, itemIndex) => (itemIndex === index ? { ...item, sets: item.sets.map((set, i) => (i === setIndex ? change(set) : set)) } : item)));
  }
  function tick(setIndex: number) {
    if (!type || !block || !detail) return;
    const draft = drafts[index];
    const current = draft?.sets[setIndex];
    if (!current || current.ticked) return;
    const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
    const at = Date.now();
    const prepared = draft.sets.map((set, index) => (index === setIndex ? openTrainingSet(set, fields, at) : set));
    const open = prepared.map(set => {
      const values = readOpen(fields, set, now);
      return { ...values, ticked: set.ticked || set.skipped, touched: set.touched || set.skipped };
    });
    const updated = nextSetAfterTick(move ?? null, blockTargetItem(block), schemeById(block.scheme, detail.schemes), open, setIndex);
    const targetIndex = draft.sets.findIndex((set, i) => i > setIndex && !set.ticked && !set.skipped);
    setDrafts(currentDrafts =>
      currentDrafts.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          sets: prepared.map((set, i) => {
            if (i === setIndex) {
              // A clock still running stops here, and the time it showed is what's logged.
              const text =
                set.runningKey != null && set.runningSince != null
                  ? { ...set.text, [set.runningKey]: String(Math.round(set.runningBase + (at - set.runningSince) / 1000)) }
                  : set.text;
              return { ...set, text, ticked: true, skipped: false, runningKey: null, runningSince: null, clockRan: true, completedAt: set.completedAt ?? at };
            }
            if (i !== targetIndex || set.touched || set.ticked) return set;
            const row = updated[i];
            return row ? writeOpen(set, fields, row) : set;
          })
        };
      }),
    );
    // Rest also follows an exercise's last set, unless the whole session is about to end.
    const lastBlock = !session || index + 1 >= session.blocks.length;
    if (block.restSeconds && (setIndex < block.sets - 1 || !lastBlock)) setRestUntil(Date.now() + block.restSeconds * 1000);
  }
  function advance(nextIndex: number) {
    setRestUntil(null);
    if (!session || nextIndex >= session.blocks.length) setPhase('fields');
    else setIndex(nextIndex);
  }
  async function finish() {
    if (!session || !type || busy) return;
    setBusy(true);
    setError('');
    try {
      const blocks = session.blocks.map((item, blockIndex) => {
        const draft = drafts[blockIndex];
        const itemFields = blockFields(type, item);
        const schemeId = item.scheme ? schemeById(item.scheme, detail?.schemes).id : schemeById(undefined, detail?.schemes).id;
        const rows = draft?.sets ?? [];
        const skippedBlock = !draft || draft.skipped;
        return {
          id: item.id,
          ...(item.exerciseId ? { exerciseId: item.exerciseId } : {}),
          ...(skippedBlock ? { skipped: true } : {}),
          sets: rows.map((set, setIndex) => {
            const skipped = skippedBlock || set.skipped || !set.ticked;
            const previous = rows.slice(0, setIndex).reverse().find(row => row.completedAt != null);
            const detailRow: SetDetail = buildSetDetail({
              status: skipped ? 'skipped' : 'done',
              plannedWeightKg: set.plannedWeight,
              plannedReps: set.plannedReps,
              plannedSeconds: set.plannedSeconds,
              schemeId,
              openedAt: set.startedAt,
              completedAt: set.completedAt,
              previousCompletedAt: previous?.completedAt ?? null,
              restPlannedSeconds: item.restSeconds ?? null,
              durationSeconds: skipped ? null : readOpen(itemFields, set, Date.now()).seconds,
              clockRan: set.clockRan,
              typedSeconds: set.typedSeconds,
              edited: set.edited
            });
            return {
              index: setIndex + 1,
              skipped,
              values: skipped ? {} : readValues(itemFields, set, Date.now()),
              detail: detailRow
            };
          })
        };
      });
      const sessionValues = readValues(type.sessionFields, { text: sessionText, checks: {}, skipped: false, ticked: false, touched: false, runningKey: null, runningSince: null, runningBase: 0, ...freshTiming }, Date.now());
      const saved = await logTraining({ sessionId: session.id, planDate, blocks, sessionValues });
      onSaved();
      if (saved.canPost) setPhase('post');
      else onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Saved on this phone. Tap Finish to try again.');
    } finally {
      setBusy(false);
    }
  }
  async function post() {
    if (!session || busy) return;
    setBusy(true);
    setError('');
    try {
      await postTraining(session.id, planDate, note);
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;
  const timedSet = drafts[index]?.sets.find(set => set.runningKey != null && set.runningSince != null);
  const sessionHold =
    timedSet && timedSet.runningKey && timedSet.runningSince != null
      ? {
          seconds: Math.floor(timedSet.runningBase + (now - timedSet.runningSince) / 1000),
          target: block?.targets?.[timedSet.runningKey]?.max ?? 0
        }
      : null;
  const draftSets = drafts[index]?.sets;
  const footer = runFooterState(
    (draftSets ?? []).map(set => ({
      ticked: set.ticked,
      skipped: set.skipped,
      running: set.runningKey != null
    })),
  );
  const ready = Boolean(draftSets) && footer.ready;
  const sourceExercise = detail?.session.blocks.find(item => item.id === block?.id)?.exerciseId;
  const swappedFromName =
    block?.exerciseId && sourceExercise && sourceExercise !== block.exerciseId ? (exercise(sourceExercise)?.name ?? sourceExercise) : null;
  const blockUntouched = !(drafts[index]?.sets.some(set => set.ticked) ?? false);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: inset.top }}>
      <CatalogBar title={session?.title ?? 'Session'} onBack={onClose} right={<SoundToggle />} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: (footerHeight || 260) + space.md }}>
        {error ? (
          <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
        {!session || !type || !block ? (
          <Skeleton shape="line" />
        ) : phase === 'post' ? (
          <View style={{ gap: space.ms }}>
            <Text variant="subhead" style={{ color: C.muted }}>Post that you finished, if you want. The numbers stay private.</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor={C.muted} accessibilityLabel="Note" style={{ minHeight: hit, color: C.text, fontSize: textRoles.callout.fontSize}} />
            <Action label="Post" onPress={() => void post()} />
            <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onClose} style={{ minHeight: hit, justifyContent: 'center' }}>
              <Text variant="callout" style={{ color: C.muted }}>Not now</Text>
            </Pressable>
          </View>
        ) : phase === 'fields' ? (
          <View style={{ gap: space.ms }}>
            {type.sessionFields.map(field => (
              <FieldInput key={field.key} field={field} text={sessionText[field.key] ?? ''} checked={false} onText={value => setSessionText(current => ({ ...current, [field.key]: value }))} onCheck={() => undefined} running={false} done={false} elapsed={0} onToggle={() => undefined} />
            ))}
            <Action label={busy ? 'Saving…' : 'Finish'} onPress={() => void finish()} />
          </View>
        ) : (
          <View style={{ gap: space.ms }}>
            {block.exerciseId && blockUntouched ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={customflow?.changes.swaps?.[block.id] ? 'Undo this swap' : 'Swap this exercise'}
                onPress={() => {
                  if (customflow?.changes.swaps?.[block.id]) {
                    void saveCustomflowSwap({ kind: 'qram-session', id: sessionId, version: null }, block.id, null).catch(reason =>
                      setError(reason instanceof Error ? reason.message : 'Try again.'),
                    );
                    return;
                  }
                  setSwapOpen(true);
                }}
                style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
              >
                <Text variant="subhead" style={{ color: C.muted }}>{customflow?.changes.swaps?.[block.id] ? 'Undo' : 'Swap'}</Text>
              </Pressable>
            ) : null}
            {swapNote ? <Text variant="subhead" style={{ color: C.muted }}>{swapNote}</Text> : null}
            <BlockHeader block={block} type={type} schemes={detail.schemes} swappedFrom={swappedFromName} />
            {extraPattern(block, detail, type) ? <Text variant="subhead" style={{ color: C.muted }}>{extraPattern(block, detail, type)}</Text> : null}
            {compactSets(fields) ? <SetHeader fields={fields} /> : null}
            {(
              drafts[index]?.sets.map((set, setIndex) => (
                <SetRow
                  key={setIndex}
                  set={set}
                  setIndex={setIndex}
                  fields={fields}
                  block={block}
                  detail={detail}
                  now={now}
                  onText={(key, value) =>
                    patchSet(setIndex, current => {
                      const duration = fields.find(field => field.input === 'duration' || fieldRole(field) === 'seconds');
                      return {
                        ...current,
                        touched: true,
                        text: { ...current.text, [key]: value },
                        typedSeconds: duration?.key === key ? true : current.typedSeconds,
                        edited: current.ticked ? true : current.edited
                      };
                    })
                  }
                  onCheck={key => patchSet(setIndex, current => ({ ...current, checks: { ...current.checks, [key]: !current.checks[key] } }))}
                  onToggle={key => {
                    const open = drafts[index]?.sets[setIndex];
                    // Stopping the clock is finishing the set: the time is logged and the rest begins.
                    if (open && open.runningKey === key && open.runningSince != null) {
                      tick(setIndex);
                      return;
                    }
                    if (open?.ticked || open?.skipped) return;
                    patchSet(setIndex, current => {
                      // The number shown before the clock first runs is the target, not time done: start from 0.
                      const base = current.clockRan ? (parseClock(current.text[key] ?? '') ?? 0) : 0;
                      const at = Date.now();
                      return { ...openTrainingSet(current, fields, at), runningKey: key, runningSince: at, runningBase: base, startedAt: at, clockRan: true };
                    });
                  }}
                  onTick={() => tick(setIndex)}
                  onSkip={() => patchSet(setIndex, current => markTrainingSkipped(current, fields, Date.now()))}
                />
              ))
            )}
            {block.exerciseId ? <FocusArea exerciseId={block.exerciseId} /> : null}
            {/* The safety note is said once, on the first exercise, not on every one. */}
            {session.note && index === 0 ? <Text variant="caption" style={{ color: C.muted }}>{session.note}</Text> : null}
          </View>
        )}
      </ScrollView>
      {session && type && block && phase !== 'post' && phase !== 'fields' ? (
        <RunFooter
          noun="Exercise"
          index={index}
          total={session.blocks.length}
          hold={sessionHold}
          restLeft={restLeft}
          onSkipRest={() => {
            setRestUntil(null);
            // Skipping the rest after the last set moves on, as the rest ending would.
            {
              const sets = drafts[index]?.sets ?? [];
              const dealtWith = sets.length > 0 && runFooterState(sets.map(set => ({ ticked: set.ticked, skipped: set.skipped, running: set.runningKey != null }))).ready;
              if (dealtWith && session && index + 1 < session.blocks.length) {
                advance(index + 1);
                return;
              }
            }
            if (type && block) {
              const at = Date.now();
              setDrafts(current =>
                current.map((item, itemIndex) => {
                  if (itemIndex !== index) return item;
                  const openIndex = item.sets.findIndex(set => !set.ticked && !set.skipped && set.startedAt == null);
                  if (openIndex < 0) return item;
                  return { ...item, sets: item.sets.map((set, setIndex) => (setIndex === openIndex ? openTrainingSet(set, fields, at) : set)) };
                }),
              );
            }
          }}
          ready={ready}
          hint={footer.hint || 'Finish or skip 1 more set'}
          onNext={() => advance(index + 1)}
          skipLabel={draftSets ? footer.skipLabel : 'Skip'}
          onSkip={() => {
            const currentSets = drafts[index]?.sets ?? [];
            const nowFooter = runFooterState(
              currentSets.map(set => ({
                ticked: set.ticked,
                skipped: set.skipped,
                running: set.runningKey != null
              })),
            );
            if (nowFooter.skipLabel === 'Skip') {
              const at = Date.now();
              setDrafts(current =>
                current.map((item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        skipped: true,
                        sets: item.sets.map(set => markTrainingSkipped({ ...set, runningKey: null, runningSince: null }, fields, at))
                      }
                    : item,
                ),
              );
              advance(index + 1);
              return;
            }
            const at = Date.now();
            setDrafts(current =>
              current.map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return {
                  ...item,
                  sets: item.sets.map(set => {
                    const open = set.runningKey != null || (!set.ticked && !set.skipped);
                    if (!open) return set;
                    return markTrainingSkipped(set, fields, at);
                  })
                };
              }),
            );
            advance(index + 1);
          }}
          bottom={inset.bottom + 8}
          onHeight={setFooterHeight}
        />
      ) : null}
      {session && block && phase !== 'post' && phase !== 'fields' ? (
        <RunCountdown
          key={`countdown-${block.id}`}
          name={block.label ?? (block.exerciseId ? exercise(block.exerciseId)?.name : undefined)}
          onDone={() => {
            const at = Date.now();
            // After 3, 2, 1 the first set is under way: a timed set's clock starts, so there's no second Start.
            const timer = fields.find(field => field.input === 'duration');
            setDrafts(current =>
              current.map((item, itemIndex) => {
                if (itemIndex !== index || !item.sets[0]) return item;
                return {
                  ...item,
                  sets: item.sets.map((set, setIndex) => {
                    if (setIndex !== 0) return set;
                    const opened = openTrainingSet(set, fields, at);
                    return timer && set.runningKey == null && !set.ticked && !set.skipped
                      ? { ...opened, runningKey: timer.key, runningSince: at, runningBase: 0, startedAt: at, clockRan: true }
                      : opened;
                  })
                };
              }),
            );
          }}
        />
      ) : null}
      {swapOpen && block?.exerciseId ? (
        <SwapChooser
          sourceId={block.exerciseId}
          library={library}
          onClose={() => setSwapOpen(false)}
          onChoose={async exerciseId => {
            await saveCustomflowSwap({ kind: 'qram-session', id: sessionId, version: null }, block.id, exerciseId);
            setSwapOpen(false);
          }}
          onView={() => setSwapOpen(false)}
        />
      ) : null}
    </View>
  );
}

function blockPattern(block: SessionBlock, detail: TrainingSessionDetail) {
  if (!block.scheme) return null;
  const scheme = schemeById(block.scheme, detail.schemes);
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  const records = detail.records.find(row => row.exerciseId === block.exerciseId)?.sets ?? null;
  return schemeLine(scheme, planBlock(move, blockTargetItem(block), scheme, records));
}

/** The set scheme's line, only when it says something the target line above doesn't (e.g. not the same reps twice). */
function extraPattern(block: SessionBlock, detail: TrainingSessionDetail, type: TrainingType) {
  const pattern = blockPattern(block, detail);
  if (!pattern) return null;
  const numbers = (text: string) => text.slice(text.indexOf(':') + 1).trim();
  const said = blockFields(type, block).map(field => targetLabel(field, block.targets?.[field.key], block.sets, block.scheme)).filter(Boolean) as string[];
  return said.some(label => numbers(label) === numbers(pattern)) ? null : pattern;
}

/** Sets of only number fields (weight and reps, say) show as a table: one row per set. */
function compactSets(fields: Field[]) {
  return fields.length > 0 && fields.length <= 3 && fields.every(field => field.input === 'number' || field.input === 'distance');
}

function fieldTitle(field: Field) {
  const unit = field.input === 'distance' ? 'm' : field.unit;
  return unit && unit.toLowerCase() !== field.label.toLowerCase() ? `${field.label} (${unit})` : field.label;
}

function SetHeader({ fields }: { fields: Field[] }) {
  const { colors: C } = useTheme();
  const style = { color: C.muted, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, marginTop: space.xs }}>
      <Text variant="caption" style={[style, { width: 32, textAlign: 'center' }]}>Set</Text>
      {fields.map(field => (
        <Text variant="caption" key={field.key} style={[style, { flex: 1, textAlign: 'center' }]}>
          {fieldTitle(field)}
        </Text>
      ))}
      <View style={{ width: 92 }} />
    </View>
  );
}

/** The member's own pace for this block, from their recent run; an invitation to add one if not. */
function RunPaceLine({ intensity }: { intensity: RunIntensity }) {
  const { colors: C } = useTheme();
  const metrics = usePersonalMetrics();
  const pace = runPace(metrics, intensity);
  return (
    <Text variant="subhead" style={{ color: pace ? C.lime : C.muted }}>
      {pace
        ? `If you're running: ${intensityShare[intensity].title.toLowerCase()} pace ${paceText(pace)}`
        : 'Add a recent run under Personalise to see your pace here.'}
    </Text>
  );
}

function BlockHeader({
  block,
  type,
  schemes,
  swappedFrom
}: {
  block: SessionBlock;
  type: TrainingType;
  schemes?: SetScheme[];
  swappedFrom?: string | null;
}) {
  const { colors: C } = useTheme();
  const [info, setInfo] = useState(false);
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  const fields = blockFields(type, block);
  const scheme = block.scheme ? schemeById(block.scheme, schemes) : null;
  const pictureName = move?.name ?? block.label ?? 'this exercise';
  return (
    <View style={{ gap: space.sm }}>
      {block.exerciseId ? (
        <ExercisePicture
          exerciseId={block.exerciseId}
          name={pictureName}
          onPress={() => {
            if (move) setInfo(true);
          }}
        />
      ) : null}
      {info && move ? <ExerciseHowToSheet item={move} scheme={scheme} onClose={() => setInfo(false)} /> : null}
      <Text variant="section" style={{ color: C.text }}>{block.label ?? move?.name ?? 'Block'}</Text>
      {swappedFrom ? <Text variant="subhead" style={{ color: C.muted }}>Swapped from {swappedFrom}</Text> : null}
      {block.intensity ? <RunPaceLine intensity={block.intensity} /> : null}
      {block.label && move ? <Text variant="subhead" style={{ color: C.muted }}>{move.name}</Text> : null}
      {fields.map(field => {
        const label = targetLabel(field, block.targets?.[field.key], block.sets, block.scheme);
        return label ? (
          <Text variant="subhead" key={field.key} style={{ color: C.muted }}>
            {label}
          </Text>
        ) : null;
      })}
    </View>
  );
}

function SetRow({
  set,
  setIndex,
  fields,
  block,
  detail,
  now,
  onText,
  onCheck,
  onToggle,
  onTick,
  onSkip
}: {
  set: DraftSet;
  setIndex: number;
  fields: Field[];
  block: SessionBlock;
  detail: TrainingSessionDetail | null;
  now: number;
  onText: (key: string, value: string) => void;
  onCheck: (key: string) => void;
  onToggle: (key: string) => void;
  onTick: () => void;
  onSkip: () => void;
}) {
  const { colors: C } = useTheme();
  const [editor, setEditor] = useState<{ key: string; typing: boolean } | null>(null);
  const endTyping = () => setEditor(current => (current?.typing ? null : current));
  const equipment = block.exerciseId ? exercise(block.exerciseId)?.equipment : undefined;
  const sheet = editor && !editor.typing ? (
    <WheelSheet
      title={`Set ${setIndex + 1}`}
      columns={fieldColumns(
        fields.filter(field => !(set.runningKey === field.key && field.input === 'duration')),
        set.text,
        onText,
        equipment,
      )}
      onDone={() => setEditor(null)}
      onClose={() => setEditor(null)}
      onType={() => setEditor(current => (current ? { key: current.key, typing: true } : current))}
    />
  ) : null;
  const lastLogged = detail?.last?.sets.find(row => row.blockId === block.id && row.setIndex === setIndex + 1)?.values ?? null;
  const record = detail?.records.find(row => row.exerciseId === block.exerciseId)?.sets[setIndex];
  const remembered: Record<string, LogValue> = { ...(lastLogged ?? {}) };
  const weight = fields.find(field => fieldRole(field) === 'weight');
  const reps = fields.find(field => fieldRole(field) === 'reps');
  if (weight && record?.weightKg != null && remembered[weight.key] == null) remembered[weight.key] = record.weightKg;
  if (reps && record?.reps != null && remembered[reps.key] == null) remembered[reps.key] = record.reps;
  const line = lastTimeLine(fields, remembered);
  const finished = set.ticked || set.skipped;
  const tickButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={set.ticked ? `Set ${setIndex + 1} done` : `Finish set ${setIndex + 1}`}
      onPress={onTick}
      style={{ width: hit, height: hit, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: set.ticked ? C.lime : 'transparent', borderWidth: set.ticked ? 0 : stroke.line, borderColor: C.line }}
    >
      <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={set.ticked ? C.onAccent : C.muted} size={20} />
    </Pressable>
  );
  const skipButton = (
    <Pressable accessibilityRole="button" accessibilityLabel={set.skipped ? `Set ${setIndex + 1} skipped` : `Skip set ${setIndex + 1}`} onPress={onSkip} disabled={finished} style={{ width: 40, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="footnote" style={{ color: C.muted }}>{set.skipped ? 'Skipped' : finished ? '' : 'Skip'}</Text>
    </Pressable>
  );
  if (compactSets(fields)) {
    return (
      <View style={{ gap: space.xxs, opacity: set.skipped ? 0.45 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
          <View style={{ width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }}>
            <Text variant="subhead" style={{ color: C.text, fontWeight: '600'}}>{setIndex + 1}</Text>
          </View>
          {fields.map(field => {
            const value = set.text[field.key] ?? '';
            if (!isWheelField(field)) {
              return (
                <TextInput
                  key={field.key}
                  value={value}
                  onChangeText={next => onText(field.key, next)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel={`Set ${setIndex + 1} ${fieldTitle(field)}`}
                  style={{ flex: 1, height: 44, borderRadius: radius.small, backgroundColor: C.card, color: set.ticked ? C.muted : C.text, fontSize: textRoles.headline.fontSize, fontWeight: '600', textAlign: 'center' }}
                />
              );
            }
            return (
              <WheelEntry
                key={field.key}
                value={value}
                focused={editor?.key === field.key}
                typing={editor?.key === field.key && editor.typing}
                onPress={() => setEditor({ key: field.key, typing: false })}
                onChangeText={next => onText(field.key, next)}
                onTypingEnd={endTyping}
                accessibilityLabel={adjustLabel(setIndex + 1, field.label.toLowerCase(), value, fieldUnit(field))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholderTextColor={C.muted}
                style={{ flex: 1, height: 44, borderRadius: radius.small, backgroundColor: C.card, color: set.ticked ? C.muted : C.text, fontSize: textRoles.headline.fontSize, fontWeight: '600', textAlign: 'center' }}
              />
            );
          })}
          {tickButton}
          {skipButton}
        </View>
        {line ? <Text variant="caption" style={{ color: C.muted, marginLeft: 42 }}>{line}</Text> : null}
        {sheet}
      </View>
    );
  }
  return (
    <View style={{ gap: space.ms, paddingVertical: space.ms, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, opacity: set.skipped ? 0.45 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
        <Text variant="callout" style={{ flex: 1, color: C.text, fontWeight: '600'}}>Set {setIndex + 1}</Text>
        {tickButton}
        {skipButton}
      </View>
      {line ? <Text variant="caption" style={{ color: C.muted }}>{line}</Text> : null}
      {fields.map(field => {
        const running = set.runningKey === field.key && set.runningSince != null;
        const elapsed = running && set.runningSince != null ? set.runningBase + (now - set.runningSince) / 1000 : parseClock(set.text[field.key] ?? '') ?? 0;
        return (
          <FieldInput
            key={field.key}
            field={field}
            text={running ? formatClock(elapsed) : (set.text[field.key] ?? '')}
            checked={Boolean(set.checks[field.key])}
            running={running}
            done={set.ticked || set.skipped}
            elapsed={elapsed}
            equipment={equipment}
            setIndex={setIndex}
            focused={editor?.key === field.key}
            typing={editor?.key === field.key && editor.typing}
            onOpen={isWheelField(field) ? () => setEditor({ key: field.key, typing: false }) : undefined}
            onTypingEnd={endTyping}
            onText={value => onText(field.key, value)}
            onCheck={() => onCheck(field.key)}
            onToggle={() => onToggle(field.key)}
          />
        );
      })}
      {sheet}
    </View>
  );
}

function FieldInput({
  field,
  text,
  checked,
  running,
  done,
  elapsed,
  equipment,
  setIndex,
  focused,
  typing,
  onOpen,
  onTypingEnd,
  onText,
  onCheck,
  onToggle
}: {
  field: Field;
  text: string;
  checked: boolean;
  running: boolean;
  /** The set is finished or skipped: its clock can't start again (the time can still be typed). */
  done: boolean;
  elapsed: number;
  equipment?: string;
  setIndex?: number;
  focused?: boolean;
  typing?: boolean;
  /** When set, the set row owns the wheel sheet for every field. */
  onOpen?: () => void;
  onTypingEnd?: () => void;
  onText: (value: string) => void;
  onCheck: () => void;
  onToggle: () => void;
}) {
  const { colors: C } = useTheme();
  const [ownedOpen, setOwnedOpen] = useState(false);
  const [ownedTyping, setOwnedTyping] = useState(false);
  const wheelable = isWheelField(field);
  const controlled = onOpen != null;
  const showTyping = controlled ? Boolean(typing) : ownedTyping;
  const showFocus = controlled ? Boolean(focused) : ownedOpen || ownedTyping;
  const boxStyle = { flex: 1, height: 48, paddingHorizontal: space.md, borderRadius: radius.small, backgroundColor: C.card, color: C.text, fontSize: textRoles.section.fontSize, fontWeight: '600' as const };
  const clockButton = field.input === 'duration' && !done ? (
    <Button
      title={running ? 'Done' : 'Start'}
      fit
      size="regular"
      accessibilityLabel={running ? `Finish the set, stopping ${field.label}` : `Start ${field.label}`}
      onPress={onToggle}
    />
  ) : null;
  if (field.input === 'check') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={field.label} onPress={onCheck} style={{ minHeight: hit, justifyContent: 'center' }}>
        <Text style={{ color: C.text }}>{checked ? '✓ ' : ''}{field.label}</Text>
      </Pressable>
    );
  }
  if (field.input === 'rating') {
    return (
      <View style={{ gap: space.xs }}>
        <Text style={{ color: C.muted }}>{field.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {Array.from({ length: 10 }, (_, index) => (
            <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${field.label} ${index + 1}`} onPress={() => onText(String(index + 1))} style={{ minWidth: 32, minHeight: hit, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, backgroundColor: text === String(index + 1) ? C.lime : C.card }}>
              <Text style={{ color: text === String(index + 1) ? C.onAccent : C.text }}>{index + 1}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  const caption = field.input === 'duration' ? field.label : fieldTitle(field);
  if (field.input === 'duration' && running) {
    return (
      <View style={{ gap: space.sm }}>
        <Text variant="footnote" style={{ color: C.muted }}>{caption}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <View accessible accessibilityLabel={field.label} style={{ flex: 1, height: 48, paddingHorizontal: space.md, borderRadius: radius.small, backgroundColor: C.card, justifyContent: 'center' }}>
            <Text variant="section" numeric style={{ color: C.text }}>{formatClock(elapsed)}</Text>
          </View>
          {clockButton}
        </View>
      </View>
    );
  }
  if (!wheelable) {
    return (
      <View style={{ gap: space.sm }}>
        <Text variant="footnote" style={{ color: C.muted }}>{caption}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <TextInput value={text} onChangeText={onText} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={field.label} style={boxStyle} />
          {clockButton}
        </View>
      </View>
    );
  }
  const unit = fieldUnit(field);
  const name = field.label.toLowerCase();
  const shown = text.trim();
  const detail = !shown || !unit || shown.includes(':') || unit.toLowerCase() === name ? shown : `${shown} ${unit}`;
  const label = setIndex == null
    ? (detail ? `${field.label}, ${detail}, adjust` : `${field.label}, adjust`)
    : adjustLabel(setIndex + 1, name, text, unit);
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>{caption}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <WheelEntry
          value={text}
          focused={showFocus}
          typing={showTyping}
          onPress={() => {
            if (controlled) onOpen?.();
            else {
              setOwnedTyping(false);
              setOwnedOpen(true);
            }
          }}
          onChangeText={onText}
          onTypingEnd={() => {
            setOwnedTyping(false);
            setOwnedOpen(false);
            onTypingEnd?.();
          }}
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholderTextColor={C.muted}
          style={boxStyle}
        />
        {clockButton}
      </View>
      {!controlled && ownedOpen && !ownedTyping ? (
        <WheelSheet
          title={setIndex == null ? field.label : `Set ${setIndex + 1}`}
          columns={fieldColumns([field], { [field.key]: text }, (_key, value) => onText(value), equipment)}
          onDone={() => setOwnedOpen(false)}
          onClose={() => setOwnedOpen(false)}
          onType={() => {
            setOwnedOpen(false);
            setOwnedTyping(true);
          }}
        />
      ) : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button title={label} onPress={onPress} />;
}

export function TrainingSessionHost({ library }: { library: HabitFlow[] }) {
  const [opened, setOpened] = useTrainingSessionPane();
  const [, setTick] = useTrainingTick();
  if (!opened) return null;
  // Full screen like a flow run, over the tab bar, so the footer sits on the screen's bottom edge.
  return (
    <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={() => setOpened(null)}>
        <TrainingSession
          sessionId={opened.id}
          planDate={opened.date}
          library={library}
          onClose={() => setOpened(null)}
          onSaved={() => setTick(value => value + 1)}
        />
    </DetailSurface>
  );
}
