import { View } from 'react-native';
import { station, type GymExercise } from '../../shared/exercises';
import { riseLine } from '../../shared/progression';
import type { SetScheme } from '../../shared/set-schemes';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';

/** What the station is, how the next set's weight is chosen, and how the sets change. */
export function ExerciseInfo({ item, scheme }: { item: GymExercise; scheme?: SetScheme | null }) {
  const { colors: C } = useTheme();
  const place = station(item.station);
  const rise = riseLine(item);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ gap: space.sm }}>
        <Text variant="footnote" style={{ color: C.muted }}>Equipment</Text>
        <Text variant="headline" style={{ color: C.text }}>{place?.title}</Text>
        {place?.about ? (
          <Text variant="callout" style={{ color: C.text }}>{place.about}</Text>
        ) : null}
      </View>
      {rise ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Text variant="headline" style={{ color: C.text }}>How the weight goes up</Text>
          <Text variant="callout" style={{ color: C.text }}>{rise}</Text>
          {place?.stepNote ? (
            <Text variant="subhead" style={{ color: C.muted }}>{place.stepNote}</Text>
          ) : null}
          <Text variant="subhead" style={{ color: C.text }}>
            If your form slips or you miss your reps, stay at the same weight.
          </Text>
        </View>
      ) : null}
      {scheme ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Text variant="headline" style={{ color: C.text }}>How your sets change</Text>
          <Text variant="callout" style={{ color: C.text }}>{scheme.title}</Text>
          <Text variant="subhead" style={{ color: C.text }}>{scheme.about}</Text>
        </View>
      ) : null}
      <Text variant="footnote" style={{ color: C.muted, marginTop: space.sm }}>
        This is general gym guidance, not medical or personal coaching advice.
      </Text>
    </View>
  );
}
