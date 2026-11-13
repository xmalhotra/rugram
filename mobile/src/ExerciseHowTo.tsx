import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ScrollView, View } from 'react-native';
import type { ExerciseHowTo } from '../../shared/exercise-how-to';
import { exerciseUsage } from '../../shared/exercise-usage';
import type { GymExercise } from '../../shared/exercises';
import type { SetScheme } from '../../shared/set-schemes';
import { Text } from './design/Text';
import { Button, Sheet } from './design/components';
import { radius, space, useTheme } from './design/theme';
import { ExerciseInfo } from './ExerciseInfo';
import { isEndFrame, loopOrder } from '../../shared/loop-order';
import { ExerciseNumbers } from './ExerciseNumbers';
import { ExerciseVisual } from './ExerciseVisual';
import { howToFrames } from './how-to-frames';
import { exerciseHowTo } from './training-api';

const emptyFrames: number[] = [];
const holdMs = 900;
const fadeMs = 200;
// Frames between the start and the end pass quicker, so three or more frames read as one movement.
const middleHoldMs = 350;

type Loaded = { howTo: ExerciseHowTo | null; general: string | null; failed: boolean };

const cache = new Map<string, Loaded>();
const pending = new Map<string, Promise<Loaded>>();

function loadHowTo(exerciseId: string) {
  const saved = cache.get(exerciseId);
  if (saved) return Promise.resolve(saved);
  const existing = pending.get(exerciseId);
  if (existing) return existing;
  const request = exerciseHowTo(exerciseId)
    .then(result => {
      const loaded: Loaded = { howTo: result.howTo, general: result.general, failed: false };
      cache.set(exerciseId, loaded);
      pending.delete(exerciseId);
      return loaded;
    })
    .catch(() => {
      pending.delete(exerciseId);
      return { howTo: null, general: null, failed: true } satisfies Loaded;
    });
  pending.set(exerciseId, request);
  return request;
}

/** Whether this exercise has written steps. A failed read keeps the longer label. */
export function useExerciseHowTo(exerciseId?: string) {
  const [forId, setForId] = useState(exerciseId);
  const [loaded, setLoaded] = useState<Loaded | null>(exerciseId ? (cache.get(exerciseId) ?? null) : null);
  if (exerciseId !== forId) {
    setForId(exerciseId);
    setLoaded(exerciseId ? (cache.get(exerciseId) ?? null) : null);
  }
  useEffect(() => {
    if (!exerciseId) return;
    let live = true;
    void loadHowTo(exerciseId).then(result => {
      if (live) setLoaded(result);
    });
    return () => {
      live = false;
    };
  }, [exerciseId]);
  const failed = loaded?.failed ?? false;
  const howTo = loaded && !failed ? loaded.howTo : null;
  const label = loaded && !failed && !howTo ? 'About this exercise' : 'How to do it';
  return { failed, howTo, general: loaded?.general ?? null, label };
}

/** One position at a time, or every position still when motion is reduced. */
export function HowToLoop({ exerciseId, size }: { exerciseId: string; size: number }) {
  const { colors: C } = useTheme();
  const frames = howToFrames[exerciseId] ?? emptyFrames;
  const [reduce, setReduce] = useState(false);
  const opacities = useMemo(
    () => frames.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
    [frames],
  );
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live) setReduce(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (reduce || frames.length < 2) return;
    let current = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const order = loopOrder(frames.length);
    let step = 0;
    const advance = () => {
      timer = setTimeout(() => {
        if (stopped) return;
        step = (step + 1) % order.length;
        const next = order[step];
        Animated.parallel([
          Animated.timing(opacities[current], { toValue: 0, duration: fadeMs, useNativeDriver: true }),
          Animated.timing(opacities[next], { toValue: 1, duration: fadeMs, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (!finished || stopped) return;
          current = next;
          advance();
        });
      }, isEndFrame(current, frames.length) ? holdMs : middleHoldMs);
    };
    advance();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      opacities.forEach(value => value.stopAnimation());
    };
  }, [frames.length, opacities, reduce]);
  if (!frames.length) {
    return (
      <View style={{ width: size, height: size, alignSelf: 'center', borderRadius: radius.control, overflow: 'hidden', backgroundColor: C.card }}>
        <ExerciseVisual exerciseId={exerciseId} cover />
      </View>
    );
  }
  if (reduce) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {frames.map((source, index) => (
          <Image
            key={`${exerciseId}-${index}`}
            source={source}
            accessible={false}
            resizeMode="cover"
            fadeDuration={0}
            style={{ width: size, height: size, borderRadius: radius.control, backgroundColor: C.card }}
          />
        ))}
      </ScrollView>
    );
  }
  return (
    <View
      accessibilityLabel="Exercise positions"
      style={{ width: size, height: size, alignSelf: 'center', borderRadius: radius.control, overflow: 'hidden', backgroundColor: C.card }}
    >
      {frames.map((source, index) => (
        <Animated.Image
          key={`${exerciseId}-${index}`}
          source={source}
          accessible={false}
          resizeMode="cover"
          fadeDuration={0}
          style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, opacity: opacities[index] }}
        />
      ))}
    </View>
  );
}

/** Steps, the picture, and the exercise details on one page. */
export function ExerciseHowToSheet({
  item,
  scheme,
  onClose,
}: {
  item: GymExercise;
  scheme?: SetScheme | null;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const guide = useExerciseHowTo(item.id);
  const howTo = guide.failed ? null : guide.howTo;
  return (
    <Sheet title={item.name} navigation="back" fullScreen presentation="modal" onClose={onClose}>
      <HowToLoop exerciseId={item.id} size={280} />
      {howTo ? (
        <View style={{ gap: space.ms }}>
          {howTo.steps.map((step, index) => (
            <Text key={`${item.id}-step-${index}`} variant="body" style={{ color: C.text }}>
              {index + 1}. {step}
            </Text>
          ))}
          <View style={{ gap: space.xs }}>
            <Text variant="headline" style={{ color: C.text }}>Feel it in</Text>
            <Text variant="body" style={{ color: C.text }}>{howTo.feel}</Text>
          </View>
          <View style={{ gap: space.xs }}>
            <Text variant="headline" style={{ color: C.text }}>Common mistake</Text>
            <Text variant="body" style={{ color: C.text }}>{howTo.mistake}</Text>
          </View>
          {howTo.note ? <Text variant="body" style={{ color: C.text }}>{howTo.note}</Text> : null}
          {guide.general ? <Text variant="subhead" style={{ color: C.muted }}>{guide.general}</Text> : null}
        </View>
      ) : null}
      <ExerciseNumbers item={item} />
      <ExerciseInfo item={item} scheme={scheme} />
      <ExerciseUsedIn exerciseId={item.id} />
    </Sheet>
  );
}

/** Where this exercise shows up. Hidden when nothing uses it. Labels, not links. */
export function ExerciseUsedIn({ exerciseId }: { exerciseId: string }) {
  const { colors: C } = useTheme();
  const used = exerciseUsage(exerciseId);
  if (!used.length) return null;
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="headline" style={{ color: C.text }}>Used in</Text>
      {used.map(entry => {
        const kind = entry.kind === 'flow' ? 'Flow' : 'Session';
        return (
          <View
            key={`${entry.kind}:${entry.id}`}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${kind}, ${entry.title}`}
            style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.ms }}
          >
            <Text variant="callout" style={{ flex: 1, color: C.text }}>{entry.title}</Text>
            <Text variant="footnote" style={{ color: C.muted }}>{kind}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function HowToLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button variant="text" size="regular" title={label} accessibilityLabel={label} onPress={onPress} />;
}
