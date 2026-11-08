import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A glass bar floating at the screen's bottom edge, over whatever scrolls behind it. */
export function GlassBar({ bottom, children }: { bottom: number; children: React.ReactNode }) {
  const { colors: C, scheme } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: bottom,
        borderTopWidth: 0.5,
        borderColor: C.line,
      }}
    >
      <BlurView intensity={30} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: 0.15 }]} />
      {children}
    </View>
  );
}

/** The bar that stays at the bottom during a workout: where you are, rest, and what's next. */
export function RunFooter({
  noun,
  index,
  total,
  elapsed,
  paused = false,
  hold,
  restLeft,
  onSkipRest,
  ready,
  hint,
  onNext,
  skipLabel,
  onSkip,
  pauseLabel,
  onPause,
  bottom,
}: {
  noun: string;
  index: number;
  total: number;
  elapsed?: number;
  /** Shown clearly, so it's obvious the clock has stopped. */
  paused?: boolean;
  /** A hold being timed right now, and what it's aiming for. */
  hold?: { seconds: number; target: number } | null;
  restLeft: number;
  onSkipRest: () => void;
  ready: boolean;
  /** Shown for a moment when Next is tapped before every set is dealt with. */
  hint: string;
  onNext: () => void;
  /** Null hides Skip. */
  skipLabel: string | null;
  onSkip: () => void;
  pauseLabel?: string;
  onPause?: () => void;
  bottom: number;
}) {
  const { colors: C, scheme } = useTheme();
  const last = index + 1 >= total;
  const nextLabel = last ? 'Finish' : `Next ${noun.toLowerCase()}`;
  // Rest has no stated length here, so the longest value seen since it began is its length.
  const restTotal = useRef(0);
  if (restLeft <= 0) restTotal.current = 0;
  else if (restLeft > restTotal.current) restTotal.current = restLeft;
  const resting = restLeft > 0;
  const fill = resting
    ? 1 - restLeft / Math.max(1, restTotal.current)
    : hold && hold.target > 0
      ? Math.min(1, hold.seconds / hold.target)
      : 0;
  const timerLabel = resting
    ? `${ready && !last ? 'Next in' : 'Rest'} ${clock(restLeft)}`
    : hold
      ? hold.target > 0
        ? `${clock(hold.seconds)} / ${clock(hold.target)}`
        : clock(hold.seconds)
      : elapsed !== undefined
        ? clock(elapsed)
        : null;
  const pausedLook = paused && timerLabel != null;
  const [hintOn, setHintOn] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );
  const pressNext = () => {
    if (!ready) {
      setHintOn(true);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHintOn(false), 2000);
      return;
    }
    setHintOn(false);
    onNext();
  };
  const quiet = (label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 64,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View
      style={{
        // Floats over the sets as glass, like the top bar, down to the screen's edge.
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        gap: 10,
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: bottom,
        borderTopWidth: 0.5,
        borderColor: C.line,
      }}
    >
      <BlurView intensity={30} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: 0.15 }]} />
      {timerLabel ? (
        <View
          accessibilityRole="timer"
          accessibilityLabel={resting ? `Rest, ${clock(restLeft)} left` : hold ? 'Hold time' : 'Elapsed'}
          style={{
            height: 48,
            borderRadius: 14,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pausedLook ? 'transparent' : C.line,
            borderWidth: pausedLook ? 2 : 0,
            borderColor: C.warning,
          }}
        >
          {/* Fills from the left as the rest or hold goes on. */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.round(fill * 100)}%`,
              backgroundColor: C.lime,
              opacity: 0.45,
            }}
          />
          <Text variant="numeric" style={{ color: pausedLook ? C.warning : C.text, fontSize: 24, fontWeight: '700' }}>
            {pausedLook ? `Paused · ${timerLabel}` : timerLabel}
          </Text>
          {resting ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip rest"
              onPress={onSkipRest}
              hitSlop={10}
              style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>Skip rest</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
        {hintOn && hint ? hint : `${noun} ${index + 1} of ${total}`}
      </Text>
      <View accessible={false} style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }, (_, step) => (
          <View
            key={step}
            style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step <= index ? C.lime : C.line }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {skipLabel ? quiet(skipLabel, onSkip) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          accessibilityHint={ready ? undefined : hint}
          accessibilityState={{ disabled: !ready }}
          onPress={pressNext}
          style={{
            flex: 1,
            minHeight: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.lime,
            opacity: ready ? 1 : 0.4,
          }}
        >
          <Text style={{ color: C.onAccent, fontSize: 17, fontWeight: '700' }}>{nextLabel}</Text>
        </Pressable>
        {pauseLabel && onPause ? quiet(pauseLabel, onPause) : null}
      </View>
    </View>
  );
}
