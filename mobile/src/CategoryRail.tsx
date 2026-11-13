import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import { FocusIllustration } from './FocusIllustration';
import { hit, opacity, radius, space, useTheme } from './design/theme';
import { CategoryRailOutline } from './CategoryRailOutline';
export type RailCategory = { id: string; title: string; illustration: string; imageUrl?: string };
export function CategoryRail({
  items,
  selected,
  onSelect,
  label = 'Categories',
  compact = false,
  pills = false,
}: {
  items: readonly RailCategory[];
  selected: string;
  onSelect: (id: string) => void;
  label?: string;
  compact?: boolean;
  pills?: boolean;
}) {
  const { colors: C } = useTheme();
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const chipFrames = useRef(new Map<string, { x: number; width: number }>());
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(compact ? 44 : 80);
  const itemWidth = compact ? 88 : 84;
  const selectedIndex = items.findIndex(item => item.id === selected);
  useEffect(() => {
    if (pills) return;
    if (selectedIndex < 0 || width <= 0) return;
    const end = space.md + selectedIndex * (itemWidth + space.sm) + itemWidth;
    ref.current?.scrollTo({ x: Math.max(0, end + 12 - width), animated: true });
  }, [pills, selectedIndex, itemWidth, width]);
  useEffect(() => {
    if (!pills || selectedIndex < 0 || width <= 0) return;
    const frame = chipFrames.current.get(selected);
    if (!frame) return;
    ref.current?.scrollTo({
      x: Math.max(0, frame.x + frame.width + 12 - width),
      animated: true,
    });
  }, [pills, selected, selectedIndex, width]);
  if (pills)
    return (
      <View
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={{ backgroundColor: C.bg }}
      >
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={label}
          contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}
        >
          {items.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: selected === item.id }}
              onPress={() => onSelect(item.id)}
              onLayout={event => {
                const frame = event.nativeEvent.layout;
                chipFrames.current.set(item.id, { x: frame.x, width: frame.width });
                if (item.id !== selected || width <= 0) return;
                ref.current?.scrollTo({
                  x: Math.max(0, frame.x + frame.width + 12 - width),
                  animated: true,
                });
              }}
              style={{
                height: 34,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                justifyContent: 'center',
                backgroundColor: selected === item.id ? C.lime : C.card,
              }}
            >
              <Text
                variant="subhead"
                style={{
                  color: selected === item.id ? C.onAccent : C.text,
                  fontWeight: '600',
                }}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={{ backgroundColor: C.bg }}
    >
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={label}
        onContentSizeChange={(_, nextHeight) =>
          setHeight(Math.max(compact ? 44 : 80, nextHeight - space.xs))
        }
        contentContainerStyle={{
          gap: space.sm,
          paddingTop: space.xs,
          paddingBottom: 0,
          paddingHorizontal: space.md,
          minWidth: '100%',
          backgroundColor: C.card,
        }}
      >
        <CategoryRailOutline
          count={items.length}
          index={selectedIndex}
          width={width}
          height={height}
          color={C.lime}
          surface={C.bg}
          inactiveSurface={C.card}
          itemWidth={itemWidth}
        />
        {items.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => ({
              width: itemWidth,
              minHeight: compact ? hit : 80,
              paddingHorizontal: space.sm,
              paddingTop: space.xs,
              paddingBottom: space.sm,
              gap: space.xs,
              borderWidth: 0,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: compact ? 'center' : 'flex-start',
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            {!compact &&
              (item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  resizeMode="contain"
                  style={{ width: 32, height: 32, borderRadius: radius.small, backgroundColor: C.photoMat }}
                />
              ) : (
                <View
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ transform: [{ scale: 0.46 }] }}>
                    <FocusIllustration
                      focusId={item.illustration}
                      selected={selected === item.id}
                    />
                  </View>
                </View>
              ))}
            <Text
              numberOfLines={2}
              variant="caption"
              style={{
                alignSelf: 'stretch',
                width: '100%',
                color: selected === item.id ? C.text : C.muted,
                fontWeight: selected === item.id ? '600' : '400',
                textAlign: 'center',
              }}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
