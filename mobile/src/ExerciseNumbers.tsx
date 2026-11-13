import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { GymExercise } from '../../shared/exercises';
import { progressValue, type ProgressPoint } from '../../shared/exercise-progress';
import { formatKg } from '../../shared/progression';
import { loadIncrementKg, sourceLine, startWeight, strengthLink, weightForReps } from '../../shared/strength';
import { api } from './api';
import { Text } from './design/Text';
import { radius, space, stroke, useTheme } from './design/theme';
import { useStrength } from './strength';

const chartWidth = 280;
const chartHeight = 72;
const repRows = [5, 8, 12];

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function setLine(point: ProgressPoint) {
  if (point.bestWeightKg != null && point.bestReps != null) return `${formatKg(point.bestWeightKg)} kg × ${point.bestReps}`;
  if (point.bestSeconds != null) return `${point.bestSeconds} sec`;
  if (point.mostReps != null) return `${point.mostReps} reps`;
  return `${point.sets} sets`;
}

/** A small line of the member's sessions, oldest on the left. */
function Trend({ points }: { points: ProgressPoint[] }) {
  const { colors: C } = useTheme();
  const values = points.map(progressValue).filter((value): value is number => value != null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => ({
    x: 6 + (index / (values.length - 1)) * (chartWidth - 12),
    y: 6 + (1 - (value - min) / span) * (chartHeight - 12),
  }));
  const change = Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100);
  return (
    <View
      accessible
      accessibilityLabel={`${values.length} sessions. ${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change)} percent since the first.`}
      style={{ gap: space.xs }}
    >
      <Svg width={chartWidth} height={chartHeight}>
        <Polyline
          points={coords.map(point => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={C.lime}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {coords.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 3.5 : 2} fill={C.lime} />
        ))}
      </Svg>
      <Text variant="footnote" style={{ color: C.muted }}>
        {`${values.length} sessions · ${change >= 0 ? '+' : ''}${change}% since ${shortDate(points[0].loggedAt)}`}
      </Text>
    </View>
  );
}

/**
 * The member's own numbers for an exercise: what they've done, how it's going, and what to load for a few
 * rep counts. Before any history, our starting guess and where it came from. Private to the member.
 */
export function ExerciseNumbers({ item }: { item: GymExercise }) {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const [points, setPoints] = useState<ProgressPoint[] | null>(null);
  useEffect(() => {
    let live = true;
    setPoints(null);
    void api<{ points: ProgressPoint[] }>(`/api/mobile/exercises?progress=${encodeURIComponent(item.id)}`)
      .then(result => {
        if (live) setPoints(result.points);
      })
      .catch(() => {
        if (live) setPoints([]);
      });
    return () => {
      live = false;
    };
  }, [item.id]);
  if (points == null) return null;
  const last = points[points.length - 1];
  const best = points.reduce<ProgressPoint | null>(
    (top, point) => ((progressValue(point) ?? -1) > (top ? (progressValue(top) ?? -1) : -1) ? point : top),
    null,
  );
  // What to load for a few rep counts: from your recent best on this exercise, else from your strength profile.
  const step = loadIncrementKg(item);
  const ownMax = last?.oneRepMaxKg ?? null;
  const link = strengthLink(item.id);
  const pattern = link ? strength?.profile.patterns.find(entry => entry.pattern === link.pattern) : undefined;
  const max = ownMax ?? (pattern && link ? pattern.oneRepMaxKg * link.ratio : null);
  const loads =
    item.load === 'weight' && max != null
      ? repRows.map(reps => {
          const raw = weightForReps(max, reps);
          return { reps, weightKg: step ? Math.floor(raw / step) * step : Math.round(raw) };
        })
      : [];
  const guess = !points.length && strength ? startWeight(item.id, 10, strength.profile) : null;
  if (!points.length && !guess && !loads.length) {
    return (
      <View style={{ gap: space.sm }}>
        <Text variant="headline" style={{ color: C.text }}>Your numbers</Text>
        <Text variant="subhead" style={{ color: C.muted }}>
          {item.load === 'weight' && link
            ? 'Add a lift under Your strength on your profile, and we’ll suggest a starting weight.'
            : 'Do it once in a flow and your sets will show here.'}
        </Text>
      </View>
    );
  }
  const row = (label: string, value: string) => (
    <View key={label} style={{ flexDirection: 'row', gap: space.ms, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <Text variant="subhead" style={{ width: 96, color: C.muted }}>{label}</Text>
      <Text variant="subhead" style={{ flex: 1, color: C.text }}>{value}</Text>
    </View>
  );
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="headline" style={{ color: C.text }}>Your numbers</Text>
      {points.length ? (
        <View>
          {best ? row('Best', `${setLine(best)}${best.oneRepMaxKg != null ? ` · ~${formatKg(best.oneRepMaxKg)} kg max` : ''}`) : null}
          {last ? row('Last time', `${setLine(last)} · ${last.sets} set${last.sets === 1 ? '' : 's'} · ${shortDate(last.loggedAt)}`) : null}
        </View>
      ) : guess ? (
        <Text variant="subhead" style={{ color: C.text }}>
          {`We’d start you at ${formatKg(guess.weightKg)} kg for 10 reps. ${sourceLine(guess.pattern)}.`}
        </Text>
      ) : null}
      <Trend points={points} />
      {loads.length ? (
        <View style={{ gap: space.xxs }}>
          <Text variant="footnote" style={{ color: C.muted }}>
            {ownMax != null ? 'From your recent sets, roughly' : 'Our estimate, roughly'}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {loads.map(load => (
              <View
                key={load.reps}
                accessible
                accessibilityLabel={`${load.reps} reps: about ${formatKg(load.weightKg)} kilograms`}
                style={{ flex: 1, padding: space.ms, borderRadius: radius.small, borderWidth: stroke.line, borderColor: C.line, gap: space.xxs }}
              >
                <Text variant="caption" style={{ color: C.muted }}>{`${load.reps} reps`}</Text>
                <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{`${formatKg(load.weightKg)} kg`}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
