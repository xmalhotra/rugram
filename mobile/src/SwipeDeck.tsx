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
import { hit, radius, space, stroke, useTheme } from './design/theme';
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
          gap: space.xs,
          alignItems: 'center',
          paddingBottom: space.sm,
        }}
      >
        {pages.map((_, position) => (
          <Pressable
            key={position}
            accessibilityRole="button"
            accessibilityLabel={`Page ${position + 1} of ${pages.length}`}
            accessibilityState={{ selected: index === position }}
            onPress={() => go(position)}
            style={{ minWidth: 32, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
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
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.xs, paddingBottom: space.lg }}
              >
                {page}
              </ScrollView>
            </View>
          ))}
      </ScrollView>
      <View
        style={{
          paddingTop: space.ms,
          paddingBottom: space.sm,
          gap: space.xs,
          borderTopWidth: stroke.line,
          borderTopColor: C.line,
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          variant="caption"
          style={{ textAlign: 'center', color: C.muted }}
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
    <View style={{ flex: 1, justifyContent: 'center', gap: space.xl, paddingVertical: space.ms }}>
      <View style={{ gap: space.ms }}>
        <Text
          variant="caption"
          style={{
            textAlign: 'center',
            color: C.lime,
            fontWeight: '600',
            letterSpacing: 1.6,
          }}
        >
          {eyebrow.toUpperCase()}
        </Text>
        <Text
          accessibilityRole="header"
          variant="display"
          style={{
            textAlign: 'center',
            color: C.text,
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
            paddingVertical: space.xl,
          }}
        >
          {visual}
        </View>
      )}
      {caption && (
        <Text
          variant="callout"
          style={{
            textAlign: 'center',
            color: C.muted,
            paddingHorizontal: space.ms,
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
        padding: space.xl,
        borderRadius: radius.pill,
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
        borderRadius: radius.pill,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: C.lime, fontSize: 62 }}>✦</Text>
    </View>
  );
}
