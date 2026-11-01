import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { deckPage } from '../../shared/swipe-deck';

export function SwipeDeck({
  pages,
  footer,
  controls,
}: {
  pages: React.ReactNode[];
  footer: React.ReactNode;
  controls?: (state: {
    index: number;
    count: number;
    onChange: (index: number) => void;
  }) => React.ReactNode;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const current = useRef(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      ref.current?.scrollTo({ x: current.current * width, animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, [width]);
  function settle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    current.current = deckPage(event.nativeEvent.contentOffset.x, width, pages.length);
    setIndex(current.current);
  }
  function go(next: number) {
    const page = Number.isFinite(next)
      ? Math.max(0, Math.min(pages.length - 1, Math.round(next)))
      : 0;
    current.current = page;
    setIndex(page);
    ref.current?.scrollTo({ x: page * width, animated: true });
  }
  return (
    <View
      style={{ flex: 1, minHeight: 0 }}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 4,
          alignItems: 'center',
          paddingBottom: 8,
        }}
      >
        {pages.map((_, position) => (
          <Pressable
            key={position}
            accessibilityRole="button"
            accessibilityLabel={`Page ${position + 1} of ${pages.length}`}
            accessibilityState={{ selected: index === position }}
            onPress={() => go(position)}
            style={{ minWidth: 32, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              style={{
                height: 5,
                width: index === position ? 24 : 7,
                borderRadius: 4,
                backgroundColor: index === position ? C.lime : C.line,
              }}
            />
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={controls ? 'Guide cards' : 'Swipe to explore'}
        accessibilityActions={[
          { name: 'increment', label: 'Next page' },
          { name: 'decrement', label: 'Previous page' },
        ]}
        onAccessibilityAction={event =>
          go(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))
        }
      >
        {width > 0 &&
          pages.map((page, position) => (
            <View key={position} style={{ width, height: '100%' }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 4, paddingBottom: 20 }}
              >
                {page}
              </ScrollView>
            </View>
          ))}
      </ScrollView>
      <View
        style={{
          paddingTop: 10,
          paddingBottom: 6,
          gap: 4,
          borderTopWidth: 1,
          borderTopColor: C.line,
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}
        >
          {index + 1} / {pages.length}
          {index === 0 ? (controls ? ' · Drag the slider to explore' : ' · Swipe to explore') : ''}
        </Text>
        {controls?.({ index, count: pages.length, onChange: go })}
        {footer}
      </View>
    </View>
  );
}
export function DeckPage({
  eyebrow,
  title,
  caption,
  visual,
  children,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  visual?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 22, paddingVertical: 12 }}>
      <View style={{ gap: 10 }}>
        <Text
          style={{
            textAlign: 'center',
            color: C.lime,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1.6,
          }}
        >
          {eyebrow.toUpperCase()}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            textAlign: 'center',
            color: C.text,
            fontSize: 32,
            lineHeight: 39,
            fontWeight: '400',
            letterSpacing: -0.8,
          }}
        >
          {title}
        </Text>
      </View>
      {visual && (
        <View
          style={{
            minHeight: 180,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 22,
          }}
        >
          {visual}
        </View>
      )}
      {caption && (
        <Text
          style={{
            textAlign: 'center',
            color: C.muted,
            fontSize: 16,
            lineHeight: 24,
            paddingHorizontal: 12,
          }}
        >
          {caption}
        </Text>
      )}
      {children}
    </View>
  );
}
export function DeckImage({ uri, label }: { uri?: string; label: string }) {
  const { colors: C } = useTheme();
  return uri ? (
    <View
      style={{
        width: '85%',
        height: 230,
        padding: 24,
        borderRadius: 32,
        backgroundColor: C.photoMat,
      }}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={label}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  ) : (
    <View
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: C.lime, fontSize: 62 }}>✦</Text>
    </View>
  );
}
