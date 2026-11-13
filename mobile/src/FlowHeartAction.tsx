import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './design/Text';
import { opacity, radius, space, stroke, useTheme } from './design/theme';

/** Save a flow to your flows: an outlined "Save" that fills in as "✓ Saved". */
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
      accessibilityLabel={label ?? (added ? 'Remove from your flows' : 'Save to your flows')}
      accessibilityState={{ selected: added, disabled: busy, busy }}
      disabled={busy}
      onPress={onToggle}
      hitSlop={space.sm}
      style={({ pressed }) => ({
        minHeight: 34,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderWidth: stroke.line,
        borderColor: C.lime,
        backgroundColor: added ? C.lime : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <Text variant="subhead" style={{ color: added ? C.onAccent : C.lime, fontWeight: '600' }}>
        {added ? '✓ Saved' : 'Save'}
      </Text>
    </Pressable>
  );
}
