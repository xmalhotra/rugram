import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { elapsedSeconds } from '../../shared/flow-run';
import { Text } from './design/Text';
import { Glyph } from './design/Glyph';
import { GlassSurface } from './design/parts';
import { layout, opacity, radius, space, useTheme } from './design/theme';
import { seedActiveRun, useActiveRun } from './active-run';
import { RUN_BAR_HEIGHT, useFloatingInsets } from './floating-insets';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * The run bar: docked full width just above the tab bar while a workout is open elsewhere.
 * Tap to go back to it. Pages leave room for it through `useFloatingInsets`.
 */
export function RunPip({ onPress }: { onPress: () => void }) {
  const { colors: C } = useTheme();
  const { runBarBottom } = useFloatingInsets();
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
  const word = paused ? 'Paused' : resting ? 'Resting' : 'In progress';
  const tone = paused ? C.warning : C.lime;
  const time = clock(elapsedSeconds(state, now));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${run.title} ${word.toLowerCase()}, exercise ${state.index + 1} of ${state.cards.length}, ${time}. Tap to go back.`}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        left: layout.margin,
        right: layout.margin,
        bottom: runBarBottom,
        zIndex: 100,
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <GlassSurface
        rounded
        style={{
          height: RUN_BAR_HEIGHT,
          borderRadius: radius.card,
          borderColor: tone,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.ms,
          paddingHorizontal: layout.inset,
        }}
      >
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: space.sm, height: space.sm, borderRadius: radius.pill, backgroundColor: tone }} />
          <Text variant="footnote" style={{ color: tone, fontWeight: '600' }}>
            {word}
          </Text>
        </View>
        <Text pointerEvents="none" variant="headline" numeric style={{ color: C.text }}>
          {time}
        </Text>
        <Text pointerEvents="none" variant="footnote" numberOfLines={1} style={{ flex: 1, minWidth: 0, color: C.muted }}>
          {state.index + 1} of {state.cards.length} · {run.title}
        </Text>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
      </GlassSurface>
    </Pressable>
  );
}
