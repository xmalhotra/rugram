import React from 'react';
import { Pressable } from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
      hitSlop={8}
      style={({ pressed }) => ({
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: C.lime,
        backgroundColor: added ? C.lime : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: busy ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <Text style={{ color: added ? C.onAccent : C.lime, fontSize: 14, fontWeight: '700' }}>
        {added ? '✓ Saved' : 'Save'}
      </Text>
    </Pressable>
  );
}
