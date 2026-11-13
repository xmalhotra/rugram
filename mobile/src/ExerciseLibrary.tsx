import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './design/Text';
import type { Exercise } from '../../shared/exercises';
import { Badge, Button, Choice } from './design/components';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { space, useTheme } from './design/theme';
export function ExerciseLibrary({
  library,
  onLink,
}: {
  library: Exercise[];
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <View style={{ gap: space.ms }}>
      <Choice
        label="Exercise category"
        value={category}
        options={['All', 'Core', 'Lower body', 'Upper body']}
        onChange={setCategory}
      />
      {library
        .filter(exercise => category === 'All' || exercise.category === category)
        .map(exercise => (
          <View
            key={exercise.id}
            style={{ paddingVertical: space.ms, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, gap: space.ms }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name}. Technique details`}
              accessibilityState={{ expanded: expanded === exercise.id }}
              onPress={() => setExpanded(value => (value === exercise.id ? null : exercise.id))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 68 }}
            >
              <ExerciseThumbnail icon={exercise.icon} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Text variant="headline" style={{ color: C.text }}>
                  {exercise.name}
                </Text>
                <Badge>
                  {exercise.category} · {exercise.muscles.join(', ')}
                </Badge>
                <Text variant="subhead" style={{ color: C.lime }}>
                  Technique details {expanded === exercise.id ? '−' : '+'}
                </Text>
              </View>
            </Pressable>
            {expanded === exercise.id && (
              <>
                <Badge>{exercise.equipment}</Badge>
                {exercise.instructions.map((instruction, index) => (
                  <Text key={instruction} variant="callout" style={{ color: C.muted }}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
                <Text variant="callout" style={{ color: C.muted }}>
                  Easier option: {exercise.easier}
                </Text>
                <Text variant="callout" style={{ color: C.muted }}>
                  {exercise.watchFor}
                </Text>
                <Button
                  title="Technique source ↗"
                  secondary
                  onPress={() => onLink(exercise.source.url)}
                />
              </>
            )}
          </View>
        ))}
      <Text variant="footnote" style={{ color: C.muted }}>
        Icons are original schematic position reminders, not complete technique demonstrations. Read
        the instructions and seek coaching where needed.
      </Text>
    </View>
  );
}
