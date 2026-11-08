import { flowCreationEnabled } from '../../shared/flow-catalog';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { Avatar } from './design/components';
import { BrandMark } from './design/BrandMark';
import { Sparkle } from './CommunityFeed';
import { useAnimations, useMotionAllowed } from './motion';
import { curationLimits } from '../../shared/community-flows';

export type HomeTab = 'for-you' | 'following' | 'yours';
// X's underline: its label's width plus a little on each side, 3pt tall, fully rounded.
// It is drawn at `indicatorBase` wide and scaled, so width and position both animate natively.
const indicatorBase = 100;
const indicatorPadding = 16;
const indicatorHeight = 3;
/** A tab in the top bar. `menu` marks Home's For you: sparkle, chevron and the prompt menu. */
export type BarTab = { id: string; label: string; menu?: boolean };
export const homeTabs: BarTab[] = [
  { id: 'for-you', label: 'For you', menu: flowCreationEnabled },
  { id: 'following', label: 'Following' },
  { id: 'yours', label: 'Yours' },
];

const suggestions = [
  'A calm morning before work',
  'Pull day for beginners',
  'Easy running week',
  'Deep focus at my desk',
];

/** Opens from the For you tab: ask for a sequence, or pick a suggestion. */
function CurateMenu({ prompt, onAsk }: { prompt: string; onAsk: (prompt: string) => void }) {
  const { colors: C } = useTheme();
  const [draft, setDraft] = useState(prompt);
  const submit = (value: string) => {
    const next = value.replace(/\s+/g, ' ').trim();
    if (next.length >= 2) onAsk(next);
  };
  const row = (label: string, onPress: () => void, accent = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 48,
        paddingHorizontal: 16,
        borderTopWidth: 0.5,
        borderColor: C.line,
        backgroundColor: pressed ? C.card : 'transparent',
      })}
    >
      <Sparkle size={16} color={accent ? C.lime : C.muted} />
      <Text style={{ flex: 1, color: accent ? C.lime : C.text, fontSize: 16 }}>{label}</Text>
      <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
  return (
    <View style={{ paddingTop: 12, borderTopWidth: 0.5, borderColor: C.line }}>
      <Text style={{ color: C.muted, fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 }}>
        Curate For you with a prompt
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginHorizontal: 16,
          marginBottom: 12,
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 22,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
        }}
      >
        <Sparkle size={16} />
        <TextInput
          autoFocus
          accessibilityLabel="Describe the sequence you want"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => submit(draft)}
          placeholder="Describe what you want, e.g. 20-min morning"
          placeholderTextColor={C.muted}
          returnKeyType="search"
          maxLength={curationLimits.prompt}
          style={{ flex: 1, minWidth: 0, color: C.text, fontSize: 16, paddingVertical: 10 }}
        />
      </View>
      {prompt ? row('Show all of For you', () => onAsk(''), true) : null}
      <Text
        style={{
          color: C.muted,
          fontSize: 13,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 6,
        }}
      >
        Try
      </Text>
      {suggestions.map(suggestion => row(suggestion, () => submit(suggestion)))}
    </View>
  );
}

