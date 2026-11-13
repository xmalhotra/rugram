import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { opacity, radius, space, useTheme } from './theme';

/**
 * The span switch above a calendar or a map: an outlined track with a raised selected segment,
 * so it reads the same way in both themes.
 */
export function SpanSwitch<T extends string>({
  options,
  value,
  onChange,
  width = 174,
  noun = 'view',
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (id: T) => void;
  width?: ViewStyle['width'];
  /** Follows the option's label in its spoken name, as in "Week view". */
  noun?: string;
}) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        width,
        height: 32,
        padding: space.xxs,
        borderRadius: radius.small,
        flexDirection: 'row',
        backgroundColor: C.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: C.line,
      }}
    >
      {options.map(([id, label]) => {
        const selected = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${noun}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(id)}
            hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => ({
              flex: 1,
              borderRadius: radius.small - space.xxs,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? C.card : 'transparent',
              borderWidth: selected ? StyleSheet.hairlineWidth : 0,
              borderColor: C.line,
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Text numberOfLines={1} variant="footnote" style={{ color: selected ? C.lime : C.muted, fontWeight: '600' }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
