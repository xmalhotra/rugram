import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, SectionList, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  equipmentGroups,
  exercise,
  exercisesAtStation,
  searchExercises,
  station,
  type GymExercise,
} from '../../shared/exercises';
import { exerciseUsage } from '../../shared/exercise-usage';
import { yourLastLine } from '../../shared/set-detail';
import type { HabitFlow } from '../../shared/mobile';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { usePaneState } from './pane-state';
import { useRootListInset } from './RootList';
import { CatalogBar } from './FlowCatalogTile';
import { ExerciseVisual } from './ExerciseVisual';
import { ExerciseHowToSheet } from './ExerciseHowTo';
import { ExercisePicture } from './ExerciseRunMedia';
import { useCommunityFlowsWithExercise } from './community';
import { exerciseSessions, type ExerciseSession } from './flow-runs';
import type { SetScheme } from '../../shared/set-schemes';
import { muscleMapFor, muscleAreas, type MuscleArea } from '../../shared/muscle-map';
import { BodyMap } from './BodyMap';

const gap = 12;
const railWidth = 88;

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

const areaTitle = (area: MuscleArea) => muscleAreas.find(item => item.id === area)?.title ?? area;

function ExerciseSquare({ item }: { item: GymExercise }) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: C.card,
      }}
    >
      <ExerciseVisual exerciseId={item.id} cover />
    </View>
  );
}

/** One exercise: what it is, your own last record, and the flows that use it. */
export function ExercisePage({
  item,
  library,
  onBack,
  onView,
  topInset,
  scheme,
}: {
  item: GymExercise;
  library: HabitFlow[];
  onBack: () => void;
  onView: (flow: HabitFlow) => void;
  topInset?: number;
  scheme?: SetScheme | null;
}) {
  const { colors: C } = useTheme();
  const contextInset = useRootListInset();
  const inset = topInset ?? contextInset;
  const [info, setInfo] = useState(false);
  const [last, setLast] = useState<ExerciseSession | null>(null);
  useEffect(() => {
    let live = true;
    void exerciseSessions([item.id])
      .then(result => {
        if (live) setLast(result.sessions[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [item.id]);
  const facts = [
    ['Equipment', station(item.station)?.title ?? item.station],
    ['Works', item.muscles.map(label).join(', ')],
  ];
  const muscles = muscleMapFor(item.id);
  const emphasisesAbs = [...muscles.main, ...muscles.helpers].some(
    area => area === 'upper-abs' || area === 'lower-abs',
  );
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar title="All Exercises" onBack={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 128, gap: 16 }}
      >
        <ExercisePicture exerciseId={item.id} name={item.name} onPress={() => setInfo(true)} />
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>
          {item.name}
        </Text>
        <View>
          {facts.map(([title, value]) => (
            <View
              key={title}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderColor: C.line,
              }}
            >
              <Text style={{ width: 88, color: C.muted, fontSize: 15 }}>{title}</Text>
              <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{value}</Text>
            </View>
          ))}
          {info ? <ExerciseHowToSheet item={item} scheme={scheme} onClose={() => setInfo(false)} /> : null}
          {last && (
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderColor: C.line,
              }}
            >
              <Text style={{ width: 88, color: C.muted, fontSize: 15 }}>Your last</Text>
              <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{yourLastLine(last.sets)}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <BodyMap main={muscles.main} helpers={muscles.helpers} width={220} />
          <View style={{ alignSelf: 'stretch' }}>
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderColor: C.line,
              }}
            >
              <Text style={{ width: 88, color: C.muted, fontSize: 15 }}>Main</Text>
              <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{muscles.main.map(areaTitle).join(', ')}</Text>
            </View>
            {muscles.helpers.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 0.5,
                  borderColor: C.line,
                }}
              >
                <Text style={{ width: 88, color: C.muted, fontSize: 15 }}>Helps</Text>
                <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>
                  {muscles.helpers.map(areaTitle).join(', ')}
                </Text>
              </View>
            )}
          </View>
          {emphasisesAbs ? (
            <Text style={{ alignSelf: 'stretch', color: C.muted, fontSize: 13, lineHeight: 18 }}>
              The abs work as one muscle. This shows which part this movement emphasises.
            </Text>
          ) : null}
        </View>
        <FoundIn exerciseId={item.id} library={library} onView={onView} />
      </ScrollView>
    </View>
  );
}

/** Every flow and session that includes this exercise: Qram's own, then the community's. */
function FoundIn({
  exerciseId,
  library,
  onView,
}: {
  exerciseId: string;
  library: HabitFlow[];
  onView: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const [, openCommunityFlow] = usePaneState<string | null>('communityFlow', null);
  const community = useCommunityFlowsWithExercise(exerciseId).flows;
  const qram = exerciseUsage(exerciseId).map(entry => ({
    key: `${entry.kind}:${entry.id}`,
    title: entry.title,
    detail: entry.kind === 'flow' ? 'Flow' : 'Session',
    open: entry.kind === 'flow' ? library.find(flow => flow.id === entry.id) : undefined,
  }));
  if (!qram.length && !community.length) return null;
  const row = (key: string, title: string, detail: string, onPress?: () => void) =>
    onPress ? (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}, ${detail}`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ flex: 1, color: C.lime, fontSize: 16 }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text>
        <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
      </Pressable>
    ) : (
      <View
        key={key}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${title}, ${detail}`}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text>
      </View>
    );
  const group = (title: string, rows: React.ReactNode[]) =>
    rows.length ? (
      <View style={{ gap: 0 }}>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 4 }}>{title}</Text>
        {rows}
      </View>
    ) : null;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
        Found in
      </Text>
      {group(
        'Qram',
        qram.map(entry => {
          const flow = entry.open;
          return row(entry.key, entry.title, entry.detail, flow ? () => onView(flow) : undefined);
        }),
      )}
      {group(
        'Community',
        community.map(flow =>
          row(`community:${flow.id}`, flow.title, `by ${flow.author}`, () => openCommunityFlow(flow.id)),
        ),
      )}
    </View>
  );
}

