import React from 'react';
import { Animated, Platform, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

function markStyle(size: number, color: string) {
  return {
    color,
    fontSize: size,
    fontFamily: Platform.OS === 'ios' ? 'KohinoorDevanagari-Semibold' : 'sans-serif',
    fontWeight: Platform.OS === 'ios' ? ('normal' as const) : ('600' as const),
  };
}

/**
 * The क्र. mark. Pass `dotTransform` to animate the full stop on its own; the
 * glyph and the dot then sit on a shared baseline.
 */
export function BrandMark({
  size = 22,
  dotTransform,
  color,
}: {
  size?: number;
  /** Defaults to the brand lime; the loader cycles other tints. */
  color?: string;
  dotTransform?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  const { colors: C } = useTheme();
  const style = markStyle(size, color ?? C.lime);
  const lift = { transform: [{ translateY: -Math.round(size * 0.12) }] };
  if (!dotTransform)
    return (
      <Text accessibilityLabel="Qram" style={[style, lift]}>
        क्र.
      </Text>
    );
  return (
    <View
      accessible
      accessibilityLabel="Qram"
      style={[{ flexDirection: 'row', alignItems: 'baseline' }, lift]}
    >
      <Text style={style}>क्र</Text>
      <Animated.View style={dotTransform}>
        <Text style={style}>.</Text>
      </Animated.View>
    </View>
  );
}
