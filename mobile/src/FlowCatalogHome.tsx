import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import {
  catalogFlow,
  catalogFlowLine,
  catalogRoots,
  catalogTile,
  sectionsInRoot,
  tilesInSection,
} from '../../shared/flow-catalog';
import { Text } from './design/Text';
import { Button, SectionHeader } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, size, space, stroke, useTheme } from './design/theme';
import { useToast } from './design/states';
import { usePaneState } from './pane-state';
import { useRootListInset } from './RootList';
import { CatalogCover, CatalogSectionCover } from './CatalogCover';
import { CatalogBar, FlowCatalogTile } from './FlowCatalogTile';
import { ExerciseCatalog, ExercisePage } from './ExerciseCatalog';
import { RequestedFlows } from './RequestedFlows';
import { PersonalisePage, PersonaliseRow } from './PersonaliseFlows';
import { FlowIllustration } from './FlowIllustration';
import { liveFlowId } from './catalog-live';
import { routineCheckpoints, type RoutineCheckpoint } from '../../shared/routines';
import { RoutineCheckpointCover, RoutineCheckpointPage, RoutineDetailPage, RoutineSearchPage } from './RoutineCatalog';
import { emptyRoutineRoute, checkpointRoute, type RoutineRoute } from './routine-route';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { exercise } from '../../shared/exercises';
import { flowMuscleMap, muscleAreas } from '../../shared/muscle-map';
import { BodyMap } from './BodyMap';
import { MapFlowAddition } from './PredictedBodyFlow';
import { gymExerciseId, gymFlowById, gymFlowItem, gymTargetLabel } from '../../shared/gym-flows';
import { supersetPartnerAreas } from '../../shared/exercise-alternatives';
import { setsFromCards } from '../../shared/series-impact';
import { splitSupersetLabels } from '../../shared/flow-run';
import { schemeById } from '../../shared/set-schemes';
import { useTrainingSchemes } from './training-api';
import { ExerciseVisual } from './ExerciseVisual';
import { flowInterestIds, unwantCatalogFlow, wantCatalogFlow } from './flow-interest';
import { TrainingRoutes, TrainingSessionPreview, WeeklyPlanSection } from './TrainingPlans';
import { useTrainingRoute } from './training-route';
import { customflowSlots } from '../../shared/customflows';
import { isCustomOrder } from '../../shared/item-order';
import { flowLevelOf, prioritySourceIds, withFinishers } from '../../shared/priority-finisher';
import { saveCustomflowOrder, saveCustomflowRemoval, saveCustomflowSwap, useCustomflow } from './customflows';
import { usePersonalMetrics } from './personal-metrics';
import { DragList } from './DragList';
import { SwapChooser, gearLabel } from './EquipmentCheck';
import { SeriesSheet } from './SeriesSheet';
import { localDate } from '../../shared/flow-habits';

const gap = space.ms;
/** The space App leaves under the glass top bar, part of the list inset. */
const rootListGap = space.ms;

/** Flows from the community arrive later; Qram's own flows live under the first tab. */
export function CommunityComingSoon() {
  const { colors: C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
        Coming soon
      </Text>
    </View>
  );
}

