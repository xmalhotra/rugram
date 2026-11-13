import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { flows as catalogFlows } from '../../shared/mobile';
import type { HabitFlow } from '../../shared/mobile';
import { exercise } from '../../shared/exercises';
import { flowMuscleMap } from '../../shared/muscle-map';
import { blockFields, targetLabel, type PlanItem, type TrainingSession } from '../../shared/training';
import { localDate } from '../../shared/flow-habits';
import { Text } from './design/Text';
import { Button, SectionHeader } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, size, space, stroke, useTheme } from './design/theme';
import { CatalogBar } from './FlowCatalogTile';
import { useRootListInset } from './RootList';
import { BodyMap } from './BodyMap';
import { ExerciseVisual } from './ExerciseVisual';
import { DayEditor } from './TrainingWeek';
import { registerSchemes } from '../../shared/set-schemes';
import { adoptTrainingPlan, setTrainingDay, trainingPlan, trainingPlans, trainingSession, trainingWeek, useTrainingSchemes, type TrainingPlanSummary, type WeekDay } from './training-api';
import { useTrainingRoute, useTrainingSessionPane } from './training-route';
import { applyCustomflow } from '../../shared/customflows';
import { isCustomOrder } from '../../shared/item-order';
import { DragList } from './DragList';
import { saveCustomflowOrder, useCustomflow } from './customflows';
import { EquipmentCheck } from './EquipmentCheck';

export function WeeklyPlanSection({ onOpen, onBuild, heading = true }: { onOpen: (id: string) => void; onBuild: () => void; heading?: boolean }) {
  const { colors: C } = useTheme();
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([]);
  useEffect(() => {
    let live = true;
    trainingPlans()
      .then(result => {
        if (live) setPlans(result.plans);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return (
    <View style={{ gap: space.ms }}>
      {heading ? <SectionHeader title="Weekly Plans" /> : null}
      {plans.map(plan => (
        <Pressable key={plan.id} accessibilityRole="button" accessibilityLabel={plan.title} onPress={() => onOpen(plan.id)} style={{ minHeight: hit, justifyContent: 'center' }}>
          <Text variant="headline" style={{ color: C.text }}>{plan.title}</Text>
          <Text variant="subhead" style={{ color: C.muted }}>{plan.goal}</Text>
        </Pressable>
      ))}
      <Button variant="text" size="regular" title="Build your own week" accessibilityLabel="Build your own week" onPress={onBuild} />
    </View>
  );
}

const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const planLength = (weeks: number) => (weeks === 1 ? 'Repeats every week' : `A ${weeks}-week plan that repeats`);

/** What a session holds, in words. */
function sessionSize(session: TrainingSession) {
  const moves = session.blocks.filter(block => block.exerciseId).length;
  if (moves > 0) return `${moves} ${moves === 1 ? 'exercise' : 'exercises'}`;
  return `${session.blocks.length} ${session.blocks.length === 1 ? 'part' : 'parts'}`;
}

function PlanRow({ title, detail, exerciseId, label, onPress }: { title: string; detail?: string; exerciseId?: string; label: string; onPress: () => void }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: size.button, flexDirection: 'row', alignItems: 'center', gap: space.ms, opacity: pressed ? opacity.pressed : 1 })}
    >
      <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
        <ExerciseVisual exerciseId={exerciseId} cover />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} variant="callout" style={{ color: C.text, fontWeight: '600' }}>
          {title}
        </Text>
        {detail ? <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text> : null}
      </View>
      <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.text} size={space.lg} />
    </Pressable>
  );
}

