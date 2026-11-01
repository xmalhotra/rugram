import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './design/theme';

export function FlowHeartAction({
  added,
  busy,
  onToggle,
  label,
}: {
  added: boolean;
  busy: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (added ? 'Remove flow from Home' : 'Add flow to Home')}
      accessibilityState={{ selected: added, disabled: busy, busy }}
      disabled={busy}
      onPress={onToggle}
      hitSlop={4}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <Svg width={27} height={27} viewBox="0 0 24 24" accessible={false}>
        <Path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
          fill={added ? '#E10600' : 'none'}
          stroke={added ? '#E10600' : C.muted}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
