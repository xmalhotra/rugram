import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { Demonstrator } from '../../shared/movement-viewer';
import { usePaneState } from './pane-state';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export function MovementControls({
  controlMode,
  setControlMode,
  onInfo,
  informationLabel = 'Movement benefits',
  appearance = true,
  playback = true,
}: {
  controlMode: 'tilt' | 'slider';
  setControlMode: (mode: 'tilt' | 'slider') => void;
  onInfo: () => void;
  informationLabel?: string;
  appearance?: boolean;
  playback?: boolean;
}) {
  void onInfo;
  void informationLabel;
  const { colors: C } = useTheme();
  const [gender, setGender] = usePaneState<Demonstrator>('movementDemonstrator', 'male', 'account');
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      {appearance ? (
        <View
          style={{ flexDirection: 'row', gap: 4 }}
          accessibilityRole="radiogroup"
          accessibilityLabel="Demonstrator appearance"
        >
        {(['male', 'female'] as const).map(value => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} demonstrator`}
            accessibilityState={{ checked: gender === value }}
            onPress={() => {
              if (value !== gender) setGender(value);
            }}
            style={{
              minHeight: 44,
              minWidth: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: gender === value ? C.lime : C.line,
              backgroundColor: gender === value ? C.lime : 'transparent',
            }}
          >
            <Text style={{ color: gender === value ? C.onAccent : C.muted, fontSize: 24 }}>
              {value === 'male' ? '♂' : '♀'}
            </Text>
          </Pressable>
        ))}
        </View>
      ) : (
        <View />
      )}
      {playback && (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Movement control"
        style={{
          flexDirection: 'row',
          gap: 4,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 14,
          padding: 4,
        }}
      >
        {(['tilt', 'slider'] as const).map(mode => {
          const selected = controlMode === mode;
          return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`${mode === 'tilt' ? 'Tilt' : 'Slider'} control`}
            accessibilityState={{ checked: selected }}
            onPress={() => setControlMode(mode)}
            style={{
              minHeight: 44,
              paddingHorizontal: 12,
              justifyContent: 'center',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected ? C.lime : C.line,
              backgroundColor: selected ? C.lime : 'transparent',
            }}
          >
            <View style={{ alignItems: 'center', gap: 2 }}>
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name={mode === 'tilt' ? 'rotate.3d' : 'slider.horizontal.3'}
                  tintColor={selected ? C.onAccent : C.muted}
                  style={{ width: 18, height: 18 }}
                />
              ) : (
                <Text style={{ color: selected ? C.onAccent : C.muted, fontSize: 16 }}>
                  {mode === 'tilt' ? '↻' : '≡'}
                </Text>
              )}
              <Text
                style={{
                  color: selected ? C.onAccent : C.muted,
                  fontSize: 12,
                  lineHeight: 14,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {mode === 'tilt' ? 'Tilt' : 'Slider'}
              </Text>
            </View>
          </Pressable>
          );
        })}
      </View>
      )}
    </View>
  );
}
