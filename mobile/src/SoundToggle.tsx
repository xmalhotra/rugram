import { Pressable } from 'react-native';
import { Glyph } from './design/Glyph';
import { hit, opacity, useTheme } from './design/theme';
import { useRunSound } from './run-sound';

/** The speaker in a workout's top bar. Turning it on plays the chime once, so you hear it works. */
export function SoundToggle() {
  const { colors: C } = useTheme();
  const [on, toggle] = useRunSound();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Workout sounds"
      accessibilityState={{ checked: on }}
      onPress={toggle}
      style={({ pressed }) => ({
        width: hit,
        height: hit,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      {/* A utility symbol: the text colour, not green. Off is muted. */}
      <Glyph
        name={on ? { ios: 'speaker.wave.2.fill', android: 'volume_up' } : { ios: 'speaker.slash.fill', android: 'volume_off' }}
        fallback={on ? '🔊' : '🔇'}
        color={on ? C.text : C.muted}
      />
    </Pressable>
  );
}
