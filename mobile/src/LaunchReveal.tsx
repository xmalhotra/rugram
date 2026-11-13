import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useColorScheme, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash up until the overlay below is on screen, so the hand-off doesn't flicker.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Matches the native splash exactly: its background, and the mark at the size the splash draws it
 * (544 × 347 px of a 1024 px image shown 180 pt wide).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro needs literal requires for images. */
const splash = {
  dark: { background: '#050706', mark: require('../assets/brand/launch-mark-dark.png') as number },
  light: { background: '#F2F2F7', mark: require('../assets/brand/launch-mark-light.png') as number },
};
/* eslint-enable @typescript-eslint/no-require-imports */
const markWidth = (544 * 180) / 1024;
const markHeight = (347 * 180) / 1024;

/** Timings, in ms. The mark holds until the app is ready, settles back a little, then flies through. */
const settleMs = 260;
const zoomMs = 320;
const clearMs = 120;
const settleScale = 0.82;
const zoomScale = 22;
/** Long enough to register as a moment, even when everything loads at once. */
const minimumHoldMs = 450;

const LaunchContext = createContext<() => void>(() => undefined);

/** Call once the first real screen can show: the mark then flies through to reveal it. */
export function useLaunchReady(ready: boolean) {
  const markReady = useContext(LaunchContext);
  useEffect(() => {
    if (ready) markReady();
  }, [ready, markReady]);
}

/**
 * The launch animation: the splash mark on its own background holds while the app loads underneath,
 * eases back, then zooms past the screen as the background drops away. With Reduce Motion on, it fades.
 */
export function LaunchReveal({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const look = splash[scheme];
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const shownAt = useRef(Date.now());
  const scale = useRef(new Animated.Value(1)).current;
  const backdrop = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(1)).current;
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready || done) return;
    let cancelled = false;
    const wait = Math.max(0, minimumHoldMs - (Date.now() - shownAt.current));
    const timer = setTimeout(() => {
      void AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then(reduce => {
          if (cancelled) return;
          const finish = () => {
            if (!cancelled) setDone(true);
          };
          if (reduce) {
            Animated.parallel([
              Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
              Animated.timing(mark, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(finish);
            return;
          }
          Animated.sequence([
            Animated.timing(scale, {
              toValue: settleScale,
              duration: settleMs,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.parallel([
              Animated.timing(scale, {
                toValue: zoomScale,
                duration: zoomMs,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              // The background goes first, so the app shows through behind the growing mark.
              Animated.timing(backdrop, { toValue: 0, duration: clearMs, useNativeDriver: true }),
              Animated.sequence([
                Animated.delay(zoomMs - clearMs),
                Animated.timing(mark, { toValue: 0, duration: clearMs, useNativeDriver: true }),
              ]),
            ]),
          ]).start(finish);
        });
    }, wait);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, done, scale, backdrop, mark]);

  return (
    <LaunchContext.Provider value={markReady}>
      <View style={{ flex: 1 }}>
        {children}
        {done ? null : (
          <View
            pointerEvents={ready ? 'none' : 'auto'}
            accessible
            accessibilityLabel="Opening Qram"
            style={StyleSheet.absoluteFill}
            onLayout={() => void SplashScreen.hideAsync().catch(() => undefined)}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: look.background, opacity: backdrop }]} />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Animated.View style={{ opacity: mark, transform: [{ scale }] }}>
                <Image source={look.mark} style={{ width: markWidth, height: markHeight }} resizeMode="contain" />
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </LaunchContext.Provider>
  );
}
