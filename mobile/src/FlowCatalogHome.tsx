import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import {
  catalogFlow,
  catalogRoots,
  catalogTile,
  sectionsInRoot,
  tilesInSection,
} from '../../shared/flow-catalog';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { useToast } from './design/states';
import { usePaneState } from './pane-state';
import { useRootListInset } from './RootList';
import { CatalogCover, CatalogSectionCover } from './CatalogCover';
import { CatalogBar, FlowCatalogTile } from './FlowCatalogTile';
import { ExerciseCatalog, ExercisePage } from './ExerciseCatalog';
import { FlowIllustration } from './FlowIllustration';
import { liveFlowId } from './catalog-live';
import { routineCheckpoints, type RoutineCheckpoint } from '../../shared/routines';
import { RoutineCheckpointCover, RoutineCheckpointPage, RoutineDetailPage, RoutineSearchPage } from './RoutineCatalog';
import { emptyRoutineRoute, checkpointRoute, type RoutineRoute } from './routine-route';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { exercise } from '../../shared/exercises';
import { flowMuscleMap, muscleAreas } from '../../shared/muscle-map';
import { BodyMap } from './BodyMap';
import { gymExerciseId, gymFlowById, gymFlowItem, gymTargetLabel } from '../../shared/gym-flows';
import { schemeById } from '../../shared/set-schemes';
import { useTrainingSchemes } from './training-api';
import { ExerciseVisual } from './ExerciseVisual';
import { flowInterestIds, unwantCatalogFlow, wantCatalogFlow } from './flow-interest';
import { TrainingRoutes, TrainingSessionPreview, WeeklyPlanSection } from './TrainingPlans';
import { useTrainingRoute } from './training-route';

const gap = 10;
/** The space App leaves under the glass top bar, part of the list inset. */
const rootListGap = 12;

/** Flows from the community arrive later; Qram's own flows live under the first tab. */
export function CommunityComingSoon() {
  const { colors: C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>
        Coming soon
      </Text>
    </View>
  );
}

export function FlowCatalogHome({
  ownedIds,
  library,
  onAdd,
  onStart,
  onView,
}: {
  ownedIds: string[];
  library: HabitFlow[];
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
    return <TrainingSessionPreview id={catalogSessionId} onBack={() => setCatalogSessionId(null)} />;
  if (tileId && catalogTile(tileId))
    return (
      <FlowCatalogTile
        tileId={tileId}
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
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const openedExercise = exerciseId ? exercise(exerciseId) : undefined;
  const gym = source ? gymFlowById(source.id) : undefined;
  if (openedExercise) {
    const schemeId = gym?.items.find(entry => entry.exerciseId === openedExercise.id)?.scheme;
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
  const worked = gym ? flowMuscleMap(gym.items.map(entry => entry.exerciseId)) : null;
  const button = (
    label: string,
    onPress: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: secondary ? C.line : C.lime,
        backgroundColor: secondary ? 'transparent' : C.lime,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{ color: secondary ? C.text : C.onAccent, fontSize: 15, fontWeight: '700' }}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - rootListGap) }}>
      <CatalogBar title={catalogTile(tileId)?.title ?? ''} onBack={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 128,
          gap: 16,
        }}
      >
        {/* The picture stays small: these icons are made for this size, and the buttons stay in view. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 88, height: 88, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card }}>
            <CatalogCover tileId={tileId} iconSize={40} square />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
              {title}
            </Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>{level}</Text>
          </View>
        </View>
        {source ? (
          <>
            {!!source.description && (
              <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{source.description}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
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
            {worked ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ alignSelf: 'stretch', color: C.text, fontSize: 18, fontWeight: '700' }}>
                  What this works
                </Text>
                <BodyMap width={180} main={worked.main} helpers={worked.helpers} />
                <Text style={{ alignSelf: 'stretch', color: C.muted, fontSize: 15 }}>
                  {worked.main.map(area => muscleAreas.find(item => item.id === area)?.title ?? area).join(', ')}
                </Text>
              </View>
            ) : null}
            <View>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', paddingBottom: 6 }}>
                {gym
                  ? `${gym.items.length} ${gym.items.length === 1 ? 'exercise' : 'exercises'}`
                  : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
              </Text>
              {gym
                ? gym.items.map((entry, index) => {
                    const move = exercise(entry.exerciseId);
                    const name = move?.name ?? entry.exerciseId;
                    return (
                      <Pressable
                        key={entry.exerciseId}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${name}`}
                        onPress={() => move && setExerciseId(move.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 8,
                          borderBottomWidth: 0.5,
                          borderColor: C.line,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            overflow: 'hidden',
                            backgroundColor: C.card,
                          }}
                        >
                          <ExerciseVisual exerciseId={move?.id} cover />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <Text style={{ color: C.text, fontSize: 16 }}>
                            {index + 1}. {name}
                          </Text>
                          <Text style={{ color: C.muted, fontSize: 13 }}>{gymTargetLabel(entry)}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                : cards.map(card => (
                    <View
                      key={card.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 8,
                        borderBottomWidth: 0.5,
                        borderColor: C.line,
                      }}
                    >
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: C.card,
                        }}
                      >
                        <FlowIllustration flow={card} cover />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ color: C.text, fontSize: 16 }}>{card.title}</Text>
                        {!!gymCardDetail(source.id, card.id) && (
                          <Text style={{ color: C.muted, fontSize: 13 }}>{gymCardDetail(source.id, card.id)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
            </View>
          </>
        ) : (
          <View
            style={{
              gap: 12,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.card,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>Show your interest</Text>
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
              We're curating this flow. Request it and we'll tell you when it's ready.
            </Text>
            {button(requested ? '✓ Requested' : 'Request this flow', onRequest, requested, !ready)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CatalogSections({
  onOpen,
  onExercises,
  onRoutine,
  onPlan,
  onBuild,
  scrollToken,
}: {
  onOpen: (id: string) => void;
  onExercises: () => void;
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: inset, paddingBottom: 128, gap: 24 }}
    >
      {catalogRoots.map(root => (
        <View key={root.id} style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
            {root.title}
          </Text>
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
                    style={{ width: column, gap: 6 }}
                  >
                    <CatalogSectionCover sectionId={section.id} />
                    <Text
                      numberOfLines={2}
                      style={{ color: C.text, fontSize: 13, fontWeight: '500', lineHeight: 17, textAlign: 'center' }}
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
        style={{ gap: 12 }}
      >
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          Routine
        </Text>
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
                style={{ width: column, gap: 6 }}
              >
                <RoutineCheckpointCover checkpoint={checkpoint} />
                <Text
                  numberOfLines={2}
                  style={{ color: C.text, fontSize: 13, fontWeight: '500', lineHeight: 17, textAlign: 'center' }}
                >
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
          gap: 12,
          padding: 12,
          borderRadius: 14,
          backgroundColor: C.card,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden' }}>
          <CatalogSectionCover sectionId="all-exercises" />
        </View>
        <Text style={{ flex: 1, color: C.text, fontSize: 17, fontWeight: '600' }}>All Exercises</Text>
        <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
      </Pressable>
    </ScrollView>
  );
}
