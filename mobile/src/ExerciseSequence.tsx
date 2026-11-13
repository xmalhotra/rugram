import { Glyph } from './design/Glyph';
import React, { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { DetailSurface } from './design/DetailSurface';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Exercise } from '../../shared/exercises';
import { Button } from './design/components';
import { Text } from './design/Text';
import { useTheme, space, hit } from './design/theme';
import { ExerciseTechniqueCard } from './ExerciseTechniqueCard';

export function ExerciseSequence({
  exercises,
  initialIndex,
  onClose,
  onLink
}: {
  exercises: Exercise[];
  initialIndex: number;
  onClose: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(initialIndex);
  const list = useRef<FlatList<Exercise>>(null);
  function move(next: number) {
    const bounded = Math.max(0, Math.min(exercises.length - 1, next));
    list.current?.scrollToIndex({ index: bounded, animated: true });
    setIndex(bounded);
  }
  return (
    <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingVertical: space.ms,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.ms
          }}
        >
          <Text variant="subhead" accessibilityLiveRegion="polite" style={{ flex: 1, color: C.muted }}>
            Movement {index + 1} of {exercises.length}
          </Text>
          <Button variant="text" size="regular" title="Done" accessibilityLabel="Close movement guide" onPress={onClose} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.ms }}>
          {exercises.map((exercise, position) => (
            <View
              key={exercise.id}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                backgroundColor: position === index ? C.lime : C.line
              }}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          {width > 0 && (
            <FlatList
              key={width}
              ref={list}
              horizontal
              pagingEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              data={exercises}
              initialScrollIndex={index}
              getItemLayout={(_, position) => ({
                length: width,
                offset: width * position,
                index: position
              })}
              keyExtractor={exercise => exercise.id}
              onMomentumScrollEnd={event =>
                setIndex(
                  Math.max(
                    0,
                    Math.min(
                      exercises.length - 1,
                      Math.round(event.nativeEvent.contentOffset.x / width),
                    ),
                  ),
                )
              }
              renderItem={({ item }) => (
                <ScrollView
                  style={{ width, flex: 1 }}
                  contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: space.xxl }}
                  showsVerticalScrollIndicator
                  directionalLockEnabled
                >
                  <ExerciseTechniqueCard exercise={item} onLink={onLink} />
                  <Text variant="footnote" style={{ color: C.muted, marginTop: space.md }}>
                    Simplified illustration, not a complete demonstration. Stop for pain and seek
                    qualified coaching when needed.
                  </Text>
                </ScrollView>
              )}
            />
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space.lg,
            paddingVertical: space.sm
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous exercise"
            disabled={index === 0}
            onPress={() => move(index - 1)}
            style={{
              minWidth: 64,
              minHeight: hit,
              justifyContent: 'center',
              opacity: index === 0 ? 0.3 : 1
            }}
          >
            <Glyph name={{ ios: 'chevron.left', android: 'arrow_back' }} fallback="←" color={C.text} />
          </Pressable>
          <Text variant="footnote" style={{ flex: 1, color: C.muted, textAlign: 'center' }}>
            Swipe for the next movement
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              index === exercises.length - 1 ? 'Close exercise guide' : 'Next exercise'
            }
            onPress={() => (index === exercises.length - 1 ? onClose() : move(index + 1))}
            style={{
              minWidth: 64,
              minHeight: hit,
              justifyContent: 'center',
              alignItems: 'flex-end'
            }}
          >
            <Glyph
              name={
                index === exercises.length - 1
                  ? { ios: 'checkmark', android: 'check' }
                  : { ios: 'chevron.right', android: 'chevron_right' }
              }
              fallback={index === exercises.length - 1 ? '✓' : '→'}
              color={C.text}
              size={24}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </DetailSurface>
  );
}
