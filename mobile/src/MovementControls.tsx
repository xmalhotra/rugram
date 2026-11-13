import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { Demonstrator } from '../../shared/movement-viewer';
import { usePaneState } from './pane-state';
import { Text } from './design/Text';
import { hit, radius, size, space, stroke, useTheme } from './design/theme';

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
        height: size.button,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.sm,
      }}
    >
      {/* Always shown so the bar never jumps between cards; greyed out where a card is a still. */}
      <View
        style={{ flexDirection: 'row', gap: space.xs, opacity: appearance ? 1 : 0.35 }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Demonstrator appearance"
        accessibilityState={{ disabled: !appearance }}
      >
        {(['male', 'female'] as const).map(value => {
          const on = appearance && gender === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value} demonstrator`}
              accessibilityState={{ checked: gender === value, disabled: !appearance }}
              disabled={!appearance}
              onPress={() => {
                if (value !== gender) setGender(value);
              }}
              style={{
                minHeight: hit,
                minWidth: hit,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.control,
                borderWidth: stroke.line,
                borderColor: on ? C.lime : C.line,
                backgroundColor: on ? C.lime : 'transparent',
              }}
            >
              <Text variant="heading" style={{ color: on ? C.onAccent : C.muted }}>
                {value === 'male' ? '♂' : '♀'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Movement control"
        accessibilityState={{ disabled: !playback }}
        style={{
          opacity: playback ? 1 : 0.35,
          flexDirection: 'row',
          gap: space.xs,
          backgroundColor: C.card,
          borderWidth: stroke.line,
          borderColor: C.line,
          borderRadius: radius.control,
          padding: space.xs,
        }}
      >
        {(['tilt', 'slider'] as const).map(mode => {
          const selected = controlMode === mode;
          // Only light up a mode on cards that can use it.
          const lit = playback && selected;
          return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`${mode === 'tilt' ? 'Tilt' : 'Slider'} control`}
            accessibilityState={{ checked: selected }}
            disabled={!playback}
            onPress={() => setControlMode(mode)}
            style={{
              minHeight: hit,
              paddingHorizontal: space.ms,
              justifyContent: 'center',
              borderRadius: radius.small,
              borderWidth: stroke.line,
              borderColor: lit ? C.lime : C.line,
              backgroundColor: lit ? C.lime : 'transparent',
            }}
          >
            <View style={{ alignItems: 'center', gap: space.xxs }}>
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name={mode === 'tilt' ? 'rotate.3d' : 'slider.horizontal.3'}
                  tintColor={lit ? C.onAccent : C.muted}
                  style={{ width: 18, height: 18 }}
                />
              ) : (
                <Text variant="callout" style={{ color: lit ? C.onAccent : C.muted }}>
                  {mode === 'tilt' ? '↻' : '≡'}
                </Text>
              )}
              <Text
                variant="caption"
                style={{
                  color: lit ? C.onAccent : C.muted,
                  fontWeight: lit ? '600' : '400',
                }}
              >
                {mode === 'tilt' ? 'Tilt' : 'Slider'}
              </Text>
            </View>
          </Pressable>
          );
        })}
      </View>
    </View>
  );
}
