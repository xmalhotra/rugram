import { Linking, Pressable, View } from 'react-native';
import { exerciseVideoUrl } from '../../shared/exercise-how-to';
import { useExerciseHowTo } from './ExerciseHowTo';
import { muscleAreas, muscleMapFor, type MuscleArea } from '../../shared/muscle-map';
import { BodyMap } from './BodyMap';
import { Text } from './design/Text';
import { radius, space, useTheme } from './design/theme';
import { IconButton } from './design/parts';
import { HowToLoop } from './ExerciseHowTo';

const pictureSize = 150;

const areaTitle = (area: MuscleArea) => muscleAreas.find(item => item.id === area)?.title ?? area;

/** The loop, or the still picture, centred, with the about control beside it at the right. */
export function ExercisePicture({
  exerciseId,
  name,
  onPress,
}: {
  exerciseId: string;
  name: string;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  const label = `About ${name}`;
  const { howTo } = useExerciseHowTo(exerciseId);
  return (
    <View style={{ height: pictureSize, alignSelf: 'stretch', alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{ width: pictureSize, height: pictureSize, borderRadius: radius.card, overflow: 'hidden' }}
      >
        <HowToLoop exerciseId={exerciseId} size={pictureSize} />
      </Pressable>
      <View style={{ position: 'absolute', top: 0, right: 0, gap: space.sm }}>
        <IconButton label={label} look="outlined" symbol="info" android="info" fallback="i" symbolSize={space.lg} onPress={onPress} />
        <IconButton
          label={`Watch someone do ${name} on YouTube`}
          look="outlined"
          symbol="play.fill"
          android="play_arrow"
          fallback="▶"
          symbolSize={space.md}
          onPress={() => void Linking.openURL(exerciseVideoUrl(name, howTo?.videoUrl)).catch(() => undefined)}
        />
      </View>
    </View>
  );
}

/** Muscles for this exercise, under the sets. */
export function FocusArea({ exerciseId }: { exerciseId: string }) {
  const { colors: C } = useTheme();
  const muscles = muscleMapFor(exerciseId);
  if (!muscles.main.length && !muscles.helpers.length) return null;
  const emphasisesAbs = [...muscles.main, ...muscles.helpers].some(
    area => area === 'upper-abs' || area === 'lower-abs',
  );
  return (
    <View style={{ gap: space.sm }}>
      <Text accessibilityRole="header" variant="headline" style={{ color: C.text }}>
        Focus area
      </Text>
      <View style={{ alignItems: 'center' }}>
        <BodyMap main={muscles.main} helpers={muscles.helpers} width={200} />
      </View>
      {muscles.main.length ? (
        <Text variant="subhead" style={{ color: C.text }}>
          Main: {muscles.main.map(areaTitle).join(', ')}
        </Text>
      ) : null}
      {muscles.helpers.length ? (
        <Text variant="subhead" style={{ color: C.text }}>
          Helps: {muscles.helpers.map(areaTitle).join(', ')}
        </Text>
      ) : null}
      {emphasisesAbs ? (
        <Text variant="footnote" style={{ color: C.muted }}>
          The abs work as one muscle. This shows which part this movement emphasises.
        </Text>
      ) : null}
    </View>
  );
}
