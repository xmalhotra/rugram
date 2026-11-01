import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Exercise } from '../../shared/exercises';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { ExerciseTechniqueCard } from './ExerciseTechniqueCard';

export function ExerciseSequence({
  exercises,
  initialIndex,
  onClose,
  onLink,
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
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: C.muted, fontSize: 15 }}>
            Movement {index + 1} of {exercises.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close movement guide"
            onPress={onClose}
            style={{ minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 17 }}>Done</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingBottom: 12 }}>
          {exercises.map((exercise, position) => (
            <View
              key={exercise.id}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                backgroundColor: position === index ? C.lime : C.line,
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
                index: position,
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
                  contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 32 }}
                  showsVerticalScrollIndicator
                  directionalLockEnabled
                >
                  <ExerciseTechniqueCard exercise={item} onLink={onLink} />
                  <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 16 }}>
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
            paddingHorizontal: 20,
            paddingVertical: 6,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous exercise"
            disabled={index === 0}
            onPress={() => move(index - 1)}
            style={{
              minWidth: 64,
              minHeight: 48,
              justifyContent: 'center',
              opacity: index === 0 ? 0.3 : 1,
            }}
          >
            <Text style={{ color: C.lime, fontSize: 24 }}>←</Text>
          </Pressable>
          <Text style={{ flex: 1, color: C.muted, fontSize: 13, textAlign: 'center' }}>
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
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'flex-end',
            }}
          >
            <Text style={{ color: C.lime, fontSize: 24 }}>
              {index === exercises.length - 1 ? '✓' : '→'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
