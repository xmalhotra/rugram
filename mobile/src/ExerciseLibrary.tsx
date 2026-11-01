import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { Exercise } from '../../shared/exercises';
import { Badge, Button, Choice } from './design/components';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { useTheme } from './design/theme';
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
    <View style={{ gap: 12 }}>
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
            style={{ paddingVertical: 12, borderTopWidth: 0.5, borderColor: C.line, gap: 12 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name}. Technique details`}
              accessibilityState={{ expanded: expanded === exercise.id }}
              onPress={() => setExpanded(value => (value === exercise.id ? null : exercise.id))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68 }}
            >
              <ExerciseThumbnail icon={exercise.icon} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>
                  {exercise.name}
                </Text>
                <Badge>
                  {exercise.category} · {exercise.muscles.join(', ')}
                </Badge>
                <Text style={{ color: C.lime, fontSize: 15 }}>
                  Technique details {expanded === exercise.id ? '−' : '+'}
                </Text>
              </View>
            </Pressable>
            {expanded === exercise.id && (
              <>
                <Badge>{exercise.equipment}</Badge>
                {exercise.instructions.map((instruction, index) => (
                  <Text key={instruction} style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
                <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
                  Easier option: {exercise.easier}
                </Text>
                <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
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
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
        Icons are original schematic position reminders, not complete technique demonstrations. Read
        the instructions and seek coaching where needed.
      </Text>
    </View>
  );
}
