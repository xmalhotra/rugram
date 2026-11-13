import React, { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Text } from './design/Text';
import { Button, GlassSurface, ProgressSteps, TimerBar } from './design/parts';
import { layout, size, space, useTheme } from './design/theme';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A glass bar floating at the screen's bottom edge, over whatever scrolls behind it. */
export function GlassBar({ bottom, children }: { bottom: number; children: React.ReactNode }) {
  return (
    <GlassSurface
      edge="top"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingTop: space.ms,
        paddingHorizontal: layout.margin,
        paddingBottom: bottom,
      }}
    >
      {children}
    </GlassSurface>
  );
}

/**
 * The bar that stays at the bottom during a workout. One clock with its word (Rest, Hold or
 * Elapsed), the step bar, and the buttons. Rules: docs/design-consistency.md, section 2.7.
 */
export function RunFooter({
  noun,
  index,
  total,
  elapsed,
  paused = false,
  hold,
  restLeft,
  onSkipRest,
  onHarder,
  onEasier,
  ready,
  emphasis = 'primary',
  hint,
  onNext,
  skipLabel,
  onSkip,
  pauseLabel,
  onPause,
  onEndEarly,
  bottom,
  onHeight,
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
  onSkipRest?: () => void;
  /** Rest 30 seconds longer. Shown beside the clock while resting. */
  onHarder?: () => void;
  /** Rest 30 seconds less. */
  onEasier?: () => void;
  ready: boolean;
  /**
   * Whether Next is the screen's one filled button. While sets remain, the set's tick is the
   * filled one and Next is outlined.
   */
  emphasis?: 'primary' | 'secondary';
  /** Shown for a moment when Next is tapped before every set is dealt with. */
  hint: string;
  onNext: () => void;
  /** Null hides Skip. */
  skipLabel: string | null;
  onSkip: () => void;
  pauseLabel?: string;
  onPause?: () => void;
  /**
   * Leave this exercise before every set is done. Shown, quietly, only while Next is hidden.
   * Without it, the hint takes Next's place instead.
   */
  onEndEarly?: () => void;
  bottom: number;
  /** The bar's height, so the screen above can leave room for it. */
  onHeight?: (height: number) => void;
}) {
  const { colors: C } = useTheme();
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
  const timer = resting
    ? { word: 'Rest', time: clock(restLeft), spoken: `Rest, ${clock(restLeft)} left` }
    : hold
      ? {
          word: 'Hold',
          time: hold.target > 0 ? `${clock(hold.seconds)} / ${clock(hold.target)}` : clock(hold.seconds),
          spoken: `Hold time ${clock(hold.seconds)}`,
        }
      : elapsed !== undefined
        ? { word: 'Elapsed', time: clock(elapsed), spoken: `Elapsed ${clock(elapsed)}` }
        : null;
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
  // Left slot, first that applies: Skip (nothing logged yet), Skip rest, then End exercise.
  const left = skipLabel
    ? { label: skipLabel, onPress: onSkip }
    : resting && onSkipRest
      ? { label: 'Skip rest', onPress: onSkipRest }
      : !ready && onEndEarly
        ? { label: 'End exercise', onPress: onEndEarly }
        : null;
  return (
    <GlassSurface
      edge="top"
      onLayout={(event: LayoutChangeEvent) => onHeight?.(event.nativeEvent.layout.height)}
      style={{
        // Floats over the sets as glass, down to the screen's edge.
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        gap: space.ms,
        paddingTop: space.ms,
        paddingHorizontal: layout.margin,
        paddingBottom: bottom,
      }}
    >
      {timer ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {resting && onEasier ? (
            <Button
              variant="secondary"
              tone="neutral"
              size="regular"
              fit
              title="−30 s"
              accessibilityLabel="Rest 30 seconds less"
              onPress={onEasier}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <TimerBar
              word={timer.word}
              time={timer.time}
              fill={fill}
              paused={paused}
              accessibilityLabel={`${paused ? 'Paused, ' : ''}${timer.spoken}`}
            />
          </View>
          {resting && onHarder ? (
            <Button
              variant="secondary"
              tone="neutral"
              size="regular"
              fit
              title="+30 s"
              accessibilityLabel="Rest 30 seconds longer"
              onPress={onHarder}
            />
          ) : null}
        </View>
      ) : null}
      {hintOn && hint ? (
        <Text accessibilityLiveRegion="polite" variant="footnote" style={{ color: C.text, fontWeight: '600' }}>
          {hint}
        </Text>
      ) : null}
      <View accessible accessibilityLabel={`${noun} ${index + 1} of ${total}`}>
        <ProgressSteps total={total} filled={index + 1} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.button }}>
        {left ? <Button variant="text" tone="neutral" title={left.label} onPress={left.onPress} /> : null}
        <View style={{ flex: 1 }}>
          {/* Next shows only when it can be used. Until then nothing pretends to be a button. */}
          {ready ? (
            <Button variant={emphasis === 'primary' ? 'primary' : 'secondary'} title={nextLabel} onPress={pressNext} />
          ) : !onEndEarly && hint ? (
            <Text variant="footnote" style={{ color: C.muted, textAlign: 'center' }}>
              {hint}
            </Text>
          ) : null}
        </View>
        {pauseLabel && onPause ? <Button variant="text" tone="neutral" title={pauseLabel} onPress={onPause} /> : null}
      </View>
    </GlassSurface>
  );
}
