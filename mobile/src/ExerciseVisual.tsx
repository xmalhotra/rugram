import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { exerciseIcons } from './exercise-icons';

/** Stands in until an exercise has its own picture. Scales with its box, so it never gets clipped. */
export function ExerciseIcon() {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
    >
      <Svg width="58%" height="58%" viewBox="0 0 24 24">
        <Path
          d="M2 12h2M20 12h2M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10"
          stroke="#9aa3ad"
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function ExerciseVisual({
  exerciseId,
  cover = false,
}: {
  exerciseId?: string;
  cover?: boolean;
}) {
  const source = exerciseId ? exerciseIcons[exerciseId] : undefined;
  if (!source) return <ExerciseIcon />;
  return (
    <Image
      source={source}
      accessible={false}
      resizeMode="cover"
      fadeDuration={0}
      style={{ width: '100%', height: cover ? '100%' : 112 }}
    />
  );
}
