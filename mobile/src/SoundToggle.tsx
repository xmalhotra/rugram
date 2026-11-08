import { Platform, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
      hitSlop={6}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      {Platform.OS === 'ios' ? (
        <SymbolView
          name={on ? 'speaker.wave.2.fill' : 'speaker.slash.fill'}
          tintColor={on ? C.lime : C.muted}
          style={{ width: 24, height: 24 }}
        />
      ) : (
        <Text style={{ color: on ? C.lime : C.muted, fontSize: 18 }}>{on ? '🔊' : '🔇'}</Text>
      )}
    </Pressable>
  );
}
