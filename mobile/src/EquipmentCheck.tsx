import { Glyph } from './design/Glyph';
import { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { DetailSurface } from './design/DetailSurface';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alternativesFor, supersetClash, supersetPartnerAreas } from '../../shared/exercise-alternatives';
import { exercise, type GymExercise } from '../../shared/exercises';
import type { CustomflowSource } from '../../shared/customflows';
import { applyOrder } from '../../shared/item-order';
import { muscleAreas, muscleMapFor, type MuscleArea } from '../../shared/muscle-map';
import type { HabitFlow } from '../../shared/mobile';
import { saveCustomflowSwap, useCustomflow } from './customflows';
import { usePersonalMetrics } from './personal-metrics';
import { Button } from './design/components';
import { Text } from './design/Text';
import { useTheme, space, radius, stroke, hit, opacity, size } from './design/theme';
import { ExerciseCatalog } from './ExerciseCatalog';
import { ExerciseVisual } from './ExerciseVisual';

export function gearLabel(equipment: string) {
  return equipment
    .split('-')
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function muscleTitle(exerciseId: string) {
  const area = muscleMapFor(exerciseId).main[0];
  return muscleAreas.find(item => item.id === area)?.title ?? '';
}

function RowButton({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) {
  return <Button title={label} variant="secondary" fit size="regular" onPress={onPress} />;
}

function ExerciseRow({
  move,
  detail,
  label,
  action,
  onAction
}: {
  move: GymExercise | undefined;
  detail: string;
  label?: string;
  action: string;
  onAction: () => void;
}) {
  const { colors: C } = useTheme();
  const name = move?.name ?? 'Exercise';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.ms,
        paddingVertical: space.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: C.line
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
        <ExerciseVisual exerciseId={move?.id} cover />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <Text variant="callout" style={{ color: C.text }}>{name}</Text>
        <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text>
        {label ? <Text variant="footnote" style={{ color: C.lime, fontWeight: '600'}}>{label}</Text> : null}
      </View>
      <RowButton label={action} onPress={onAction} />
    </View>
  );
}

function Bar({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: hit, gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={{ minWidth: hit, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
      >
        <Glyph name={{ ios: 'chevron.left', android: 'arrow_back' }} fallback="←" color={C.text} />
      </Pressable>
      <Text variant="headline" accessibilityRole="header" numberOfLines={2} style={{ flex: 1, color: C.text }}>
        {title}
      </Text>
    </View>
  );
}

/** Suggested stand-ins, then the whole catalogue, for one exercise. */
export function SwapChooser({
  sourceId,
  avoidMainAreas,
  library,
  onClose,
  onChoose,
  onView
}: {
  /** The exercise being replaced. */
  sourceId: string;
  /** Main areas of the superset partner, when this exercise is in a pair. */
  avoidMainAreas?: MuscleArea[];
  library: HabitFlow[];
  onClose: () => void;
  onChoose: (exerciseId: string) => Promise<void> | void;
  onView: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const metrics = usePersonalMetrics();
  const place = metrics['gym.place']?.place;
  const [browse, setBrowse] = useState(false);
  const [error, setError] = useState('');
  const move = exercise(sourceId);
  const name = move?.name ?? 'this exercise';
  const muscle = muscleMapFor(sourceId).main[0] ?? null;
  const suggestions = alternativesFor(sourceId, {
    limit: 6,
    ...(place ? { place } : {}),
    ...(avoidMainAreas?.length ? { avoidMainAreas } : {})
  });
  async function choose(exerciseId: string) {
    const clash = supersetClash(exerciseId, avoidMainAreas);
    if (clash) {
      setError(clash);
      return;
    }
    setError('');
    try {
      await onChoose(exerciseId);
    } catch (reason) {
      setBrowse(false);
      setError(reason instanceof Error ? reason.message : 'Could not save that swap.');
    }
  }
  return (
    <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: inset.top }}>
        {browse ? (
          <ExerciseCatalog
            library={library}
            topInset={0}
            onBack={() => setBrowse(false)}
            onView={onView}
            pick={{
              muscle,
              refuse: id => supersetClash(id, avoidMainAreas),
              onPick: id => void choose(id)
            }}
          />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: space.md }}>
            <Bar title={`Instead of ${name}`} onBack={onClose} backLabel="Back to equipment check" />
            {error ? (
              <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger, paddingBottom: space.sm }}>
                {error}
              </Text>
            ) : null}
            <ScrollView contentContainerStyle={{ paddingBottom: inset.bottom + space.xl, gap: space.sm }} keyboardShouldPersistTaps="handled">
              <Text variant="headline" style={{ color: C.text, paddingTop: space.sm }}>Suggested</Text>
              {suggestions.length === 0 ? (
                <Text variant="subhead" style={{ color: C.muted }}>Nothing close. Browse the catalogue instead.</Text>
              ) : (
                suggestions.map(item => {
                  const candidate = exercise(item.exerciseId);
                  return (
                    <Pressable
                      key={item.exerciseId}
                      accessibilityRole="button"
                      accessibilityLabel={`${candidate?.name ?? item.exerciseId}. ${item.reason}`}
                      onPress={() => void choose(item.exerciseId)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.ms,
                        minHeight: hit,
                        paddingVertical: space.sm,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: C.line,
                        opacity: pressed ? opacity.pressed : 1
                      })}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.card }}>
                        <ExerciseVisual exerciseId={candidate?.id} cover />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                        <Text variant="callout" style={{ color: C.text }}>{candidate?.name ?? item.exerciseId}</Text>
                        <Text variant="footnote" style={{ color: C.muted }}>
                          {candidate ? gearLabel(candidate.equipment) : ''}
                        </Text>
                        <Text variant="footnote" style={{ color: C.muted }}>{item.reason}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse all exercises"
                onPress={() => setBrowse(true)}
                style={({ pressed }) => ({
                  minHeight: size.button,
                  marginTop: space.ms,
                  borderRadius: radius.pill,
                  borderWidth: stroke.line,
                  borderColor: C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? opacity.pressed : 1
                })}
              >
                <Text variant="callout" style={{ color: C.text, fontWeight: '600'}}>Browse all exercises</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </View>
    </DetailSurface>
  );
}

export type EquipmentRow = { key: string; exerciseId: string; superset?: string; priority?: boolean };

function shownExercise(row: EquipmentRow, swaps: Record<string, string> | undefined) {
  const next = swaps?.[row.key];
  return next && next !== row.exerciseId ? next : row.exerciseId;
}

/** The flow or session exercises that have a movement, each of which can be swapped before the member starts. */
export function EquipmentCheck({
  source,
  rows,
  library,
  onClose,
  onView
}: {
  source: CustomflowSource;
  /** Catalog rows. A flow's key is the exercise id. A session's key is the block id. */
  rows: EquipmentRow[];
  library: HabitFlow[];
  onClose: () => void;
  onView: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const customflow = useCustomflow(source.kind, source.id);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const swaps = customflow?.changes.swaps;
  const slots = applyOrder(rows, customflow?.changes.order, row => row.key)
    .filter(row => !customflow?.changes.removed?.includes(row.key))
    .map(row => ({
      ...row,
      shownId: shownExercise(row, swaps)
    }));
  const replacing = slots.find(slot => slot.key === sourceId);
  const avoid = sourceId ? supersetPartnerAreas(rows, sourceId, row => shownExercise(row, swaps)) : [];
  async function save(key: string, exerciseId: string | null) {
    setError('');
    try {
      await saveCustomflowSwap(source, key, exerciseId);
      setSourceId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save that swap.');
      throw reason;
    }
  }
  return (
    <>
      <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={onClose}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: inset.top, paddingHorizontal: space.md }}>
          <Bar title="Equipment check" onBack={onClose} backLabel="Close equipment check" />
          <Text variant="subhead" style={{ color: C.muted, paddingBottom: space.sm }}>Missing something? Swap an exercise.</Text>
          {error ? (
            <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger, paddingBottom: space.sm }}>
              {error}
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingBottom: inset.bottom + space.xl }}>
            {slots.map(slot => {
              const move = exercise(slot.shownId);
              const swapped = slot.shownId !== slot.exerciseId;
              const original = exercise(slot.exerciseId)?.name ?? slot.exerciseId;
              const equipment = move ? gearLabel(move.equipment) : muscleTitle(slot.shownId);
              return (
                <ExerciseRow
                  key={slot.key}
                  move={move}
                  detail={swapped ? `${equipment} · Swapped from ${original}` : equipment}
                  label={slot.priority ? 'Your priority' : undefined}
                  action={swapped ? 'Undo' : 'Swap'}
                  onAction={() => {
                    if (swapped) void save(slot.key, null).catch(() => undefined);
                    else setSourceId(slot.key);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>
      </DetailSurface>
      {sourceId ? (
        <SwapChooser
          sourceId={replacing?.exerciseId ?? sourceId}
          avoidMainAreas={avoid.length ? avoid : undefined}
          library={library}
          onClose={() => setSourceId(null)}
          onChoose={exerciseId => save(sourceId, exerciseId)}
          onView={onView}
        />
      ) : null}
    </>
  );
}