/** The small search bar above the exercise list. */
function ExerciseSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View
        style={{
          height: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          borderRadius: 18,
          paddingHorizontal: 10,
        }}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
          <Circle cx={11} cy={11} r={6.5} stroke={C.muted} strokeWidth={2} fill="none" />
          <Path d="M16 16l4.5 4.5" stroke={C.muted} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <TextInput
          accessibilityLabel="Search exercises"
          value={query}
          onChangeText={onChange}
          placeholder="Search exercises"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, height: 36, paddingVertical: 0, color: C.text, fontSize: 14 }}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear exercise search"
            onPress={() => onChange('')}
            hitSlop={8}
          >
            <Text style={{ color: C.muted, fontSize: 14 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Every exercise in the catalog, browsed by the kind of equipment it uses. */
export function ExerciseCatalog({
  library,
  onBack,
  onView,
}: {
  library: HabitFlow[];
  onBack: () => void;
  onView: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [groupId, setGroupId] = usePaneState('exerciseGroup', 'all');
  const [openedId, setOpenedId] = usePaneState<string | null>('exerciseOpen', null);
  const [query, setQuery] = usePaneState('exerciseQuery', '');
  const [width, setWidth] = useState(0);
  const opened = openedId ? exercise(openedId) : undefined;
  if (opened)
    return <ExercisePage item={opened} library={library} onBack={() => setOpenedId(null)} onView={onView} />;
  const group = equipmentGroups.find(entry => entry.id === groupId);
  const searching = query.trim().length > 0;
  // A group with several pieces of equipment names each one above its exercises.
  const sections: { title: string | null; items: GymExercise[] }[] = searching
    ? [{ title: null, items: searchExercises(query) }]
    : !group
      ? [{ title: null, items: exercisesAtStation('all') }]
      : group.stations.map(id => ({
          title: group.stations.length > 1 ? (station(id)?.title ?? id) : null,
          items: exercisesAtStation(id),
        }));
  const found = sections.some(section => section.items.length > 0);
  const inner = width > 24 ? width - 24 : 0;
  const cell = inner > gap ? (inner - gap) / 2 : 0;
  const grid: { title: string | null; leading: boolean; data: GymExercise[][] }[] = [];
  sections.forEach(section => {
    if (section.items.length === 0) return;
    const data: GymExercise[][] = [];
    for (let index = 0; index < section.items.length; index += 2) {
      data.push(section.items.slice(index, index + 2));
    }
    grid.push({ title: section.title, leading: grid.length > 0, data });
  });
  const rail = [{ id: 'all', title: 'All' }, ...equipmentGroups];
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar
        title="All Exercises"
        onBack={() => {
          setQuery('');
          onBack();
        }}
      />
      <ExerciseSearch query={query} onChange={setQuery} />
      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: 0.5, borderColor: C.line }}>
        <ScrollView
          style={{ width: railWidth, flexGrow: 0, borderRightWidth: 0.5, borderColor: C.line }}
          contentContainerStyle={{ paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {rail.map(entry => {
            const selected = !searching && entry.id === (group?.id ?? 'all');
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={entry.title}
                accessibilityState={{ selected }}
                onPress={() => {
                  setQuery('');
                  setGroupId(entry.id);
                }}
                style={{
                  minHeight: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    color: selected ? C.lime : C.muted,
                    fontSize: 13,
                    fontWeight: selected ? '700' : '500',
                    textAlign: 'center',
                  }}
                >
                  {entry.title}
                </Text>
                {selected && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 10,
                      bottom: 10,
                      width: 3,
                      borderTopLeftRadius: 3,
                      borderBottomLeftRadius: 3,
                      backgroundColor: C.lime,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flex: 1 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          {cell > 0 && (
            <SectionList
              key={searching ? 'search' : (group?.id ?? 'all')}
              style={{ flex: 1 }}
              sections={grid}
              contentContainerStyle={{ padding: 12, paddingBottom: 128 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              stickySectionHeadersEnabled={false}
              keyExtractor={row => row.map(item => item.id).join('|')}
              renderSectionHeader={({ section }) =>
                section.title ? (
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: C.text,
                      fontSize: 15,
                      fontWeight: '700',
                      marginTop: section.leading ? 20 : 0,
                      marginBottom: 10,
                    }}
                  >
                    {section.title}
                  </Text>
                ) : null
              }
              renderItem={({ item: row }) => (
                <View style={{ flexDirection: 'row', gap, marginBottom: gap }}>
                  {row.map(item => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.name}`}
                      onPress={() => setOpenedId(item.id)}
                      style={({ pressed }) => ({ width: cell, gap: 6, opacity: pressed ? 0.75 : 1 })}
                    >
                      <ExerciseSquare item={item} />
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 19 }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{label(item.muscles[0])}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              ListEmptyComponent={
                searching && !found ? (
                  <Text style={{ color: C.muted, fontSize: 14 }}>No exercises found.</Text>
                ) : undefined
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
