import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { exercise } from '../../shared/exercises';
import { gymExerciseId } from '../../shared/gym-flows';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { ExerciseVisual } from './ExerciseVisual';

/** A gym card shows the exercise name, its set target, and its picture or an icon. */
export function GymCardFace({ card }: { card: HabitFlow }) {
  const { colors: C } = useTheme();
  const move = exercise(gymExerciseId(card.id) ?? '');
  return (
    <View style={{ flex: 1, backgroundColor: C.card, padding: 24, gap: 16, justifyContent: 'center' }}>
      <View style={{ height: 220, borderRadius: 18, overflow: 'hidden', backgroundColor: C.bg }}>
        <ExerciseVisual exerciseId={move?.id} cover />
      </View>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '700' }}>
        {card.title}
      </Text>
      <Text style={{ color: C.muted, fontSize: 18 }}>{card.description}</Text>
    </View>
  );
}
