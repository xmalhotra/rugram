import { View } from 'react-native';
import { station, type GymExercise } from '../../shared/exercises';
import { riseLine } from '../../shared/progression';
import type { SetScheme } from '../../shared/set-schemes';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

/** What the station is, how the next set's weight is chosen, and how the sets change. */
export function ExerciseInfo({ item, scheme }: { item: GymExercise; scheme?: SetScheme | null }) {
  const { colors: C } = useTheme();
  const place = station(item.station);
  const rise = riseLine(item);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>Equipment</Text>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{place?.title}</Text>
        {place?.about ? (
          <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>{place.about}</Text>
        ) : null}
      </View>
      {rise ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>How the weight goes up</Text>
          <Text style={{ color: C.text, fontSize: 16 }}>{rise}</Text>
          {place?.stepNote ? (
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{place.stepNote}</Text>
          ) : null}
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
            If your form slips or you miss your reps, stay at the same weight.
          </Text>
        </View>
      ) : null}
      {scheme ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>How your sets change</Text>
          <Text style={{ color: C.text, fontSize: 16 }}>{scheme.title}</Text>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{scheme.about}</Text>
        </View>
      ) : null}
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 8 }}>
        This is general gym guidance, not medical or personal coaching advice.
      </Text>
    </View>
  );
}
