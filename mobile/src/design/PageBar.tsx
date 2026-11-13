import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { hit, opacity, space, useTheme } from './theme';

/** X-style top bar for a pushed page: back chevron, centred title, optional action. */
export function PageBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: hit,
        paddingHorizontal: space.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({ width: hit, height: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="M15 5 8 12l7 7"
            stroke={C.text}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        variant="headline"
        style={{ flex: 1, textAlign: 'center', color: C.text }}
      >
        {title}
      </Text>
      <View style={{ minWidth: hit, alignItems: 'center' }}>{right}</View>
    </View>
  );
}
