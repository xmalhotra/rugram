import React from 'react';
import { View } from 'react-native';
import { Text } from './design/Text';
import type { Exercise } from '../../shared/exercises';
import { Badge, Button, Card, SectionHeader } from './design/components';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { Disclosure } from './Disclosure';
import { radius, space, stroke, useTheme } from './design/theme';

export function ExerciseTechniqueCard({ exercise, onLink }: { exercise: Exercise; onLink: (url: string) => void }) {
  const { colors: C } = useTheme();
  return (
    <Card>
      <View style={{ alignItems: 'center', paddingVertical: space.ms, borderRadius: radius.control, backgroundColor: C.bg }}>
        <ExerciseThumbnail icon={exercise.icon} size={144} />
      </View>
      <SectionHeader title={exercise.name} />
      <Badge>{exercise.muscles.join(' · ')}</Badge>
      <Badge>{exercise.equipment}</Badge>
      <View style={{ gap: space.md, paddingVertical: space.sm }}>
        {exercise.instructions.map((instruction, index) => (
          <View key={`${exercise.id}-${index}`} style={{ flexDirection: 'row', gap: space.ms }}>
            <Text variant="subhead" style={{ color: C.lime, fontWeight: '600' }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text variant="callout" style={{ flex: 1, minWidth: 0, color: C.text }}>
              {instruction}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ borderTopWidth: stroke.line, borderColor: C.line, paddingTop: space.ms, gap: space.xs }}>
        <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>FORM CHECK</Text>
        <Text variant="subhead" style={{ color: C.muted }}>{exercise.watchFor}</Text>
      </View>
      <Disclosure title="Adaptation & source">
        <Text variant="subhead" style={{ color: C.muted }}>{exercise.easier}</Text>
        <Button title="Technique reference ↗" secondary onPress={() => onLink(exercise.source.url)} />
      </Disclosure>
      {Boolean(exercise.recommendations?.some(item => item.verified)) && (
        <View style={{ gap: space.ms }}>
          <Text variant="headline" style={{ color: C.text }}>Creator references</Text>
          {exercise.recommendations
            ?.filter(item => item.verified)
            .map(item => (
              <View key={`${item.name}-${item.sourceUrl}`} style={{ gap: space.sm }}>
                <Text variant="callout" style={{ color: C.text }}>
                  {item.name} · {item.claim}
                </Text>
                <Text variant="subhead" style={{ color: C.muted }}>{item.context}</Text>
                <Text variant="footnote" style={{ color: C.muted }}>{item.disclosure}</Text>
                <Button title="View original reference ↗" secondary onPress={() => onLink(item.sourceUrl)} />
              </View>
            ))}
        </View>
      )}
    </Card>
  );
}
