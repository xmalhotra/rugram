import React from 'react';
import { Pressable, View } from 'react-native';
import { api } from './api';
import { useSession } from './session';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import type { MobilePayload } from '../../shared/mobile';

const choices = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;

export function AppearanceSettings() {
  const { data, setData, setBusy, setError } = useSession();
  const { colors: C } = useTheme();
  const current = data?.profile.appearance ?? 'system';
  return (
    <View style={{ paddingVertical: 14, gap: 10 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>Appearance</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {choices.map(choice => {
          const selected = current === choice.id;
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityLabel={`${choice.label} appearance`}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                setBusy(true);
                void api<MobilePayload>('/api/mobile', { action: 'appearance', value: choice.id })
                  .then(setData)
                  .catch(error =>
                    setError(
                      error instanceof Error ? error.message : 'Could not change appearance.',
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? C.text : C.line,
                backgroundColor: selected ? C.bg : 'transparent',
              }}
            >
              <Text style={{ color: selected ? C.text : C.muted, fontSize: 15 }}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
