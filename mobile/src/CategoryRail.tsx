import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import { FocusIllustration } from './FocusIllustration';
import { useTheme } from './design/theme';
import { CategoryRailOutline } from './CategoryRailOutline';
export type RailCategory = { id: string; title: string; illustration: string; imageUrl?: string };
export function CategoryRail({
  items,
  selected,
  onSelect,
  label = 'Categories',
  compact = false,
}: {
  items: readonly RailCategory[];
  selected: string;
  onSelect: (id: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const { colors: C } = useTheme();
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(compact ? 44 : 80);
  const itemWidth = compact ? 88 : 84;
  const selectedIndex = items.findIndex(item => item.id === selected);
  useEffect(() => {
    if (selectedIndex < 0 || width <= 0) return;
    const end = 14 + selectedIndex * (itemWidth + 8) + itemWidth;
    ref.current?.scrollTo({ x: Math.max(0, end + 12 - width), animated: true });
  }, [selectedIndex, itemWidth, width]);
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
          setHeight(Math.max(compact ? 44 : 80, nextHeight - 4))
        }
        contentContainerStyle={{
          gap: 8,
          paddingTop: 4,
          paddingBottom: 0,
          paddingHorizontal: 14,
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
              minHeight: compact ? 48 : 80,
              paddingHorizontal: 6,
              paddingTop: 4,
              paddingBottom: 8,
              gap: 4,
              borderWidth: 0,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: compact ? 'center' : 'flex-start',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {!compact &&
              (item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  resizeMode="contain"
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.photoMat }}
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
              style={{
                alignSelf: 'stretch',
                width: '100%',
                color: selected === item.id ? C.text : C.muted,
                fontSize: 12,
                lineHeight: 15,
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
