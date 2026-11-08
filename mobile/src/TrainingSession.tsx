import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { exercise } from '../../shared/exercises';
import { estimateStart, loadStrength } from './strength';
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
  type TrainingType,
} from '../../shared/training';
import { nextSetAfterTick, planBlock, registerSchemes, schemeById, schemeLine, type SetScheme } from '../../shared/set-schemes';
import { buildSetDetail, setsForProgression, type SetDetail } from '../../shared/set-detail';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
  edited: false,
};

type DraftBlock = { id: string; skipped: boolean; sets: DraftSet[] };

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
    touched: set.touched,
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
    startedAt: set.startedAt ?? at,
  };
}

function markTrainingSkipped(set: DraftSet, fields: Field[], at: number): DraftSet {
  if (set.ticked) return set;
  const opened = openTrainingSet(set, fields, at);
  return { ...opened, skipped: true, ticked: false, runningKey: null, runningSince: null, completedAt: set.completedAt ?? at };
}

function draftsFrom(detail: TrainingSessionDetail): DraftBlock[] {
  return detail.session.blocks.map(block => {
    const fields = blockFields(detail.type, block);
    const records = setsForProgression(detail.records.find(row => row.exerciseId === block.exerciseId)?.sets ?? null);
    // Never done before: start from our estimate of the member's strength, when we have one.
    const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
    const start = !records.length && move ? (estimateStart(move, blockTargetItem(block))?.weightKg ?? null) : null;
    return {
      id: block.id,
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
      }),
    };
  });
}