export function TrainingPlanPage({ id, flows, onBack, onSession, onStartFlow }: { id: string; flows: HabitFlow[]; onBack: () => void; onSession: (id: string) => void; onStartFlow: (flow: HabitFlow) => void }) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const todayWeekday = ((new Date().getDay() + 6) % 7) + 1;
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof trainingPlan>> | null>(null);
  const [active, setActive] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    trainingPlan(id)
      .then(result => {
        if (live) setLoaded(result);
      })
      .catch(reason => {
        if (live) setError(reason instanceof Error ? reason.message : 'Try again.');
      });
    trainingWeek(localDate(new Date()))
      .then(result => {
        if (live) setActive(result.active);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id]);
  const plan = loaded?.plan;
  function apply() {
    const run = () => {
      void adoptTrainingPlan(id, localDate(new Date()))
        .then(() => {
          setActive(true);
          setAdopted(true);
        })
        .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
    };
    if (active) Alert.alert('Use this plan?', 'This replaces the week you are on.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Use this plan', onPress: run }]);
    else run();
  }
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title={plan?.title ?? 'Plan'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128, gap: space.md }}>
        {plan ? (
          <View style={{ gap: space.xs }}>
            <Text variant="callout" style={{ color: C.text }}>{plan.goal}</Text>
            <Text variant="subhead" style={{ color: C.muted }}>{planLength(plan.weeks)}. Tap a day to see what's in it.</Text>
          </View>
        ) : null}
        <View>
          {plan?.slots
            .slice()
            .sort((a, b) => a.week - b.week || a.weekday - b.weekday)
            .map(slot => {
              const isToday = plan.weeks === 1 && slot.weekday === todayWeekday;
              return (
                <View
                  key={`${slot.week}-${slot.weekday}`}
                  style={{ flexDirection: 'row', gap: space.ms, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
                >
                  <View style={{ width: 44, minHeight: 56, justifyContent: 'center' }}>
                    {plan.weeks > 1 ? <Text variant="caption" style={{ color: C.muted }}>Wk {slot.week}</Text> : null}
                    <Text
                      accessibilityLabel={dayName[slot.weekday - 1]}
                      variant="footnote"
                      style={{ color: isToday ? C.lime : C.muted, fontWeight: '600' }}
                    >
                      {dayName[slot.weekday - 1].slice(0, 3)}
                    </Text>
                    {isToday ? <Text variant="caption" style={{ color: C.lime }}>Today</Text> : null}
                  </View>
                  <View style={{ flex: 1, gap: space.xs, justifyContent: 'center' }}>
                    {slot.items.map((item, index) => (
                      <PlanItemRow key={`${item.kind}-${index}`} item={item} sessions={loaded?.sessions ?? []} flows={flows} onSession={onSession} onStartFlow={onStartFlow} />
                    ))}
                  </View>
                </View>
              );
            })}
        </View>
        {adopted ? (
          <View style={{ gap: space.xs, alignItems: 'center' }}>
            <Text accessibilityRole="alert" variant="headline" style={{ color: C.lime }}>
              ✓ This is now your week
            </Text>
            <Text variant="subhead" style={{ color: C.muted, textAlign: 'center' }}>Find today's session in Home, Yours, Daily.</Text>
          </View>
        ) : plan ? (
          <View style={{ gap: space.sm }}>
            <Button title="Use this plan" accessibilityLabel="Use this plan" onPress={apply} />
            <Text variant="subhead" style={{ color: C.muted, textAlign: 'center' }}>
              Puts these on your Daily. You can change any day.
            </Text>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PlanItemRow({
  item,
  sessions,
  flows,
  onSession,
  onStartFlow,
}: {
  item: PlanItem;
  sessions: TrainingSession[];
  flows: HabitFlow[];
  onSession: (id: string) => void;
  onStartFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  if (item.kind === 'rest') return <Text variant="callout" style={{ color: C.muted }}>{item.label ?? 'Rest'}</Text>;
  if (item.kind === 'session') {
    const session = sessions.find(row => row.id === item.id);
    const title = session?.title ?? 'Session';
    return (
      <PlanRow
        title={title}
        detail={session ? `${sessionSize(session)}${item.optional ? ' · optional' : ''}` : undefined}
        exerciseId={session?.blocks.find(block => block.exerciseId)?.exerciseId}
        label={`Open ${title}`}
        onPress={() => onSession(item.id)}
      />
    );
  }
  const flow = flows.find(row => row.id === item.id) ?? catalogFlows.find(row => row.id === item.id);
  const flowTitle = flow?.title ?? 'Flow';
  return <PlanRow title={flowTitle} label={`Open ${flowTitle}`} onPress={() => flow && onStartFlow(flow)} />;
}

export function TrainingSessionPreview({ id, library, onBack }: { id: string; library: HabitFlow[]; onBack: () => void }) {
  const { colors: C } = useTheme();
  useTrainingSchemes();
  const inset = useRootListInset();
  const [, setSession] = useTrainingSessionPane();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof trainingSession>> | null>(null);
  const [choosingDay, setChoosingDay] = useState(false);
  const [weekNote, setWeekNote] = useState('');
  const [weekError, setWeekError] = useState('');
  useEffect(() => {
    let live = true;
    trainingSession(id)
      .then(result => {
        if (result.schemes) registerSchemes(result.schemes);
        if (live) setDetail(result);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id]);
  async function addToWeek(weekday: number, name: string) {
    if (!detail) return;
    setWeekError('');
    try {
      const week = await trainingWeek(localDate(new Date()));
      const day = week.days.find(item => item.weekday === weekday);
      if (!day) return;
      const items: PlanItem[] = [];
      for (const item of day.items) {
        if (item.kind === 'rest') items.push({ kind: 'rest', ...(item.label ? { label: item.label } : {}) });
        else if (item.id && (item.kind === 'session' || item.kind === 'flow'))
          items.push({ kind: item.kind, id: item.id, ...(item.optional ? { optional: true } : {}) });
      }
      if (!items.some(item => item.kind === 'session' && item.id === detail.session.id))
        items.push({ kind: 'session', id: detail.session.id });
      await setTrainingDay({ week: day.week, weekday, items, startDate: localDate(new Date()) });
      setWeekNote(`Added to ${name}.`);
      setChoosingDay(false);
    } catch (reason) {
      setWeekError(reason instanceof Error ? reason.message : 'Try again.');
    }
  }
  const session = detail?.session;
  const type = detail?.type;
  const customflow = useCustomflow('qram-session', session?.id);
  const [dragging, setDragging] = useState(false);
  const [equipment, setEquipment] = useState(false);
  const [orderError, setOrderError] = useState('');
  // As the member's Customflow when they've customised this session; blocks they haven't placed keep the catalog order at the end.
  const blocks = session ? applyCustomflow(session.blocks, customflow, block => block.id) : [];
  const customOrder = Boolean(
    session && customflow?.changes.order?.length && isCustomOrder(session.blocks.map(block => block.id), customflow.changes.order),
  );
  const canSwap = Boolean(session?.blocks.some(block => block.exerciseId));
  function reorder(keys: string[] | null) {
    if (!session) return;
    setOrderError('');
    const source = { kind: 'qram-session' as const, id: session.id, version: null };
    // Dragging back to the original order clears it, rather than saving a copy of the original.
    const save = keys && isCustomOrder(session.blocks.map(block => block.id), keys) ? saveCustomflowOrder(source, keys) : saveCustomflowOrder(source, null);
    void save.catch(() => setOrderError('Could not save the new order. Try again.'));
  }
  const ids = blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : []));
  const map = flowMuscleMap(ids);
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title={session?.title ?? 'Session'} onBack={onBack} />
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128, gap: space.md }}
      >
        {session ? <Text variant="callout" style={{ color: C.text }}>{session.goal}</Text> : null}
        {customflow ? <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>Customised</Text> : null}
        {map.main.length || map.helpers.length ? (
          <View style={{ alignItems: 'center' }}>
            <BodyMap main={map.main} helpers={map.helpers} width={180} />
          </View>
        ) : null}
        {session?.note ? <Text variant="subhead" style={{ color: C.muted }}>{session.note}</Text> : null}
        {canSwap && session ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Missing something? Swap an exercise"
            onPress={() => setEquipment(true)}
            style={({ pressed }) => ({
              minHeight: hit,
              borderRadius: radius.control,
              borderWidth: stroke.line,
              borderColor: C.line,
              backgroundColor: C.card,
              paddingHorizontal: space.md,
              paddingVertical: space.ms,
              justifyContent: 'center',
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>Equipment check</Text>
            <Text variant="footnote" style={{ color: C.muted }}>Missing something? Swap an exercise</Text>
          </Pressable>
        ) : null}
        {equipment && session ? (
          <EquipmentCheck
            source={{ kind: 'qram-session', id: session.id, version: null }}
            rows={session.blocks.flatMap(block => (block.exerciseId ? [{ key: block.id, exerciseId: block.exerciseId }] : []))}
            library={library}
            onClose={() => setEquipment(false)}
            onView={() => setEquipment(false)}
          />
        ) : null}
        {session && type ? (
          <DragList
            items={blocks}
            keyOf={block => block.id}
            labelOf={block => block.label ?? (block.exerciseId ? exercise(block.exerciseId)?.name : undefined) ?? 'this block'}
            onDragging={setDragging}
            onReorder={next => reorder(next.map(block => block.id))}
            renderItem={(block, index) => {
              const fields = blockFields(type, block);
              const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
              const labels = fields.map(field => targetLabel(field, block.targets?.[field.key], block.sets, block.scheme)).filter(Boolean);
              const title = block.label ?? move?.name ?? `Block ${index + 1}`;
              const sourceExercise = session.blocks.find(item => item.id === block.id)?.exerciseId;
              const swapped =
                sourceExercise && block.exerciseId && sourceExercise !== block.exerciseId
                  ? (exercise(sourceExercise)?.name ?? sourceExercise)
                  : null;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, paddingVertical: space.sm }}>
                  <View style={{ width: 56, height: 56, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
                    <ExerciseVisual exerciseId={block.exerciseId} cover />
                  </View>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{title}</Text>
                    {block.label && move ? <Text variant="footnote" style={{ color: C.muted }}>{move.name}</Text> : null}
                    {swapped ? <Text variant="footnote" style={{ color: C.muted }}>Swapped from {swapped}</Text> : null}
                    {labels.map(label => (
                      <Text key={label} variant="subhead" style={{ color: C.muted }}>
                        {label}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            }}
          />
        ) : null}
        {customOrder || orderError ? (
          <View style={{ gap: space.xs }}>
            {orderError ? <Text variant="subhead" style={{ color: C.danger }}>{orderError}</Text> : null}
            {customOrder ? (
              <Text variant="subhead" style={{ color: C.muted }}>Customflow: you changed the order.</Text>
            ) : null}
            {customOrder ? (
              <Button
                variant="text"
                size="regular"
                title="Back to the original"
                accessibilityLabel="Back to the original order"
                onPress={() => reorder(null)}
              />
            ) : null}
          </View>
        ) : null}
        {session ? (
          <View style={{ gap: space.ms }}>
            <Button
              title="Start this session"
              accessibilityLabel="Start this session"
              onPress={() => setSession({ id: session.id, date: localDate(new Date()) })}
            />
            <Button
              variant="text"
              size="regular"
              title="Add to my week"
              accessibilityLabel="Add to my week"
              onPress={() => setChoosingDay(value => !value)}
            />
            {choosingDay ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {dayName.map((name, index) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${name}`}
                    onPress={() => void addToWeek(index + 1, name)}
                    style={{ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.sm }}
                  >
                    <Text variant="subhead" style={{ color: C.text }}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {weekNote ? <Text variant="subhead" style={{ color: C.muted }}>{weekNote}</Text> : null}
            {weekError ? (
              <Text accessibilityRole="alert" style={{ color: C.danger }}>
                {weekError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function BuildWeekPage({ flows, onBack }: { flows: HabitFlow[]; onBack: () => void }) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [days, setDays] = useState<WeekDay[]>([]);
  const [open, setOpen] = useState<WeekDay | null>(null);
  const [error, setError] = useState('');
  function load() {
    trainingWeek(localDate(new Date()))
      .then(result => setDays(result.days))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
  }
  useEffect(load, []);
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title="Your week" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128, gap: space.ms }}>
        {days.map(day => (
          <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`Change ${dayName[day.weekday - 1]}`} onPress={() => setOpen(day)} style={{ minHeight: hit, justifyContent: 'center' }}>
            <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{dayName[day.weekday - 1]}</Text>
            <Text variant="subhead" style={{ color: C.muted }}>{day.items.map(item => item.title || item.label).filter(Boolean).join(', ') || 'Empty'}</Text>
          </Pressable>
        ))}
        {open ? (
          <DayEditor
            day={open}
            flows={flows}
            onClose={() => setOpen(null)}
            onSave={items => {
              void setTrainingDay({ week: open.week, weekday: open.weekday, items, startDate: localDate(new Date()) })
                .then(() => {
                  setOpen(null);
                  load();
                })
                .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
            }}
          />
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function TrainingRoutes({
  flows,
  onStartFlow,
}: {
  flows: HabitFlow[];
  onStartFlow: (flow: HabitFlow) => void;
}) {
  const [route, setRoute] = useTrainingRoute();
  if (route.page === 'plan')
    return (
      <TrainingPlanPage
        id={route.id}
        flows={flows}
        onBack={() => setRoute({ page: 'plans' })}
        onSession={id => setRoute({ page: 'session', id, planId: route.id })}
        onStartFlow={onStartFlow}
      />
    );
  if (route.page === 'session')
    return (
      <TrainingSessionPreview
        id={route.id}
        library={flows}
        onBack={() => setRoute(route.planId ? { page: 'plan', id: route.planId } : { page: 'plans' })}
      />
    );
  if (route.page === 'build') return <BuildWeekPage flows={flows} onBack={() => setRoute({ page: 'home' })} />;
  if (route.page === 'plans')
    return (
      <PlansIndex
        onBack={() => setRoute({ page: 'home' })}
        onOpen={id => setRoute({ page: 'plan', id })}
        onBuild={() => setRoute({ page: 'build' })}
      />
    );
  return null;
}

function PlansIndex({ onBack, onOpen, onBuild }: { onBack: () => void; onOpen: (id: string) => void; onBuild: () => void }) {
  const inset = useRootListInset();
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title="Weekly Plans" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128 }}>
        <WeeklyPlanSection heading={false} onOpen={onOpen} onBuild={onBuild} />
      </ScrollView>
    </View>
  );
}
