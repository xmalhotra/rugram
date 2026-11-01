import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { movementRows, type Demonstrator } from '../../shared/movement-viewer';
import { fitnessFrameCount } from '../../shared/fitness-media-layout';
import { fitnessMedia, fitnessCollectionChildren } from '../../shared/fitness-guides';
import { deckPage } from '../../shared/swipe-deck';
import { AnimalMovementViewer } from './AnimalMovementViewer';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { MovementControls } from './MovementControls';
import { MovementGlass } from './MovementGlass';
import { morningDrinksFlowId } from '../../shared/morning-drinks';
import { trainingSupplementFlowIds } from '../../shared/training-supplements';
import { FlowCardRail } from './FlowCardRail';
import { codingCard, codingCollectionIds } from '../../shared/coding-flows';
import { domainStill } from './morning-stills';
import { poseFrameRow } from './pose-frames';
import { useRegisterAddToFlow } from './AddToFlowHeader';
import { usePaneState } from './pane-state';
import {
  MovementPositionBar,
  type MovementPositionState,
  type MovementPositionUpdate,
} from './MovementPositionBar';

const startingPosition: MovementPositionState = { progress: 0, phase: 0 };

export function AnimalMovementDeck({
  flow,
  library,
  renderInformation,
  onAddCard,
  uniformHeader = false,
  aside,
  ...actions
}: {
  flow: HabitFlow;
  library: HabitFlow[];
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onHome: () => void;
  onRemove: () => void;
  onLink: (url: string) => void;
  renderInformation?: (card: HabitFlow, onClose: () => void) => React.ReactNode;
  onAddCard?: (card: HabitFlow) => void;
  uniformHeader?: boolean;
  aside?: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  const screen = useWindowDimensions();
  const host = useRef<React.ElementRef<typeof View>>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [edgeLean, setEdgeLean] = useState(0);
  const [gender] = usePaneState<Demonstrator>('movementDemonstrator', 'male', 'account');
  const supplementGuide = trainingSupplementFlowIds.includes(flow.id);
  const codingGuide = codingCollectionIds.includes(flow.id);
  const movements = (flow.relatedFlowIds ?? fitnessCollectionChildren[flow.id] ?? []).flatMap(id =>
    library.filter(
      item =>
        item.id === id &&
        item.sessionGuide &&
        (item.visualCard || movementRows[id] !== undefined || fitnessMedia[id]),
    ),
  );
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [modes, setModes] = useState<Record<string, 'tilt' | 'slider'>>({});
  const [positions, setPositions] = useState<Record<string, MovementPositionState>>({});
  const updatePosition = useCallback<MovementPositionUpdate>((id, field, value) => {
    setPositions(previous => {
      const position = previous[id] ?? startingPosition;
      if (position[field] === value) return previous;
      return { ...previous, [id]: { ...position, [field]: value } };
    });
  }, []);
  const [infoOpen, setInfoOpen] = useState(false);
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const position = useRef(0);
  const pendingPage = useRef<number | null>(null);
  const current = Math.min(index, Math.max(0, movements.length - 1));
  const placeGlass = useCallback(() => {
    host.current?.measureInWindow((x: number, y: number) => {
      const nextX = Math.round(x);
      const nextY = Math.round(y);
      setOrigin(currentOrigin =>
        currentOrigin.x === nextX && currentOrigin.y === nextY
          ? currentOrigin
          : { x: nextX, y: nextY },
      );
    });
  }, []);
  useEffect(() => {
    placeGlass();
  }, [placeGlass, screen.width, screen.height]);
  useEffect(() => {
    ref.current?.scrollTo({ x: position.current * width, animated: false });
    pendingPage.current = null;
    setDragging(false);
  }, [width]);
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = deckPage(event.nativeEvent.contentOffset.x, width, movements.length);
    if (pendingPage.current !== null && page !== pendingPage.current) return;
    pendingPage.current = null;
    setInfoOpen(false);
    position.current = page;
    setIndex(position.current);
    setDragging(false);
  };
  const selectCard = (page: number) => {
    const next = Math.max(0, Math.min(movements.length - 1, page));
    if (next === position.current) return;
    // Long jumps skip unmounted intermediate pages rather than animating through blank cards.
    const animated = width > 0 && Math.abs(next - position.current) === 1;
    position.current = next;
    setInfoOpen(false);
    pendingPage.current = next;
    setIndex(next);
    setDragging(animated);
    ref.current?.scrollTo({ x: next * width, animated });
  };
  const visibleCard = movements[current];
  const addToFlowInHeader = useRegisterAddToFlow(
    onAddCard && visibleCard
      ? {
          title: visibleCard.title,
          busy: actions.busy,
          onPress: () => onAddCard(visibleCard),
        }
      : null,
  );
  if (!movements.length)
    return <Text style={{ color: C.muted }}>No published cards in this flow yet.</Text>;
  const currentStill = domainStill(movements[current].id);
  const currentMedia = movements[current].visualCard?.media ?? fitnessMedia[movements[current].id];
  const currentFrameCount =
    poseFrameRow(movements[current].id, gender)?.length ||
    (currentMedia ? fitnessFrameCount(currentMedia, gender) : 4);
  const currentFrameTerm =
    movements[current].visualCard ||
    codingCard(movements[current].id) ||
    currentMedia?.atlas === 'morning' ||
    currentMedia?.atlas === 'supplements'
      ? 'Frame'
      : 'Pose';
  return (
    <View
      ref={host}
      style={{ flex: 1, minHeight: 0, gap: 8 }}
    >
      {(flow.id === morningDrinksFlowId || supplementGuide) && (
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={{ color: C.text, fontSize: 21, lineHeight: 28, fontWeight: '600' }}
        >
          {flow.sessionGuide?.label}
        </Text>
      )}
      {movements.length > 1 && (
        <FlowCardRail
          cards={movements}
          current={current}
          onSelect={selectCard}
          showHeading={false}
        />
      )}
      {!(
        addToFlowInHeader &&
        movements.length > 1 &&
        !aside &&
        flow.id !== morningDrinksFlowId
      ) && (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          minHeight: onAddCard || aside
            ? 44
            : movements.length > 1
              ? 20
              : uniformHeader || codingGuide || movements[current].visualCard
                ? 56
                : 40,
        }}
      >
        {movements.length === 1 && (
          <Text
            accessibilityRole="header"
            numberOfLines={
              onAddCard || uniformHeader || codingGuide || movements[current].visualCard ? 2 : 1
            }
            style={{
              flex: 1,
              fontSize:
                onAddCard || uniformHeader || codingGuide || movements[current].visualCard
                  ? 18
                  : 20,
              fontWeight: '600',
              color: C.text,
            }}
          >
            {movements[current].title}
          </Text>
        )}
        {aside ? (
          <View style={{ flex: 1, minWidth: 0 }}>{aside}</View>
        ) : flow.id === morningDrinksFlowId ? (
          <Text numberOfLines={2} style={{ flex: 1, color: C.muted, fontSize: 13, lineHeight: 18 }}>
            {movements[current].sources?.[0]?.title ?? 'Published guidance'}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {onAddCard && !addToFlowInHeader && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${movements[current].title} to a personal flow`}
            accessibilityState={{ disabled: actions.busy }}
            disabled={actions.busy}
            onPress={() => onAddCard(movements[current])}
            style={({ pressed }) => ({
              minHeight: 44,
              alignSelf: 'flex-end',
              justifyContent: 'center',
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.card,
              opacity: actions.busy ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>＋ Add to Flow</Text>
          </Pressable>
        )}
      </View>
      )}
      <MovementControls
        appearance={!currentStill}
        playback={!currentStill}
        informationLabel={
          movements[current].visualCard
            ? 'Card benefits'
            : codingGuide
              ? 'Coding benefits'
              : supplementGuide
                ? 'Supplement information'
                : flow.id === morningDrinksFlowId
                  ? 'Drink information'
                  : undefined
        }
        controlMode={modes[movements[current].id] ?? 'tilt'}
        setControlMode={mode =>
          setModes(previous => ({ ...previous, [movements[current].id]: mode }))
        }
        onInfo={() => setInfoOpen(true)}
      />
      {supplementGuide && (
        <View style={{ minHeight: 54, justifyContent: 'center', paddingHorizontal: 2 }}>
          <Text numberOfLines={3} style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
            {movements[current].description}
          </Text>
        </View>
      )}
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{
          flex: 1,
          marginHorizontal: -space.lg,
          width: screen.width,
        }}
        onLayout={event => {
          setWidth(event.nativeEvent.layout.width);
          setHeight(event.nativeEvent.layout.height);
        }}
        onScrollBeginDrag={() => {
          setInfoOpen(false);
          pendingPage.current = null;
          setDragging(true);
        }}
        onMomentumScrollBegin={() => {
          setInfoOpen(false);
          if (pendingPage.current === null) setDragging(true);
        }}
        onScrollEndDrag={event => {
          const offset = event.nativeEvent.contentOffset.x;
          if (width > 0 && Math.abs(offset / width - Math.round(offset / width)) < 0.02)
            settle(event);
        }}
        onMomentumScrollEnd={settle}
        accessibilityLabel={`${flow.title} cards. Swipe for the next card.`}
        accessibilityActions={[
          { name: 'increment', label: 'Next card' },
          { name: 'decrement', label: 'Previous card' },
        ]}
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'increment') selectCard(current + 1);
          if (event.nativeEvent.actionName === 'decrement') selectCard(current - 1);
        }}
      >
        {width > 0 &&
          height > 0 &&
          movements.map((movement, page) => (
            <View
              key={movement.id}
              style={{ width, height, overflow: 'hidden' }}
              accessibilityElementsHidden={page !== current}
              importantForAccessibility={page === current ? 'auto' : 'no-hide-descendants'}
            >
              {Math.abs(page - current) <= 1 && (
                <AnimalMovementViewer
                  flow={movement}
                  row={movementRows[movement.id] ?? fitnessMedia[movement.id]?.row ?? 0}
                  active={page === current && !dragging}
                  controls={{
                    mode: modes[movement.id] ?? 'tilt',
                    infoOpen: page === current && infoOpen,
                    onCloseInfo: () => setInfoOpen(false),
                    position: {
                      value: positions[movement.id] ?? startingPosition,
                      onChange: updatePosition,
                    },
                    information: movement.visualCard
                      ? renderInformation?.(movement, () => setInfoOpen(false))
                      : undefined,
                    context: supplementGuide
                      ? { title: flow.title, description: flow.description }
                      : undefined,
                  }}
                  {...actions}
                  onLean={page === current ? setEdgeLean : undefined}
                />
              )}
            </View>
          ))}
      </ScrollView>
      {!currentStill && (
      <MovementPositionBar
        {...(positions[movements[current].id] ?? startingPosition)}
        frameCount={currentFrameCount}
        frameTerm={currentFrameTerm}
        controlMode={modes[movements[current].id] ?? 'tilt'}
        onProgress={value => updatePosition(movements[current].id, 'progress', value)}
        disabled={dragging || infoOpen}
        accessibilityLabel={
          currentMedia?.atlas === 'supplements'
            ? 'Assessment frame'
            : currentMedia?.atlas === 'morning'
              ? 'Preparation frame'
              : currentFrameTerm === 'Frame'
                ? 'Workflow frame'
                : 'Movement phase'
        }
      />
      )}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -origin.x,
          top: -origin.y,
          width: screen.width,
          height: screen.height,
        }}
      >
        <MovementGlass lean={edgeLean} />
      </View>
    </View>
  );
}
