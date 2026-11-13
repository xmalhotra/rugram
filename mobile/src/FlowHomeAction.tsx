import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import { Button } from './design/components';
import { hit, opacity, space, useTheme } from './design/theme';

export function FlowHomeAction({
  added,
  busy,
  onAdd,
  onHome,
  onRemove,
}: {
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onHome: () => void;
  onRemove: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Button
        title={busy ? 'Saving…' : added ? 'View on Home →' : 'Add to Home'}
        accessibilityLabel={added ? 'View flow on Home' : 'Add flow to Home'}
        disabled={busy}
        onPress={added ? onHome : onAdd}
      />
      {added && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove flow from Home"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onRemove}
          style={({ pressed }) => ({
            minHeight: hit,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? opacity.disabled : pressed ? opacity.pressed : 1,
          })}
        >
          <Text variant="subhead" style={{ color: C.muted }}>
            Remove from Home
          </Text>
        </Pressable>
      )}
    </View>
  );
}
