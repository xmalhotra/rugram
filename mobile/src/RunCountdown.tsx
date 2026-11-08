import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { playRunSound } from './run-sound';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const size = 240;
const stroke = 12;
const radius = (size - stroke) / 2;
const around = 2 * Math.PI * radius;
const seconds = 3;

/**
 * 3, 2, 1 before an exercise opens, over the exercise itself. The ring's colour drains away
 * anticlockwise from the top. Tap to skip.
 */
export function RunCountdown({ name, onDone }: { name?: string; onDone?: () => void }) {
  const { colors: C } = useTheme();
  const [left, setLeft] = useState(seconds);
  const drain = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  function finish() {
    if (finished.current) return;
    finished.current = true;
    void playRunSound('go');
    setLeft(0);
    doneRef.current?.();
  }
  useEffect(() => {
    void Haptics.selectionAsync().catch(() => undefined);
    void playRunSound('tick');
    // JS driver: an SVG stroke can't animate on the native thread.
    const ring = Animated.timing(drain, {
      toValue: 1,
      duration: seconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    ring.start(({ finished: completed }) => {
      if (completed) finish();
    });
    const started = Date.now();
    const timer = setInterval(() => {
      const next = seconds - Math.floor((Date.now() - started) / 1000);
      if (next <= 0) {
        finish();
        return;
      }
      setLeft(current => {
        if (next === current) return current;
        void Haptics.selectionAsync().catch(() => undefined);
        void playRunSound('tick');
        return next;
      });
    }, 100);
    return () => {
      ring.stop();
      clearInterval(timer);
    };
  }, [drain]);
  if (left <= 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Starting in ${left}. Tap to start now.`}
      onPress={finish}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        backgroundColor: C.bg,
      }}
    >
      {name ? (
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 }}>
          {name}
        </Text>
      ) : null}
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={size}
          height={size}
          accessible={false}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.line} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={C.lime}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${around} ${around}`}
            strokeDashoffset={drain.interpolate({ inputRange: [0, 1], outputRange: [0, around] })}
          />
        </Svg>
        <Text variant="numeric" style={{ color: C.text, fontSize: 96, fontWeight: '700' }}>
          {left}
        </Text>
      </View>
    </Pressable>
  );
}
