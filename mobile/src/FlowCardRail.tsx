import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

const cardWidth = 144;
const gap = 8;

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
        paddingTop: showHeading ? 8 : 0,
        borderTopWidth: showHeading ? 0.5 : 0,
        borderColor: C.line,
        gap: showHeading ? 8 : 0,
      }}
    >
      {showHeading && (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>In this flow</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>Swipe or tap a card</Text>
        </View>
      )}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel="Cards in this flow"
        onContentSizeChange={reveal}
        contentContainerStyle={{ gap, paddingRight: 16, paddingBottom: 4 }}
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
              height: 52,
              paddingHorizontal: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: current === index ? C.lime : C.line,
              backgroundColor: C.card,
              opacity: pressed ? 0.65 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            })}
          >
            <Text
              style={{
                color: current === index ? C.lime : C.muted,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {index + 1}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                color: current === index ? C.text : C.muted,
                fontSize: 13,
                lineHeight: 17,
                fontWeight: current === index ? '600' : '400',
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
