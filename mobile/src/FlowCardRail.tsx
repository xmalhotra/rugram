import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './design/Text';
import { opacity, radius, size, space, stroke, useTheme } from './design/theme';

const cardWidth = 144;
const gap = space.sm;

/** Card navigation is separate from the pose/frame progress inside the viewer. */
export function FlowCardRail({
  cards,
  current,
  onSelect,
  showHeading = true,
}: {
  cards: { id: string; title: string }[];
  current: number;
  onSelect: (index: number) => void;
  showHeading?: boolean;
}) {
  const { colors: C } = useTheme();
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const reveal = useCallback(() => {
    ref.current?.scrollTo({ x: Math.max(0, current - 1) * (cardWidth + gap), animated: true });
  }, [current]);
  useEffect(reveal, [reveal]);
  if (cards.length < 2) return null;
  return (
    <View
      style={{
        paddingTop: showHeading ? space.sm : 0,
        borderTopWidth: showHeading ? StyleSheet.hairlineWidth : 0,
        borderColor: C.line,
        gap: showHeading ? space.sm : 0,
      }}
    >
      {showHeading && (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text variant="caption" style={{ color: C.text, fontWeight: '600' }}>
            In this flow
          </Text>
          <Text variant="caption" style={{ color: C.muted }}>
            Swipe or tap a card
          </Text>
        </View>
      )}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel="Cards in this flow"
        onContentSizeChange={reveal}
        contentContainerStyle={{ gap, paddingRight: space.md, paddingBottom: space.xs }}
      >
        {cards.map((card, index) => (
          <Pressable
            key={card.id}
            accessibilityRole="tab"
            accessibilityLabel={`${card.title}, card ${index + 1} of ${cards.length}`}
            accessibilityState={{ selected: current === index }}
            onPress={() => onSelect(index)}
            style={({ pressed }) => ({
              width: cardWidth,
              height: size.button,
              paddingHorizontal: space.ms,
              borderRadius: radius.control,
              borderWidth: stroke.line,
              borderColor: current === index ? C.lime : C.line,
              backgroundColor: C.card,
              opacity: pressed ? opacity.pressed : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
            })}
          >
            <Text
              variant="footnote"
              style={{
                color: current === index ? C.lime : C.muted,
                fontWeight: '600',
              }}
            >
              {index + 1}
            </Text>
            <Text
              variant="footnote"
              numberOfLines={2}
              style={{
                flex: 1,
                color: current === index ? C.text : C.muted,
                // One weight for every state, so selecting a card never re-wraps its title.
              }}
            >
              {card.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
