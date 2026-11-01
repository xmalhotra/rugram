import React, { useEffect, useRef } from 'react';
import { AppState, Animated, Easing, StyleSheet, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme, ambient } from './theme';
import { useAnimations } from '../motion';

/**
 * Device tilt shared by every mounted backdrop, -1…1 on each axis relative to
 * how the phone is being held. The rest pose slowly follows the hand, so the
 * glows settle home when the phone is held still at a new angle.
 */
const tiltX = new Animated.Value(0);
const tiltY = new Animated.Value(0);
let tiltUsers = 0;
let stopTilt: (() => void) | null = null;

function startTilt() {
  let rest: { x: number; y: number } | null = null;
  let x = 0;
  let y = 0;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  Accelerometer.setUpdateInterval(33);
  const sensor = Accelerometer.addListener(sample => {
    if (AppState.currentState !== 'active') return;
    if (!rest) rest = { x: sample.x, y: sample.y };
    rest.x += (sample.x - rest.x) * 0.004;
    rest.y += (sample.y - rest.y) * 0.004;
    // About a quarter g of tilt (roughly 15°) reaches the edge of travel.
    x += (clamp((sample.x - rest.x) * 4) - x) * 0.2;
    y += (clamp((sample.y - rest.y) * 4) - y) * 0.2;
    tiltX.setValue(x);
    tiltY.setValue(y);
  });
  return () => {
    sensor.remove();
    Animated.parallel([
      Animated.timing(tiltX, { toValue: 0, duration: 400, useNativeDriver: false }),
      Animated.timing(tiltY, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  };
}

function useTilt(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    let joined = false;
    void Accelerometer.isAvailableAsync()
      .then(available => {
        if (cancelled || !available) return;
        joined = true;
        tiltUsers += 1;
        if (tiltUsers === 1) stopTilt = startTilt();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (!joined) return;
      tiltUsers -= 1;
      if (tiltUsers === 0) {
        stopTilt?.();
        stopTilt = null;
      }
    };
  }, [on]);
}

/** Moves a layer against the tilt; deeper layers travel further. */
function parallax(depth: number) {
  return [
    { translateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: [depth, -depth] }) },
    { translateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) },
  ];
}

/** Endless 0 → 1 sweep that restarts from 0. Parks at 0 when motion is off. */
function useSweep(on: boolean, duration: number, delay: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, value, duration, delay]);
  return value;
}

function Glow({ id, size, color, opacity }: { id: string; size: number; color: string; opacity: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

const rails = [0, 1, 2, 3, 4, 5, 6, 7];
const streakRails = [1, 4, 6];

/**
 * Ambient aurora: soft glows that shift at different depths as the phone
 * tilts, plus faint light falling down the rails in dark mode. Animated
 * transforms stay mounted when motion is off; removing a native-driven
 * transform mid-animation crashes on the new architecture.
 */
export function NeonBackdrop() {
  const { scheme, colors: C } = useTheme();
  const animations = useAnimations();
  useTilt(animations);
  const s0 = useSweep(animations, 2600, 900);
  const s1 = useSweep(animations, 3200, 2400);
  const s2 = useSweep(animations, 2900, 4100);
  const sweeps = [s0, s1, s2];
  if (scheme === 'light' && !animations) return null;
  const dark = scheme === 'dark';
  const glow = dark ? ambient.shadow : C.lime;
  const strength = dark ? 0.16 : 0.22;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -260,
          right: -240,
          transform: parallax(120),
        }}
      >
        <Glow id="neon-top" size={620} color={glow} opacity={strength} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: '38%',
          right: -180,
          transform: parallax(70),
        }}
      >
        <Glow id="neon-mid" size={360} color={dark ? '#3D8C79' : C.lime} opacity={strength * 0.7} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: -220,
          bottom: -120,
          transform: parallax(-90),
        }}
      >
        <Glow id="neon-bottom" size={520} color={glow} opacity={strength * 0.75} />
      </Animated.View>
      {dark &&
        rails.map(index => {
          const height = 110 + index * 16;
          const sweep = streakRails.indexOf(index);
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                right: 18 + index * 17,
                top: -30 + index * 8,
                width: 1,
                height,
                overflow: 'hidden',
                backgroundColor: ambient.rails[index],
              }}
            >
              {sweep >= 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 1,
                    height: 56,
                    opacity: animations ? 1 : 0,
                    transform: [
                      {
                        translateY: sweeps[sweep].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-56, height],
                        }),
                      },
                    ],
                  }}
                >
                  <Svg width={1} height={56}>
                    <Defs>
                      <LinearGradient id={`streak-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={ambient.shadow} stopOpacity={0} />
                        <Stop offset="1" stopColor={ambient.shadow} stopOpacity={0.55} />
                      </LinearGradient>
                    </Defs>
                    <Rect width={1} height={56} fill={`url(#streak-${index})`} />
                  </Svg>
                </Animated.View>
              )}
            </View>
          );
        })}
    </View>
  );
}
