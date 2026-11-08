import { Linking, Pressable, View } from 'react-native';
import { exerciseVideoUrl } from '../../shared/exercise-how-to';
import { useExerciseHowTo } from './ExerciseHowTo';
import { muscleAreas, muscleMapFor, type MuscleArea } from '../../shared/muscle-map';
import { BodyMap } from './BodyMap';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
        style={{ width: pictureSize, height: pictureSize, borderRadius: 16, overflow: 'hidden' }}
      >
        <HowToLoop exerciseId={exerciseId} size={pictureSize} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 44,
          height: 44,
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
          }}
        >
          <Text style={{ color: C.text, fontSize: 16 }}>ⓘ</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Watch someone do ${name} on YouTube`}
        accessibilityHint="Opens YouTube"
        onPress={() => void Linking.openURL(exerciseVideoUrl(name, howTo?.videoUrl)).catch(() => undefined)}
        style={{
          position: 'absolute',
          top: 52,
          right: 0,
          width: 44,
          height: 44,
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
          }}
        >
          <Text style={{ color: C.text, fontSize: 13, marginLeft: 2 }}>▶</Text>
        </View>
      </Pressable>
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
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>
        Focus area
      </Text>
      <View style={{ alignItems: 'center' }}>
        <BodyMap main={muscles.main} helpers={muscles.helpers} width={200} />
      </View>
      {muscles.main.length ? (
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
          Main: {muscles.main.map(areaTitle).join(', ')}
        </Text>
      ) : null}
      {muscles.helpers.length ? (
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
          Helps: {muscles.helpers.map(areaTitle).join(', ')}
        </Text>
      ) : null}
      {emphasisesAbs ? (
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
          The abs work as one muscle. This shows which part this movement emphasises.
        </Text>
      ) : null}
    </View>
  );
}
