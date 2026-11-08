import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { BrandMark } from './design/BrandMark';

const storageKey = 'qram-animations';
let enabled = true;
let touched = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

function publish(next: boolean) {
  touched = true;
  enabled = next;
  notify();
  void SecureStore.setItemAsync(storageKey, next ? 'on' : 'off');
}

/** Device preference. Reduce Motion always wins. */
export function useAnimations() {
  const [on, setOn] = useState(enabled);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const listener = () => setOn(current => (current === enabled ? current : enabled));
    listeners.add(listener);
    void SecureStore.getItemAsync(storageKey).then(value => {
      if (touched || (value !== 'on' && value !== 'off')) return;
      enabled = value === 'on';
      notify();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      listeners.delete(listener);
      subscription.remove();
    };
  }, []);
  return on && !reduce;
}

/** False only when the system's Reduce Motion is on. */
export function useMotionAllowed() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return !reduce;
}

export function setAnimationsEnabled(next: boolean) {
  publish(next);
}

export function AnimationSettings() {
  const { colors: C } = useTheme();
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    const listener = () => setOn(current => (current === enabled ? current : enabled));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Enable animations"
      accessibilityState={{ checked: on }}
      onPress={() => setAnimationsEnabled(!on)}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '500' }}>Enable animations</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>Login and loading</Text>
      </View>
      <Text style={{ color: on ? C.lime : C.muted, fontSize: 15, fontWeight: '600' }}>
        {on ? 'On' : 'Off'}
      </Text>
    </Pressable>
  );
}

export function LoadingPulse({ children }: { children: React.ReactNode }) {
  const animations = useAnimations();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!animations) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animations, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}


/**
 * The Qram mark while something loads: a glowing arc circles it, ripples
 * spread out, and the mark's own full stop hops like a typing cursor. With
 * motion off it sits still.
 */
/** Tints the mark drifts through after the brand lime while loading. */
const loaderAccents = ['#5EE6FF', '#B69CFF'] as const;

/**
 * The क्र. mark "booms": it swells, settles smaller, then returns to size, sending a ripple out
 * on each beat while its colour drifts lime → cyan → violet. Static when animations are off.
 */
export function LogoLoader({ size = 64, label = 'Loading' }: { size?: number; label?: string }) {
  const { colors: C } = useTheme();
  const animations = useAnimations();
  const loaderTints = [C.lime, ...loaderAccents];
  const beat = useRef(new Animated.Value(0)).current;
  const hue = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animations) {
      [beat, hue, ripple].forEach(value => value.setValue(0));
      return;
    }
    const step = (value: Animated.Value, toValue: number, duration: number, easing: (t: number) => number) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });
    const loops = [
      // 0 → 1 swell, → -1 settle smaller, → 0 rest.
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            step(beat, 1, 240, Easing.out(Easing.back(2))),
            step(ripple, 1, 900, Easing.out(Easing.cubic)),
          ]),
          step(beat, -1, 260, Easing.inOut(Easing.quad)),
          step(beat, 0, 320, Easing.out(Easing.quad)),
          step(ripple, 0, 0, Easing.linear),
          Animated.delay(380),
        ]),
      ),
      Animated.loop(step(hue, loaderAccents.length + 1, 1200 * (loaderAccents.length + 1), Easing.linear)),
    ];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [animations, beat, hue, ripple]);
  const box = size * 2.2;
  const ring = size * 1.6;
  const scale = beat.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.86, 1, 1.22] });
  const tintOpacity = (index: number) => {
    const count = loaderTints.length;
    // Each tint peaks at its own index; the first also peaks at the end so the loop wraps smoothly.
    const inputRange = Array.from({ length: count + 1 }, (_, value) => value);
    const outputRange = inputRange.map(value => (value % count === index ? 1 : 0));
    return hue.interpolate({ inputRange, outputRange });
  };
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ position: 'absolute' }}>
        <Svg width={box} height={box}>
          <Defs>
            <RadialGradient id="logo-halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.lime} stopOpacity={0.22} />
              <Stop offset="0.6" stopColor={C.lime} stopOpacity={0.05} />
              <Stop offset="1" stopColor={C.lime} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={box} height={box} fill="url(#logo-halo)" />
        </Svg>
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 1.5,
          borderColor: C.lime,
          opacity: ripple.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.45, 0] }),
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
        }}
      />
      <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
        {loaderTints.map((tint, index) => (
          <Animated.View
            key={index}
            style={[
              index ? { position: 'absolute' } : null,
              { opacity: animations ? tintOpacity(index) : index ? 0 : 1 },
            ]}
          >
            <BrandMark size={size} color={tint} />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}
