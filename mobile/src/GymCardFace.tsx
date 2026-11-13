import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { exercise } from '../../shared/exercises';
import { gymExerciseId } from '../../shared/gym-flows';
import { Text } from './design/Text';
import { radius, space, useTheme } from './design/theme';
import { ExerciseVisual } from './ExerciseVisual';

/** A gym card shows the exercise name, its set target, and its picture or an icon. */
export function GymCardFace({ card }: { card: HabitFlow }) {
  const { colors: C } = useTheme();
  const move = exercise(gymExerciseId(card.id) ?? '');
  return (
    <View style={{ flex: 1, backgroundColor: C.card, padding: space.xl, gap: space.md, justifyContent: 'center' }}>
      <View style={{ height: 220, borderRadius: radius.card, overflow: 'hidden', backgroundColor: C.bg }}>
        <ExerciseVisual exerciseId={move?.id} cover />
      </View>
      <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
        {card.title}
      </Text>
      <Text variant="body" style={{ color: C.muted }}>{card.description}</Text>
    </View>
  );
}
