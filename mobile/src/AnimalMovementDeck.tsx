import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { movementRows } from '../../shared/movement-viewer';
import { fitnessMedia, fitnessCollectionChildren } from '../../shared/fitness-guides';
import { gymExerciseId } from '../../shared/gym-flows';
import { GymCardFace } from './GymCardFace';
import { deckPage } from '../../shared/swipe-deck';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { morningDrinksFlowId } from '../../shared/morning-drinks';
import { trainingSupplementFlowIds } from '../../shared/training-supplements';
import { FlowCardRail } from './FlowCardRail';
import { codingCollectionIds } from '../../shared/coding-flows';
import { useRegisterAddToFlow } from './AddToFlowHeader';
import { flowCreationEnabled } from '../../shared/flow-catalog';
import { FlowIllustration } from './FlowIllustration';

export function AnimalMovementDeck({
  flow,
  library,
  busy,
  onAddCard,
  uniformHeader = false,
  aside,
  onIndexChange,
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
  onIndexChange?: (index: number) => void;
}) {
  const { colors: C } = useTheme();
  const screen = useWindowDimensions();
  const supplementGuide = trainingSupplementFlowIds.includes(flow.id);
  const codingGuide = codingCollectionIds.includes(flow.id);
  const movements = (flow.relatedFlowIds ?? fitnessCollectionChildren[flow.id] ?? []).flatMap(id =>
    library.filter(
      item =>
        item.id === id &&
        item.sessionGuide &&
        (gymExerciseId(item.id) != null ||
          item.visualCard ||
          movementRows[id] !== undefined ||
          fitnessMedia[id]),
    ),
  );
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const position = useRef(0);
  const pendingPage = useRef<number | null>(null);
  const current = Math.min(index, Math.max(0, movements.length - 1));
  const indexChanged = useRef(onIndexChange);
  indexChanged.current = onIndexChange;
  useEffect(() => {
    if (movements.length) indexChanged.current?.(current);
  }, [current, movements.length]);
  useEffect(() => {
    ref.current?.scrollTo({ x: position.current * width, animated: false });
    pendingPage.current = null;
  }, [width]);
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = deckPage(event.nativeEvent.contentOffset.x, width, movements.length);
    if (pendingPage.current !== null && page !== pendingPage.current) return;
    pendingPage.current = null;
    position.current = page;
    setIndex(position.current);
  };
  const selectCard = (page: number) => {
    const next = Math.max(0, Math.min(movements.length - 1, page));
    if (next === position.current) return;
    // Long jumps skip unmounted intermediate pages rather than animating through blank cards.
    const animated = width > 0 && Math.abs(next - position.current) === 1;
    position.current = next;
    pendingPage.current = next;
    setIndex(next);
    ref.current?.scrollTo({ x: next * width, animated });
  };
  const visibleCard = movements[current];
  const addToFlowInHeader = useRegisterAddToFlow(
    flowCreationEnabled && onAddCard && visibleCard
      ? {
          title: visibleCard.title,
          busy,
          onPress: () => onAddCard(visibleCard),
        }
      : null,
  );
  if (!movements.length)
    return <Text style={{ color: C.muted }}>No published cards in this flow yet.</Text>;
  return (
    <View style={{ flex: 1, minHeight: 0, gap: 8 }}>
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
        {flowCreationEnabled && onAddCard && !addToFlowInHeader && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${movements[current].title} to a personal flow`}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
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
              opacity: busy ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>＋ Add to Flow</Text>
          </Pressable>
        )}
      </View>
      )}
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
          pendingPage.current = null;
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
              {Math.abs(page - current) <= 1 &&
                (gymExerciseId(movement.id) ? (
                  <GymCardFace card={movement} />
                ) : (
                  <View style={{ flex: 1 }}>
                    <FlowIllustration flow={movement} cover />
                  </View>
                ))}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
