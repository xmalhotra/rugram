import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import type { Product } from '../../shared/mobile';
import type { SupplementGoal, SupplementTopic } from '../../shared/supplement-discovery';
import { journeyPage, supplementJourney } from '../../shared/supplement-journey';
import { FocusIllustration } from './FocusIllustration';
import { Button } from './design/components';
import { useTheme } from './design/theme';

export function SupplementJourney({
  topic,
  goal,
  products,
  onFinish,
}: {
  topic: SupplementTopic;
  goal: SupplementGoal;
  products: Product[];
  onFinish: () => void;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const position = useRef(0);
  const cards = supplementJourney(topic, goal, products.length);
  const last = page === cards.length - 1;
  useEffect(() => {
    scroll.current?.scrollTo({ x: position.current * width, animated: false });
  }, [width]);
  function move(next: number) {
    const target = journeyPage(next, 1, cards.length);
    position.current = target;
    setPage(target);
    scroll.current?.scrollTo({ x: target * width, animated: true });
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text accessibilityLiveRegion="polite" style={{ color: C.muted, fontSize: 14 }}>
          Your guide · {page + 1} of {cards.length}
        </Text>
        {!last && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip supplement guide"
            onPress={onFinish}
            style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }}
          >
            <Text style={{ color: C.muted, fontSize: 14 }}>Skip guide</Text>
          </Pressable>
        )}
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Guide position"
        accessibilityValue={{
          min: 1,
          max: cards.length,
          now: page + 1,
          text: `Card ${page + 1} of ${cards.length}`,
        }}
        style={{ flexDirection: 'row', gap: 5 }}
      >
        {cards.map((card, index) => (
          <View
            key={card.id}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 4,
              backgroundColor: index <= page ? C.lime : C.line,
            }}
          />
        ))}
      </View>
      <View
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: C.card }}
      >
        {width > 0 && (
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={event => {
              const next = journeyPage(event.nativeEvent.contentOffset.x, width, cards.length);
              position.current = next;
              setPage(next);
            }}
          >
            {cards.map((card, index) => (
              <View
                key={card.id}
                accessibilityElementsHidden={index !== page}
                importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}
                style={{ width, padding: 22, gap: 18 }}
              >
                <View style={{ height: 152, alignItems: 'center', justifyContent: 'center' }}>
                  {card.showProducts ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      {products.slice(0, 3).map(product => (
                        <View
                          key={product.id}
                          style={{
                            width: Math.min(78, (width - 64) / 3),
                            height: 112,
                            borderRadius: 16,
                            backgroundColor: C.photoMat,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {product.imageUrl ? (
                            <Image
                              accessibilityLabel={product.title}
                              source={{ uri: product.imageUrl }}
                              resizeMode="contain"
                              style={{ width: '92%', height: 100 }}
                            />
                          ) : (
                            <FocusIllustration focusId="supplements" />
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ transform: [{ scale: 1.65 }] }}>
                      <FocusIllustration focusId={card.illustration} selected />
                    </View>
                  )}
                </View>
                <Text style={{ color: C.text, fontSize: 25, lineHeight: 32, fontWeight: '600' }}>
                  {card.title}
                </Text>
                <Text style={{ color: C.muted, fontSize: 17, lineHeight: 26 }}>{card.body}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {page > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous guide card"
            onPress={() => move(page - 1)}
            style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 24 }}>←</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Button
            title={
              last
                ? products.length
                  ? `Explore ${products.length} picks →`
                  : 'Explore next steps →'
                : 'Next →'
            }
            onPress={() => (last ? onFinish() : move(page + 1))}
          />
        </View>
      </View>
      {!last && (
        <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>
          Swipe to explore · at your pace
        </Text>
      )}
    </View>
  );
}