/** X-style "more options" chevron; flips while the menu is open. */
function Chevron({ open }: { open: boolean }) {
  const { colors: C } = useTheme();
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      accessible={false}
      style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
    >
      <Path
        d="M6 9.5 12 15.5 18 9.5"
        stroke={C.muted}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Home's timeline header: profile, centred mark, alerts, then underlined tabs. Slides with `translateY`. */
export function HomeHeader({
  name,
  avatarUrl,
  tab,
  onTab,
  onProfile,
  right,
  translateY,
  onLayout,
  menuOpen,
  onMenu,
  prompt,
  onAsk,
  statusBar,
  baseHeight,
  tabs,
  progress,
}: {
  name: string;
  avatarUrl: string | null;
  tab: string;
  onTab: (tab: string) => void;
  onProfile: () => void;
  right: React.ReactNode;
  translateY: Animated.AnimatedInterpolation<number>;
  /** Measures the header without the menu, so opening it overlays the feed instead of moving it. */
  onLayout: (event: LayoutChangeEvent) => void;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  prompt: string;
  onAsk: (prompt: string) => void;
  /** Height of the status bar; the glass extends behind it and that strip never scrolls away. */
  statusBar: number;
  /** Measured height of the profile row and tabs, from `onLayout`. */
  baseHeight: number;
  /** The screen's sections; omitted where a screen has none. */
  tabs?: BarTab[];
  /**
   * Fractional tab index while the feed is dragged between sections.
   * When set, the underline tracks it instead of the timed slide.
   */
  progress?: Animated.Value;
}) {
  const { colors: C, scheme } = useTheme();
  const [slots, setSlots] = useState<Partial<Record<string, { x: number; width: number }>>>({});
  // The underline shows which tab you moved to, so only the system's Reduce Motion stops its slide.
  const animations = useMotionAllowed();
  // One fixed-width indicator that slides to the selected tab. Only translateX moves,
  // on the native thread, so it stays smooth.
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(0)).current;
  const aimed = useRef<string | null>(null);
  const switching = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [labels, setLabels] = useState<Partial<Record<string, number>>>({});
  // The tapped tab looks selected at once; the feed follows when the slide lands.
  const [pending, setPending] = useState<string | null>(null);
  const shown = pending ?? tab;
  useEffect(() => setPending(null), [tab]);
  // Layout signature so a fresh `tabs` array with the same measurements does not rebuild the native nodes.
  const measureKey =
    tabs
      ?.map(item => `${item.id}:${slots[item.id]?.x}:${slots[item.id]?.width}:${labels[item.id]}`)
      .join('|') ?? '';
  const track = useMemo(() => {
    if (!progress || !tabs || tabs.length < 2) return null;
    if (!tabs.every(item => slots[item.id] && labels[item.id])) return null;
    const inputRange = tabs.map((_, itemIndex) => itemIndex);
    return {
      x: progress.interpolate({
        inputRange,
        outputRange: tabs.map(item => {
          const slot = slots[item.id]!;
          return slot.x + slot.width / 2 - indicatorBase / 2;
        }),
      }),
      scale: progress.interpolate({
        inputRange,
        outputRange: tabs.map(item => (labels[item.id]! + indicatorPadding) / indicatorBase),
      }),
    };
    // `measureKey` already folds in tab order and every measured slot and label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, measureKey]);
  function place(target: string, animate: boolean) {
    const slot = slots[target];
    const label = labels[target];
    if (!slot || !label) return false;
    const width = label + indicatorPadding;
    // Scaling is about the bar's centre, so translate puts that centre under the tab.
    const x = slot.x + slot.width / 2 - indicatorBase / 2;
    const scale = width / indicatorBase;
    const key = `${x}:${scale}`;
    if (aimed.current === key) return true;
    const first = aimed.current === null;
    aimed.current = key;
    if (first || !animate || !animations) {
      indicatorX.setValue(x);
      indicatorScale.setValue(scale);
      return true;
    }
    const timing = { duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel([
      Animated.timing(indicatorX, { ...timing, toValue: x }),
      Animated.timing(indicatorScale, { ...timing, toValue: scale }),
    ]).start();
    return true;
  }
  // Follows the shown tab on first layout, when a label's width changes, or a change from elsewhere.
  // A shared drag progress drives the underline itself once every tab has been measured.
  useEffect(() => {
    if (track) return;
    place(shown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, slots, labels, animations, track]);
  useEffect(() => () => clearTimeout(switching.current ?? undefined), []);
  /**
   * Starts the slide first and swaps the feed once it has nearly landed. Mounting a feed
   * is heavy, and doing both at once is what made the underline stutter.
   */
  function choose(next: string) {
    if (progress) return onTab(next);
    if (!animations || !place(next, true)) return onTab(next);
    setPending(next);
    clearTimeout(switching.current ?? undefined);
    switching.current = setTimeout(() => onTab(next), 200);
  }
  const glass = (opacity: number) => (
    <>
      <BlurView
        intensity={30}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity }]} />
    </>
  );
  // One glass layer from the screen top, so the status bar and header never show a seam.
  // It shrinks to the status bar while the header content slides up inside it.
  // Only transform and opacity animate, so scrolling stays on the native thread.
  // The glass slides with the header; once it has gone, a tinted strip keeps the status bar readable.
  const strip = baseHeight
    ? translateY.interpolate({
        inputRange: [-baseHeight, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 0;
  return (
    <>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          overflow: 'hidden',
          borderBottomWidth: 0.5,
          borderColor: C.line,
          transform: [{ translateY }],
        }}
      >
        {glass(menuOpen ? 0.8 : 0.15)}
        <View style={{ paddingTop: statusBar }}>
          <View onLayout={onLayout}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                minHeight: 52,
                paddingBottom: tabs ? 0 : 6,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open your profile"
                onPress={onProfile}
                hitSlop={8}
                style={{ width: 48 }}
              >
                <Avatar name={name} uri={avatarUrl} size={36} />
              </Pressable>
              <BrandMark size={30} />
              <View style={{ width: 48, alignItems: 'flex-end' }}>{right}</View>
            </View>
            {tabs && (
            <View accessibilityRole="tablist" style={{ flexDirection: 'row' }}>
              {tabs.map(item => {
                const active = item.id === shown;
                const forYou = Boolean(item.menu);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{
                      selected: active,
                      expanded: forYou ? menuOpen : undefined,
                    }}
                    accessibilityHint={forYou && active ? 'Opens search by prompt' : undefined}
                    onPress={() => (forYou && active ? onMenu(!menuOpen) : choose(item.id))}
                    onLayout={event => {
                      const { x, width } = event.nativeEvent.layout;
                      setSlots(current =>
                        current[item.id]?.x === x && current[item.id]?.width === width
                          ? current
                          : { ...current, [item.id]: { x, width } },
                      );
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      onLayout={event => {
                        const width = event.nativeEvent.layout.width;
                        setLabels(current =>
                          current[item.id] === width ? current : { ...current, [item.id]: width },
                        );
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingBottom: 14,
                      }}
                    >
                      {forYou && <Sparkle size={13} color={active ? C.lime : C.muted} />}
                      <Text
                        style={{
                          color: active ? C.text : C.muted,
                          fontSize: 16,
                          // One weight for every tab: a width change mid-slide would restart it and make it jump.
                          fontWeight: '600',
                        }}
                      >
                        {item.label}
                      </Text>
                      {forYou && active && <Chevron open={menuOpen} />}
                    </View>
                    <View style={{ height: indicatorHeight }} />
                  </Pressable>
                );
              })}
              {/* Like X: rests on the header's bottom edge and slides between tabs. */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: indicatorHeight,
                  width: indicatorBase,
                  transform: [
                    { translateX: track ? track.x : indicatorX },
                    { scaleX: track ? track.scale : indicatorScale },
                  ],
                  borderRadius: indicatorHeight / 2,
                  backgroundColor: C.lime,
                  opacity: 0.75,
                }}
              />
            </View>
            )}
          </View>
          {tabs?.some(item => item.menu) && menuOpen && <CurateMenu prompt={prompt} onAsk={onAsk} />}
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: statusBar,
          zIndex: 11,
          backgroundColor: C.bg,
          opacity: Animated.multiply(strip, 0.9),
        }}
      />
    </>
  );
}

/** Slides a tab's content in from the side of the tab that was tapped. */
export function TabSlide({
  direction,
  children,
}: {
  direction: number;
  children: React.ReactNode;
}) {
  const animations = useAnimations();
  const progress = useRef(new Animated.Value(animations && direction ? 0 : 1)).current;
  useEffect(() => {
    if (!animations || !direction) return;
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [animations, direction, progress]);
  return (
    <Animated.View
      style={{
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [Math.sign(direction) * 48, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