export function TrainingSession({
  sessionId,
  planDate,
  onClose,
  onSaved,
}: {
  sessionId: string;
  planDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors: C } = useTheme();
  useTrainingSchemes();
  const inset = useSafeAreaInsets();
  const [detail, setDetail] = useState<TrainingSessionDetail | null>(null);
  const [drafts, setDrafts] = useState<DraftBlock[]>([]);
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
    trainingSession(sessionId)
      .then(result => {
        if (result.schemes) registerSchemes(result.schemes);
        if (!live) return;
        setDetail(result);
        setDrafts(draftsFrom(result));
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
  const session = detail?.session;
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
            if (i === setIndex) return { ...set, ticked: true, skipped: false, runningKey: null, runningSince: null, completedAt: set.completedAt ?? at };
            if (i !== targetIndex || set.touched || set.ticked) return set;
            const row = updated[i];
            return row ? writeOpen(set, fields, row) : set;
          }),
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
              edited: set.edited,
            });
            return {
              index: setIndex + 1,
              skipped,
              values: skipped ? {} : readValues(itemFields, set, Date.now()),
              detail: detailRow,
            };
          }),
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
          target: block?.targets?.[timedSet.runningKey]?.max ?? 0,
        }
      : null;
  const draftSets = drafts[index]?.sets;
  const footer = runFooterState(
    (draftSets ?? []).map(set => ({
      ticked: set.ticked,
      skipped: set.skipped,
      running: set.runningKey != null,
    })),
  );
  const ready = Boolean(draftSets) && footer.ready;
  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40, backgroundColor: C.bg, paddingTop: inset.top }}>
      <CatalogBar title={session?.title ?? 'Session'} onBack={onClose} right={<SoundToggle />} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 260 + inset.bottom + 72 }}>
        {error ? (
          <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 15 }}>
            {error}
          </Text>
        ) : null}
        {!session || !type || !block ? (
          <Text style={{ color: C.muted }}>Loading…</Text>
        ) : phase === 'post' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: C.muted, fontSize: 15 }}>Post that you finished, if you want. The numbers stay private.</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor={C.muted} accessibilityLabel="Note" style={{ minHeight: 44, color: C.text, fontSize: 16 }} />
            <Action label="Post" onPress={() => void post()} />
            <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onClose} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: C.muted, fontSize: 16 }}>Not now</Text>
            </Pressable>
          </View>
        ) : phase === 'fields' ? (
          <View style={{ gap: 12 }}>
            {type.sessionFields.map(field => (
              <FieldInput key={field.key} field={field} text={sessionText[field.key] ?? ''} checked={false} onText={value => setSessionText(current => ({ ...current, [field.key]: value }))} onCheck={() => undefined} running={false} elapsed={0} onToggle={() => undefined} />
            ))}
            <Action label={busy ? 'Saving…' : 'Finish'} onPress={() => void finish()} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <BlockHeader block={block} type={type} schemes={detail.schemes} />
            {session.note ? <Text style={{ color: C.muted, fontSize: 14 }}>{session.note}</Text> : null}
            {blockPattern(block, detail) ? <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{blockPattern(block, detail)}</Text> : null}
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
                        edited: current.ticked ? true : current.edited,
                      };
                    })
                  }
                  onCheck={key => patchSet(setIndex, current => ({ ...current, checks: { ...current.checks, [key]: !current.checks[key] } }))}
                  onToggle={key =>
                    patchSet(setIndex, current => {
                      if (current.runningKey === key && current.runningSince != null) {
                        const elapsed = Math.round(current.runningBase + (Date.now() - current.runningSince) / 1000);
                        return { ...current, runningKey: null, runningSince: null, clockRan: true, typedSeconds: false, text: { ...current.text, [key]: String(elapsed) } };
                      }
                      const base = parseClock(current.text[key] ?? '') ?? 0;
                      const at = Date.now();
                      return { ...openTrainingSet(current, fields, at), runningKey: key, runningSince: at, runningBase: base, startedAt: at, clockRan: true };
                    })
                  }
                  onTick={() => tick(setIndex)}
                  onSkip={() => patchSet(setIndex, current => markTrainingSkipped(current, fields, Date.now()))}
                />
              ))
            )}
            {block.exerciseId ? <FocusArea exerciseId={block.exerciseId} /> : null}
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
                running: set.runningKey != null,
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
                        sets: item.sets.map(set => markTrainingSkipped({ ...set, runningKey: null, runningSince: null }, fields, at)),
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
                  }),
                };
              }),
            );
            advance(index + 1);
          }}
          bottom={inset.bottom + 72}
        />
      ) : null}
      {session && block && phase !== 'post' && phase !== 'fields' ? (
        <RunCountdown
          key={`countdown-${block.id}`}
          name={block.label ?? (block.exerciseId ? exercise(block.exerciseId)?.name : undefined)}
          onDone={() => {
            const at = Date.now();
            setDrafts(current =>
              current.map((item, itemIndex) => {
                if (itemIndex !== index || !item.sets[0]) return item;
                return { ...item, sets: item.sets.map((set, setIndex) => (setIndex === 0 ? openTrainingSet(set, fields, at) : set)) };
              }),
            );
          }}
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

function BlockHeader({ block, type, schemes }: { block: SessionBlock; type: TrainingType; schemes?: SetScheme[] }) {
  const { colors: C } = useTheme();
  const [info, setInfo] = useState(false);
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  const fields = blockFields(type, block);
  const scheme = block.scheme ? schemeById(block.scheme, schemes) : null;
  const pictureName = move?.name ?? block.label ?? 'this exercise';
  return (
    <View style={{ gap: 8 }}>
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
      <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>{block.label ?? move?.name ?? 'Block'}</Text>
      {block.label && move ? <Text style={{ color: C.muted, fontSize: 14 }}>{move.name}</Text> : null}
      {fields.map(field => {
        const label = targetLabel(field, block.targets?.[field.key], block.sets, block.scheme);
        return label ? (
          <Text key={field.key} style={{ color: C.muted, fontSize: 14 }}>
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
  onSkip,
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
  const lastLogged = detail?.last?.sets.find(row => row.blockId === block.id && row.setIndex === setIndex + 1)?.values ?? null;
  const record = detail?.records.find(row => row.exerciseId === block.exerciseId)?.sets[setIndex];
  const remembered: Record<string, LogValue> = { ...(lastLogged ?? {}) };
  const weight = fields.find(field => fieldRole(field) === 'weight');
  const reps = fields.find(field => fieldRole(field) === 'reps');
  if (weight && record?.weightKg != null && remembered[weight.key] == null) remembered[weight.key] = record.weightKg;
  if (reps && record?.reps != null && remembered[reps.key] == null) remembered[reps.key] = record.reps;
  const line = lastTimeLine(fields, remembered);
  return (
    <View style={{ gap: 8, paddingVertical: 8, borderTopWidth: 0.5, borderColor: C.line }}>
      <Text style={{ color: C.text, fontWeight: '600' }}>Set {setIndex + 1}</Text>
      {line ? <Text style={{ color: C.muted, fontSize: 13 }}>{line}</Text> : null}
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
            elapsed={elapsed}
            onText={value => onText(field.key, value)}
            onCheck={() => onCheck(field.key)}
            onToggle={() => onToggle(field.key)}
          />
        );
      })}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Finish set ${setIndex + 1}`} onPress={onTick} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: set.ticked ? C.lime : C.text, fontWeight: '700' }}>{set.ticked ? '✓' : 'Tick'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Skip set ${setIndex + 1}`} onPress={onSkip} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: C.muted }}>{set.skipped ? 'Skipped' : 'Skip set'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FieldInput({
  field,
  text,
  checked,
  running,
  elapsed,
  onText,
  onCheck,
  onToggle,
}: {
  field: Field;
  text: string;
  checked: boolean;
  running: boolean;
  elapsed: number;
  onText: (value: string) => void;
  onCheck: () => void;
  onToggle: () => void;
}) {
  const { colors: C } = useTheme();
  if (field.input === 'check') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={field.label} onPress={onCheck} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: C.text }}>{checked ? '✓ ' : ''}{field.label}</Text>
      </Pressable>
    );
  }
  if (field.input === 'rating') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={{ color: C.muted }}>{field.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 10 }, (_, index) => (
            <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${field.label} ${index + 1}`} onPress={() => onText(String(index + 1))} style={{ minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: text === String(index + 1) ? C.lime : C.card }}>
              <Text style={{ color: text === String(index + 1) ? C.onAccent : C.text }}>{index + 1}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  const unit = field.input === 'duration' ? formatClock(elapsed || parseClock(text) || 0) : field.input === 'distance' ? (Number(text) >= 1000 ? `${Math.round((Number(text) / 1000) * 10) / 10} km` : 'm') : (field.unit ?? '');
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: C.muted }}>{field.label}{unit ? ` · ${unit}` : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={field.input === 'duration' && running ? formatClock(elapsed) : text}
          onChangeText={onText}
          keyboardType="decimal-pad"
          editable={!running}
          accessibilityLabel={field.label}
          style={{ flex: 1, minHeight: 44, color: C.text, fontSize: 18 }}
        />
        {field.input === 'duration' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={running ? `Stop ${field.label}` : `Start ${field.label}`} onPress={onToggle} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.lime }}>
            <Text style={{ color: C.onAccent, fontWeight: '700' }}>{running ? 'Stop' : 'Start'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: C } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: C.lime }}>
      <Text style={{ color: C.onAccent, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function TrainingSessionHost() {
  const [opened, setOpened] = useTrainingSessionPane();
  const [, setTick] = useTrainingTick();
  if (!opened) return null;
  return <TrainingSession sessionId={opened.id} planDate={opened.date} onClose={() => setOpened(null)} onSaved={() => setTick(value => value + 1)} />;
}