export function FlowCatalogHome({
  ownedIds,
  library,
  focusId,
  onAdd,
  onStart,
  onView,
}: {
  ownedIds: string[];
  library: HabitFlow[];
  /** The member's onboarding focus, when they picked one. */
  focusId?: string;
  onAdd: (flowId: string) => Promise<boolean>;
  onStart: (flow: HabitFlow) => void;
  onView: (flow: HabitFlow) => void;
}) {
  const toast = useToast();
  useTrainingSchemes();
  const [tileId, setTileId] = usePaneState<string | null>('catalogTile', null);
  const [flowId, setFlowId] = usePaneState<string | null>('catalogFlow', null);
  const [catalogSessionId, setCatalogSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = usePaneState('catalogExercises', false);
  const [personalise, setPersonalise] = usePaneState('catalogPersonalise', false);
  const [route, setRoute] = usePaneState<RoutineRoute>('routineRoute', emptyRoutineRoute, 'account');
  const [training, setTrainingRoute] = useTrainingRoute();
  const seenSection = useRef(0);
  useEffect(() => {
    if (!route.section || route.section === seenSection.current) return;
    seenSection.current = route.section;
    setTileId(null);
    setFlowId(null);
    setExercises(false);
  }, [route.section, setExercises, setFlowId, setTileId]);
  useEffect(() => {
    if (!route.checkpoint && !route.search && !route.routineId) return;
    setTileId(null);
    setFlowId(null);
    setExercises(false);
  }, [route.checkpoint, route.routineId, route.search, setExercises, setFlowId, setTileId]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    flowInterestIds()
      .then(result => {
        if (live) setWanted(result.catalogFlowIds);
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  async function toggle(id: string) {
    if (!ready) return;
    const has = wanted.includes(id);
    setWanted(current => (has ? current.filter(item => item !== id) : [...current, id]));
    try {
      const result = has ? await unwantCatalogFlow(id) : await wantCatalogFlow(id);
      setWanted(result.catalogFlowIds);
    } catch (error) {
      setWanted(current => (has ? [...new Set([...current, id])] : current.filter(item => item !== id)));
      toast({
        message: error instanceof Error ? error.message : 'Could not save that request.',
        kind: 'error',
      });
    }
  }
  if (training.page !== 'home') return <TrainingRoutes flows={library} onStartFlow={onStart} />;
  if (route.routineId)
    return <RoutineDetailPage routineId={route.routineId} />;
  if (route.search) return <RoutineSearchPage />;
  if (route.checkpoint) return <RoutineCheckpointPage checkpoint={route.checkpoint} />;
  if (personalise) return <PersonalisePage onBack={() => setPersonalise(false)} />;
  if (exercises)
    return <ExerciseCatalog library={library} onBack={() => setExercises(false)} onView={onView} />;
  const opened = flowId ? catalogFlow(flowId) : undefined;
  if (opened) {
    const live = liveFlowId(opened);
    const source = live ? library.find(flow => flow.id === live) : undefined;
    return (
      <CatalogFlowPage
        title={opened.title}
        level={opened.level}
        tileId={opened.tileId}
        catalogFlowId={opened.id}
        source={source}
        library={library}
        owned={Boolean(live && ownedIds.includes(live))}
        requested={wanted.includes(opened.id)}
        ready={ready}
        onBack={() => setFlowId(null)}
        onRequest={() => void toggle(opened.id)}
        onAdd={onAdd}
        onStart={onStart}
        onView={onView}
      />
    );
  }
  if (tileId && catalogSessionId)
    return <TrainingSessionPreview id={catalogSessionId} library={library} onBack={() => setCatalogSessionId(null)} />;
  if (tileId && catalogTile(tileId))
    return (
      <FlowCatalogTile
        tileId={tileId}
        focusId={focusId}
        onTile={id => {
          setCatalogSessionId(null);
          setTileId(id);
        }}
        onBack={() => {
          setCatalogSessionId(null);
          setTileId(null);
        }}
        onFlow={setFlowId}
        onSession={setCatalogSessionId}
      />
    );
  return (
    <CatalogSections
      onOpen={sectionId => setTileId(tilesInSection(sectionId)[0]?.id ?? null)}
      onExercises={() => setExercises(true)}
      onPersonalise={() => setPersonalise(true)}
      onFlow={id => setFlowId(id)}
      requestsKey={wanted.join(',')}
      onRoutine={checkpoint => {
        setTileId(null);
        setFlowId(null);
        setRoute(checkpointRoute(checkpoint));
      }}
      onPlan={id => setTrainingRoute({ page: 'plan', id })}
      onBuild={() => setTrainingRoute({ page: 'build' })}
      scrollToken={route.section}
    />
  );
}

/** "3 × 10–12 · Back" for a gym exercise; empty for any other card. */
function gymCardDetail(flowId: string, cardId: string) {
  const exerciseId = gymExerciseId(cardId);
  const item = exerciseId ? gymFlowItem(flowId, exerciseId) : undefined;
  if (!exerciseId || !item) return '';
  const muscle = exercise(exerciseId)?.muscles[0] ?? '';
  return [gymTargetLabel(item), muscle && muscle[0].toUpperCase() + muscle.slice(1)]
    .filter(Boolean)
    .join(' · ');
}

/** One flow's own page. A flow that's ready can be added and started; any other can be requested. */
export function CatalogFlowPage({
  title,
  level,
  tileId,
  catalogFlowId,
  source,
  library,
  owned,
  requested,
  ready,
  onBack,
  onRequest,
  onAdd,
  onStart,
  onView,
  topInset,
}: {
  title: string;
  level: string;
  tileId: string;
  /** The catalog entry, for its own picture. */
  catalogFlowId?: string;
  source?: HabitFlow;
  library: HabitFlow[];
  owned: boolean;
  requested: boolean;
  ready: boolean;
  onBack: () => void;
  onRequest: () => void;
  onAdd: (flowId: string) => Promise<boolean>;
  onStart: (flow: HabitFlow) => void;
  onView: (flow: HabitFlow) => void;
  /** Used when this page is opened from outside the Flows tab. */
  topInset?: number;
}) {
  const { colors: C } = useTheme();
  useTrainingSchemes();
  const contextInset = useRootListInset();
  const inset = topInset ?? contextInset;
  const [added, setAdded] = useState(false);
  const [routine, setRoutine] = useState(false);
  const [swapKey, setSwapKey] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const openedExercise = exerciseId ? exercise(exerciseId) : undefined;
  const gym = source ? gymFlowById(source.id) : undefined;
  const customflow = useCustomflow('qram-flow', gym?.id);
  const priorities = usePersonalMetrics()['gym.priorities']?.areas ?? [];
  const [dragging, setDragging] = useState(false);
  const [orderError, setOrderError] = useState('');
  const levelName = gym ? flowLevelOf(gym.level) : 'Beginner';
  const personalised = gym ? withFinishers(gym.items, priorities, levelName) : [];
  const priorityIds = new Set(gym ? prioritySourceIds(gym.items, priorities, levelName) : []);
  const removed = new Set(customflow?.changes.removed ?? []);
  const baseItems = personalised.filter(item => !removed.has(item.exerciseId));
  // As the member's Customflow when they've customised this flow; the run starts the same way.
  const slots = gym ? customflowSlots(personalised, customflow) : [];
  const customised = Boolean(customflow);
  const defaultIds = baseItems.map(entry => entry.exerciseId);
  const customOrder = Boolean(customflow?.changes.order?.length && isCustomOrder(defaultIds, customflow.changes.order));
  const splitSupersets = gym
    ? splitSupersetLabels(
        baseItems.map(item => ({ exerciseId: item.exerciseId, superset: item.superset })),
        slots.map(slot => ({ exerciseId: slot.sourceId, superset: slot.item.superset })),
        item => item.exerciseId,
      )
    : [];
  const removedPriorities = [...priorityIds].filter(id => removed.has(id));
  function reorder(keys: string[] | null) {
    if (!gym) return;
    setOrderError('');
    const flowSource = { kind: 'qram-flow' as const, id: gym.id, version: null };
    // Dragging back to the personalised order clears only the order, so a swap or a removal stays.
    const save =
      keys && isCustomOrder(defaultIds, keys) ? saveCustomflowOrder(flowSource, keys) : saveCustomflowOrder(flowSource, null);
    void save.catch(() => setOrderError('Could not save the new order. Try again.'));
  }
  function dropPriority(key: string, out: boolean) {
    if (!gym) return;
    setOrderError('');
    const flowSource = { kind: 'qram-flow' as const, id: gym.id, version: null };
    void saveCustomflowRemoval(flowSource, key, out).catch(() => setOrderError('Could not update that exercise. Try again.'));
  }
  if (openedExercise) {
    const schemeId = slots.find(slot => slot.item.exerciseId === openedExercise.id)?.item.scheme;
    return (
        <ExercisePage
        item={openedExercise}
        library={library}
        topInset={topInset}
        scheme={schemeId ? schemeById(schemeId) : null}
        onBack={() => setExerciseId(null)}
        onView={flow => {
          if (source && flow.id === source.id) setExerciseId(null);
          else onView(flow);
        }}
      />
    );
  }
  const cards = source ? resolveVisualFlow(source, library).cards : [];
  const openedCatalog = catalogFlowId ? catalogFlow(catalogFlowId) : undefined;
  const worked = gym ? flowMuscleMap(slots.map(slot => slot.item.exerciseId)) : null;
  const button = (
    label: string,
    onPress: () => void,
    secondary = false,
    disabled = false,
  ) => (
    secondary ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: size.button,
          paddingHorizontal: space.sm,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.pill,
          borderWidth: stroke.line,
          borderColor: C.line,
          backgroundColor: 'transparent',
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        })}
      >
        <Text numberOfLines={1} variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
          {label}
        </Text>
      </Pressable>
    ) : (
      <Button title={label} accessibilityLabel={label} disabled={disabled} onPress={onPress} />
    )
  );
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - rootListGap) }}>
      <CatalogBar title={catalogTile(tileId)?.title ?? ''} onBack={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={!dragging}
        contentContainerStyle={{
          paddingHorizontal: space.md,
          paddingTop: space.sm,
          paddingBottom: 128,
          gap: space.md,
        }}
      >
        {/* The picture stays small: these icons are made for this size, and the buttons stay in view. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 88, height: 88, borderRadius: radius.control, overflow: 'hidden', backgroundColor: C.card }}>
            <CatalogCover tileId={tileId} flowId={catalogFlowId} iconSize={40} square />
          </View>
          <View style={{ flex: 1, gap: space.xxs }}>
            <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
              {title}
            </Text>
            <Text variant="subhead" style={{ color: C.muted }}>
              {openedCatalog
                ? catalogFlowLine(
                    openedCatalog,
                    slots.some(slot => priorityIds.has(slot.sourceId)) || removed.size
                      ? slots.map(slot => slot.item)
                      : undefined,
                  )
                : level}
            </Text>
            {customised ? (
              <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                Customised
              </Text>
            ) : null}
          </View>
        </View>
        {source ? (
          <>
            {!!source.description && (
              <Text variant="callout" style={{ color: C.text }}>
                {source.description}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: space.ms }}>
              <View style={{ flex: 1 }}>
                {button(
                  owned || added ? '✓ On flow map' : 'Add to flow map',
                  () => {
                    void onAdd(source.id).then(ok => {
                      if (ok) setAdded(true);
                    });
                  },
                  true,
                  owned || added,
                )}
              </View>
              <View style={{ flex: 1 }}>{button('Start this flow', () => onStart(source))}</View>
            </View>
            {button('Add to Daily flow', () => setRoutine(true), true)}
            {routine ? (
              <SeriesSheet
                mode="create"
                title={source.title}
                itemKind="flow"
                itemId={source.id}
                start={localDate(new Date())}
                onClose={() => setRoutine(false)}
              />
            ) : null}
            <MapFlowAddition
              flowId={source.id}
              items={gym ? undefined : setsFromCards(cards.map(card => ({ cardId: card.id })))}
            />
            {worked ? (
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <Text variant="headline" style={{ alignSelf: 'stretch', color: C.text }}>
                  What this works
                </Text>
                <BodyMap width={180} main={worked.main} helpers={worked.helpers} />
                <Text variant="subhead" style={{ alignSelf: 'stretch', color: C.muted }}>
                  {worked.main.map(area => muscleAreas.find(item => item.id === area)?.title ?? area).join(', ')}
                </Text>
              </View>
            ) : null}
            <View>
              <Text variant="headline" style={{ color: C.text, paddingBottom: space.sm }}>
                {gym
                  ? `${slots.length} ${slots.length === 1 ? 'exercise' : 'exercises'}`
                  : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
              </Text>
              {gym ? (
                <DragList
                  items={slots}
                  keyOf={slot => slot.sourceId}
                  labelOf={slot => exercise(slot.item.exerciseId)?.name ?? slot.sourceId}
                  onDragging={setDragging}
                  onReorder={next => reorder(next.map(slot => slot.sourceId))}
                  renderItem={(slot, index) => {
                    const entry = slot.item;
                    const move = exercise(entry.exerciseId);
                    const name = move?.name ?? entry.exerciseId;
                    const swapped = slot.sourceId !== entry.exerciseId ? exercise(slot.sourceId)?.name : null;
                    const priority = priorityIds.has(slot.sourceId);
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${name}`}
                          onPress={() => move && setExerciseId(move.id)}
                          style={({ pressed }) => ({
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: space.ms,
                            paddingVertical: space.sm,
                            minHeight: hit,
                            opacity: pressed ? opacity.pressed : 1,
                          })}
                        >
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: radius.small,
                              overflow: 'hidden',
                              backgroundColor: C.card,
                            }}
                          >
                            <ExerciseVisual exerciseId={move?.id} cover />
                          </View>
                          <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                            <Text variant="callout" style={{ color: C.text }}>
                              {index + 1}. {name}
                            </Text>
                            <Text variant="footnote" style={{ color: C.muted }}>
                              {[gymTargetLabel(entry), move?.equipment ? gearLabel(move.equipment) : ''].filter(Boolean).join(' · ')}
                            </Text>
                            {priority ? (
                              <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                                Your priority
                              </Text>
                            ) : null}
                            {swapped ? (
                              <Text variant="footnote" style={{ color: C.muted }}>
                                Swapped from {swapped}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={slot.sourceId === entry.exerciseId ? `Swap ${name}` : `Undo swap of ${name}`}
                          onPress={() => {
                            if (!gym) return;
                            if (slot.sourceId === entry.exerciseId) {
                              setSwapKey(slot.sourceId);
                              return;
                            }
                            void saveCustomflowSwap({ kind: 'qram-flow', id: gym.id, version: null }, slot.sourceId, null).catch(() =>
                              setOrderError('Could not undo that swap. Try again.'),
                            );
                          }}
                          style={({ pressed }) => ({
                            minHeight: hit,
                            justifyContent: 'center',
                            paddingHorizontal: space.sm,
                            opacity: pressed ? opacity.pressed : 1,
                          })}
                        >
                          <Text variant="subhead" style={{ color: C.muted }}>
                            {slot.sourceId === entry.exerciseId ? 'Swap' : 'Undo'}
                          </Text>
                        </Pressable>
                        {priority ? (
                          <Button
                            variant="text"
                            size="regular"
                            title="Remove"
                            accessibilityLabel={`Remove ${name}`}
                            onPress={() => dropPriority(slot.sourceId, true)}
                          />
                        ) : null}
                      </View>
                    );
                  }}
                />
              ) : (
                cards.map(card => (
                    <View
                      key={card.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.ms,
                        paddingVertical: space.sm,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: C.line,
                      }}
                    >
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: radius.small,
                          overflow: 'hidden',
                          backgroundColor: C.card,
                        }}
                      >
                        <FlowIllustration flow={card} cover />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                        <Text variant="callout" style={{ color: C.text }}>
                          {card.title}
                        </Text>
                        {!!gymCardDetail(source.id, card.id) && (
                          <Text variant="footnote" style={{ color: C.muted }}>
                            {gymCardDetail(source.id, card.id)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
              )}
              {removedPriorities.map(id => {
                const name = exercise(id)?.name ?? id;
                return (
                  <Button
                    key={id}
                    variant="text"
                    size="regular"
                    title={`Put ${name} back`}
                    accessibilityLabel={`Put ${name} back`}
                    onPress={() => dropPriority(id, false)}
                  />
                );
              })}
              {customOrder || splitSupersets.length > 0 || orderError ? (
                <View style={{ gap: space.xs, paddingTop: space.sm }}>
                  {orderError ? (
                    <Text variant="subhead" style={{ color: C.danger }}>
                      {orderError}
                    </Text>
                  ) : null}
                  {splitSupersets.map(label => (
                    <Text key={label} variant="subhead" style={{ color: C.muted }}>
                      Superset {label} split by your order
                    </Text>
                  ))}
                  {customOrder && splitSupersets.length === 0 ? (
                    <Text variant="subhead" style={{ color: C.muted }}>
                      Customflow: you changed the order.
                    </Text>
                  ) : null}
                  {splitSupersets.length > 0 ? (
                    <Button
                      variant="text"
                      size="regular"
                      title="Undo order"
                      accessibilityLabel="Undo order"
                      onPress={() => reorder(null)}
                    />
                  ) : null}
                  {customOrder && splitSupersets.length === 0 ? (
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
            </View>
          </>
        ) : (
          <View
            style={{
              gap: space.ms,
              padding: space.md,
              borderRadius: radius.control,
              borderWidth: stroke.line,
              borderColor: C.line,
              backgroundColor: C.card,
            }}
          >
            <Text variant="headline" style={{ color: C.text }}>
              Show your interest
            </Text>
            <Text variant="subhead" style={{ color: C.muted }}>
              We're curating this flow. Request it and we'll tell you when it's ready.
            </Text>
            {button(requested ? '✓ Requested' : 'Request this flow', onRequest, requested, !ready)}
          </View>
        )}
      </ScrollView>
      {swapKey && gym && source ? (
        <SwapChooser
          sourceId={slots.find(slot => slot.sourceId === swapKey)?.item.exerciseId ?? swapKey}
          avoidMainAreas={supersetPartnerAreas(
            slots.map(slot => ({ key: slot.sourceId, exerciseId: slot.item.exerciseId, superset: slot.item.superset })),
            swapKey,
          )}
          library={library}
          onClose={() => setSwapKey(null)}
          onChoose={async exerciseId => {
            await saveCustomflowSwap({ kind: 'qram-flow', id: gym.id, version: null }, swapKey, exerciseId);
            setSwapKey(null);
          }}
          onView={flow => {
            setSwapKey(null);
            if (flow.id !== source.id) onView(flow);
          }}
        />
      ) : null}
    </View>
  );
}

function CatalogSections({
  onOpen,
  onExercises,
  onPersonalise,
  onFlow,
  requestsKey,
  onRoutine,
  onPlan,
  onBuild,
  scrollToken,
}: {
  onOpen: (id: string) => void;
  onExercises: () => void;
  onPersonalise: () => void;
  onFlow: (catalogFlowId: string) => void;
  /** Changes when the member requests a flow, so the leaderboard refreshes. */
  requestsKey: string;
  onRoutine: (checkpoint: RoutineCheckpoint) => void;
  onPlan: (id: string) => void;
  onBuild: () => void;
  scrollToken: number;
}) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [offset, setOffset] = usePaneState('catalogScroll', 0);
  const [width, setWidth] = useState(0);
  const list = useRef<React.ElementRef<typeof ScrollView>>(null);
  const restore = useRef(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      list.current?.scrollTo({ y: offset, animated: false });
      requestAnimationFrame(() => {
        restore.current = false;
      });
    });
    return () => cancelAnimationFrame(frame);
    // Restore the position saved before the tile page opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const routineY = useRef(0);
  const column = width > 0 ? (width - gap * 2) / 3 : 0;
  useEffect(() => {
    if (!scrollToken) return;
    const frame = requestAnimationFrame(() => list.current?.scrollTo({ y: routineY.current, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [scrollToken]);
  return (
    <ScrollView
      ref={list}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={event => {
        if (!restore.current) setOffset(event.nativeEvent.contentOffset.y);
      }}
      contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: inset, paddingBottom: 128, gap: space.xl }}
    >
      <PersonaliseRow onOpen={onPersonalise} />
      {catalogRoots.map(root => (
        <View key={root.id} style={{ gap: space.ms }}>
          <SectionHeader title={root.title} />
          <View
            onLayout={event => setWidth(event.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
          >
            {/* Wait for the real width: an image first laid out at 0 stays blurry on iOS. */}
            {column > 0 &&
              sectionsInRoot(root.id).map(section => (
                  <Pressable
                    key={section.id}
                    accessibilityRole="button"
                    accessibilityLabel={section.title}
                    onPress={() => onOpen(section.id)}
                    style={{ width: column, gap: space.sm }}
                  >
                    <CatalogSectionCover sectionId={section.id} />
                    <Text
                      numberOfLines={2}
                      variant="footnote"
                      style={{ color: C.text, textAlign: 'center' }}
                    >
                      {section.title}
                    </Text>
                  </Pressable>
              ))}
          </View>
        </View>
      ))}
      <View
        onLayout={event => {
          routineY.current = event.nativeEvent.layout.y;
        }}
        style={{ gap: space.ms }}
      >
        <SectionHeader title="Daily flow" />
        <View
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
        >
          {column > 0 &&
            routineCheckpoints.map(checkpoint => (
              <Pressable
                key={checkpoint}
                accessibilityRole="button"
                accessibilityLabel={checkpoint}
                onPress={() => onRoutine(checkpoint)}
                style={{ width: column, gap: space.sm }}
              >
                <RoutineCheckpointCover checkpoint={checkpoint} />
                <Text numberOfLines={2} variant="footnote" style={{ color: C.text, textAlign: 'center' }}>
                  {checkpoint}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>
      <WeeklyPlanSection onOpen={onPlan} onBuild={onBuild} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="All Exercises"
        onPress={onExercises}
        style={({ pressed }) => ({
          minHeight: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.ms,
          padding: space.ms,
          borderRadius: radius.control,
          backgroundColor: C.card,
          opacity: pressed ? opacity.pressed : 1,
        })}
      >
        <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden' }}>
          <CatalogSectionCover sectionId="all-exercises" />
        </View>
        <Text variant="headline" style={{ flex: 1, color: C.text }}>
          All Exercises
        </Text>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.lg} />
      </Pressable>
      <RequestedFlows refreshKey={requestsKey} onOpen={onFlow} />
    </ScrollView>
  );
}
