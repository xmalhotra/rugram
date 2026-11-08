import { useId } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { FocusIllustration } from './FocusIllustration';

export type DiscoverCategory = { id: string; title: string; illustration: string };
export type DiscoverCity = { name: string; events: number };

const CITY_GRADIENTS = [
  ['#2f6f4e', '#0b1f16'],
  ['#3b4a8f', '#0d1330'],
  ['#8a5a2b', '#2a1708'],
  ['#7a2f4f', '#22091a'],
  ['#2f6f78', '#08201f'],
] as const;

export function EventsDiscover({
  categories,
  cities,
  onCategory,
  onCity,
}: {
  categories: DiscoverCategory[];
  cities: DiscoverCity[];
  onCategory: (id: string) => void;
  onCity: (name: string) => void;
}) {
  const { colors: C } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardSize = Math.min(200, screenWidth * 0.48);
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View style={{ gap: 28 }}>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>Browse by category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {categories.map(category => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${category.title}`}
              onPress={() => onCategory(category.id)}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.card,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  overflow: 'visible',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 72,
                    height: 72,
                    transform: [{ scale: 0.42 }],
                  }}
                >
                  <FocusIllustration focusId={category.illustration} />
                </View>
              </View>
              <Text style={{ fontSize: 16, color: C.text }}>{category.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>Cities</Text>
          <Text style={{ fontSize: 22, color: C.muted }}>›</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 16 }}
        >
          {cities.map((city, index) => {
            const [from, to] = CITY_GRADIENTS[index % CITY_GRADIENTS.length];
            const gradientId = `${gradientPrefix}city${index}`;
            return (
              <Pressable
                key={`${city.name}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${city.name}, ${city.events} upcoming events`}
                onPress={() => onCity(city.name)}
                style={({ pressed }) => ({
                  width: cardSize,
                  height: cardSize,
                  borderRadius: 20,
                  overflow: 'hidden',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Svg
                  width={cardSize}
                  height={cardSize}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <Defs>
                    <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={from} />
                      <Stop offset="1" stopColor={to} />
                    </LinearGradient>
                  </Defs>
                  <Rect width={cardSize} height={cardSize} fill={`url(#${gradientId})`} />
                </Svg>
                <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 14 }}>
                  <Svg width={44} height={44}>
                    <Circle cx={22} cy={22} r={22} fill="rgba(255,255,255,0.18)" />
                    <Path
                      d="M8 33V24H14V33M16 33V15H24V33M26 33V19H33V33M35 33V25H40V33"
                      stroke="#ffffff"
                      strokeWidth={1.4}
                      fill="none"
                    />
                  </Svg>
                </View>
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                    {city.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    {city.events === 0 ? 'No events yet' : `${city.events} upcoming`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Text style={{ fontSize: 13, color: C.muted }}>Pick a city to see what's happening.</Text>
    </View>
  );
}
