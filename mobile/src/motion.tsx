import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
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
        <Text style={{ color: C.muted, fontSize: 13 }}>Login, background, and loading</Text>
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
export function LogoLoader({ size = 64, label = 'Loading' }: { size?: number; label?: string }) {
  const { colors: C } = useTheme();
  const animations = useAnimations();
  const spin = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const rippleA = useRef(new Animated.Value(0)).current;
  const rippleB = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animations) {
      [spin, hop, rippleA, rippleB].forEach(value => value.setValue(0));
      return;
    }
    const ripple = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(1000 - delay),
        ]),
      );
    const loops = [
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(hop, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(hop, {
            toValue: 0,
            duration: 320,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.delay(500),
        ]),
      ),
      ripple(rippleA, 0),
      ripple(rippleB, 1000),
    ];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [animations, spin, hop, rippleA, rippleB]);
  const box = size * 2.2;
  const ring = size * 1.6;
  const stroke = 2;
  const radius = ring / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const rippleStyle = (value: Animated.Value) => ({
    position: 'absolute' as const,
    width: ring,
    height: ring,
    borderRadius: ring / 2,
    borderWidth: 1.5,
    borderColor: C.lime,
    opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.4, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.35] }) }],
  });
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
      <Animated.View style={rippleStyle(rippleA)} />
      <Animated.View style={rippleStyle(rippleB)} />
      <Animated.View
        style={{
          position: 'absolute',
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      >
        <Svg width={ring} height={ring}>
          <Defs>
            <LinearGradient id="logo-arc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={C.lime} stopOpacity={1} />
              <Stop offset="1" stopColor={C.lime} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            stroke={C.line}
            strokeWidth={1}
            fill="none"
          />
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            stroke="url(#logo-arc)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.3} ${circumference}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
      <BrandMark
        size={size}
        dotTransform={{
          transform: [
            {
              translateY: hop.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -size * 0.22],
              }),
            },
            { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        }}
      />
    </View>
  );
}
