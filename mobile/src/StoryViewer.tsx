import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from './design/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StoryCard, StoryGroup, StoryTarget } from '../../shared/home-feed';
import { stepStory, storyIndex, storyReadKey } from '../../shared/home-feed';
import { storySwipe, swipeStoryGroup } from '../../shared/story-playback';
import { Button } from './design/components';
import { useTheme } from './design/theme';
import { FocusIllustration } from './FocusIllustration';
import { ScreenBackground } from './design/ScreenBackground';
export function StoryViewer({
  group,
  groups,
  onOpen,
  onSeen,
  onClose,
}: {
  onSeen: (card: StoryCard, groupId: string) => void;
  group: StoryGroup;
  groups: StoryGroup[];
  onOpen: (target: StoryTarget) => void;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const { height } = useWindowDimensions();
  const [position, setPosition] = useState({ groupId: group.id, index: 0 });
  const [width, setWidth] = useState(1);
  const [held, setHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reader, setReader] = useState(false);
  const [image, setImage] = useState({ key: '', ready: false, failed: false });
  const [epoch, setEpoch] = useState(0);
  const generation = useRef(0);
  const appActive = useRef(active);
  const current = groups.find(item => item.id === position.groupId);
  const index = storyIndex(position.index, current?.cards.length ?? 0);
  const card = current?.cards[index];
  const key = card ? storyReadKey(card) : '';
  const visible = useRef(key);
  visible.current = key;
  const positionRef = useRef(position);
  positionRef.current = position;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const closed = useRef(false);
  const suppressTap = useRef(false);
  const touchX = useRef(0);
  const surface = useRef<React.ElementRef<typeof View>>(null);
  const originX = useRef(16);
  const progress = useRef(new Animated.Value(0)).current;
  const clock = useRef({ key: '', elapsed: 0 });
  const imageReady = !card?.imageUrl || (image.key === key && image.ready);
  const paused = held || dragging || scrolling || !active || reader || !imageReady;
  function close() {
    closed.current = true;
    visible.current = '';
    onClose();
  }
  function navigate(direction: 1 | -1, swipe = false, expectedKey?: string) {
    if (closed.current || (expectedKey && visible.current !== expectedKey)) return;
    const at = positionRef.current;
    const next = swipe
      ? swipeStoryGroup(groupsRef.current, at.groupId, direction)
      : stepStory(groupsRef.current, at.groupId, at.index, direction);
    visible.current = '';
    generation.current += 1;
    setEpoch(value => value + 1);
    setHeld(false);
    setDragging(false);
    setScrolling(false);
    if (next) {
      positionRef.current = next;
      clock.current = { key: '', elapsed: 0 };
      progress.setValue(0);
      setPosition(next);
    } else close();
  }
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    if (card && current && imageReady) onSeen(card, current.id);
  }, [key, onSeen, current?.id, imageReady]);
  useEffect(() => {
    const app = AppState.addEventListener('change', state => {
      appActive.current = state === 'active';
      setActive(appActive.current);
    });
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(value => {
      if (alive) setReader(value);
    });
    const accessibility = AccessibilityInfo.addEventListener('screenReaderChanged', setReader);
    return () => {
      alive = false;
      app.remove();
      accessibility.remove();
    };
  }, []);
  useEffect(() => {
    // Reading time is controlled by the person, never a countdown.
    if (key && !paused && !closed.current) progress.setValue(1);
  }, [key, paused, progress, epoch]);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        suppressTap.current = true;
        setDragging(true);
        setHeld(false);
      },
      onPanResponderRelease: (_, gesture) => {
        const direction = storySwipe(gesture.dx, gesture.dy, gesture.vx);
        if (direction) navigateRef.current(direction, true);
        else {
          setDragging(false);
          setHeld(false);
        }
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        setHeld(false);
      },
    }),
  ).current;
  function imageFinished(failed = false) {
    if (visible.current === key) setImage({ key, ready: true, failed });
  }
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 }}>
        <ScreenBackground />
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Story progress"
          accessibilityValue={{ min: 1, max: current?.cards.length ?? 1, now: index + 1 }}
          style={{ flexDirection: 'row', gap: 4, paddingTop: 8 }}
        >
          {current?.cards.map((item, at) => (
            <View
              key={item.id}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 3,
                backgroundColor: C.line,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  height: 3,
                  backgroundColor: C.lime,
                  width:
                    at < index
                      ? '100%'
                      : at === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600' }}>
            {current?.title ?? 'Story'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close story"
            onPress={close}
            style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 28 }}>×</Text>
          </Pressable>
        </View>
        {card ? (
          <>
            <View {...pan.panHandlers} style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {
                  suppressTap.current = true;
                  setScrolling(true);
                }}
                onScrollEndDrag={() => setScrolling(false)}
                onMomentumScrollBegin={() => setScrolling(true)}
                onMomentumScrollEnd={() => setScrolling(false)}
              >
                <Pressable
                  ref={surface}
                  onLayout={event => {
                    setWidth(event.nativeEvent.layout.width);
                    surface.current?.measureInWindow(x => {
                      originX.current = x;
                    });
                  }}
                  onPressIn={event => {
                    touchX.current = event.nativeEvent.pageX;
                    suppressTap.current = false;
                    setHeld(true);
                  }}
                  onPressOut={() => setHeld(false)}
                  onLongPress={() => {
                    suppressTap.current = true;
                  }}
                  delayLongPress={220}
                  onPress={event => {
                    if (
                      !suppressTap.current &&
                      Math.abs(event.nativeEvent.pageX - touchX.current) < 18
                    )
                      navigate(event.nativeEvent.pageX - originX.current < width * 0.33 ? -1 : 1);
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel={`${card.title}. ${card.body}`}
                  accessibilityHint="Tap right to advance, left to go back. Read at your pace. Swipe left or right to change story groups."
                  accessibilityActions={[
                    { name: 'increment', label: 'Next story' },
                    { name: 'decrement', label: 'Previous story' },
                  ]}
                  onAccessibilityAction={event =>
                    navigate(event.nativeEvent.actionName === 'decrement' ? -1 : 1)
                  }
                  style={{
                    flexGrow: 1,
                    minHeight: Math.max(320, height * 0.65),
                    backgroundColor: C.card,
                    borderRadius: 24,
                    padding: 24,
                    justifyContent: 'center',
                    gap: 24,
                  }}
                >
                  {card.imageUrl && !(image.key === key && image.failed) ? (
                    <Image
                      key={key}
                      source={{ uri: card.imageUrl }}
                      onLoad={() => imageFinished()}
                      onError={() => imageFinished(true)}
                      style={{
                        height: Math.min(260, height * 0.3),
                        width: '100%',
                        borderRadius: 16,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ transform: [{ scale: 1.65 }] }}>
                        <FocusIllustration
                          focusId={
                            card.target.kind === 'pick'
                              ? 'supplements'
                              : card.target.kind === 'event'
                                ? 'coding'
                                : 'workout'
                          }
                          selected
                        />
                      </View>
                    </View>
                  )}
                  <Text style={{ color: C.lime, fontSize: 12, fontWeight: '600' }}>
                    {card.eyebrow}
                  </Text>
                  <Text style={{ color: C.text, fontSize: 30, lineHeight: 38, fontWeight: '700' }}>
                    {card.title}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 18, lineHeight: 28 }}>{card.body}</Text>
                </Pressable>
              </ScrollView>
            </View>
            <View style={{ paddingVertical: 12 }}>
              <Button
                title={card.action}
                onPress={() => {
                  onOpen(card.target);
                }}
              />
            </View>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 17 }}>This story is no longer available.</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
