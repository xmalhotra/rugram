import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elapsedSeconds } from '../../shared/flow-run';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { seedActiveRun, useActiveRun } from './active-run';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A small square in the bottom right, above the tab bar, while a workout is in progress elsewhere. Tap to go back to it. */
export function RunPip({ onPress }: { onPress: () => void }) {
  const { colors: C, scheme } = useTheme();
  const bottom = useSafeAreaInsets().bottom;
  const { run, screenOpen } = useActiveRun();
  const [now, setNow] = useState(() => Date.now());
  const visible = Boolean(run) && !screenOpen;
  useEffect(() => {
    seedActiveRun();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible]);
  if (!run || !visible) return null;
  const { state } = run;
  const paused = state.pausedAt != null;
  const resting = state.phase === 'rest';
  const time = clock(elapsedSeconds(state, now));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${run.title} in progress, exercise ${state.index + 1} of ${state.cards.length}${paused ? ', paused' : ''}. Tap to go back.`}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        // Clears the floating tab bar, which sits above the home indicator.
        bottom: bottom + 76,
        right: 12,
        width: 92,
        height: 92,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: paused ? C.warning : C.lime,
        opacity: pressed ? 0.8 : 1,
        zIndex: 100,
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      })}
    >
      {/* Decoration and text never take the touch, so the whole square opens the workout. */}
      <BlurView pointerEvents="none" intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: 0.55 }]} />
      <View pointerEvents="none" style={{ flex: 1, padding: 8, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: paused ? C.warning : C.lime }} />
          <Text style={{ color: paused ? C.warning : C.lime, fontSize: 11, fontWeight: '700' }}>
            {paused ? 'Paused' : resting ? 'Resting' : 'In progress'}
          </Text>
        </View>
        <Text variant="numeric" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          {time}
        </Text>
        <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>
          {state.index + 1} of {state.cards.length} · {run.title}
        </Text>
      </View>
    </Pressable>
  );
}
