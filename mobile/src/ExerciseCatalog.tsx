import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
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
import { Button, SectionHeader } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, size, space, stroke, textRoles, useTheme } from './design/theme';
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

const gap = space.ms;
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
        borderRadius: radius.control,
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
  onUse,
}: {
  item: GymExercise;
  library: HabitFlow[];
  onBack: () => void;
  onView: (flow: HabitFlow) => void;
  topInset?: number;
  scheme?: SetScheme | null;
  /** Pick mode: this exercise can replace another. A returned sentence refuses the pick. */
  onUse?: () => void | string;
}) {
  const { colors: C } = useTheme();
  const contextInset = useRootListInset();
  const inset = topInset ?? contextInset;
  const [info, setInfo] = useState(false);
  const [refused, setRefused] = useState('');
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
  useEffect(() => setRefused(''), [item.id]);
  const facts = [
    ['Equipment', station(item.station)?.title ?? item.station],
    ['Works', item.muscles.map(label).join(', ')],
  ];
  const muscles = muscleMapFor(item.id);
  const emphasisesAbs = [...muscles.main, ...muscles.helpers].some(
    area => area === 'upper-abs' || area === 'lower-abs',
  );
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title="All Exercises" onBack={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128, gap: space.md }}
      >
        <ExercisePicture exerciseId={item.id} name={item.name} onPress={() => setInfo(true)} />
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          {item.name}
        </Text>
        {onUse ? (
          <View style={{ gap: space.sm }}>
            <Button
              title="Use this instead"
              accessibilityLabel="Use this instead"
              onPress={() => {
                const reason = onUse();
                setRefused(typeof reason === 'string' ? reason : '');
              }}
            />
            {refused ? <Text variant="subhead" style={{ color: C.text }}>{refused}</Text> : null}
          </View>
        ) : null}
        <View>
          {facts.map(([title, value]) => (
            <View
              key={title}
              style={{
                flexDirection: 'row',
                gap: space.ms,
                paddingVertical: space.ms,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: C.line,
              }}
            >
              <Text variant="subhead" style={{ width: 88, color: C.muted }}>{title}</Text>
              <Text variant="subhead" style={{ flex: 1, color: C.text }}>{value}</Text>
            </View>
          ))}
          {info ? <ExerciseHowToSheet item={item} scheme={scheme} onClose={() => setInfo(false)} /> : null}
          {last && (
            <View
              style={{
                flexDirection: 'row',
                gap: space.ms,
                paddingVertical: space.ms,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: C.line,
              }}
            >
              <Text variant="subhead" style={{ width: 88, color: C.muted }}>Your last</Text>
              <Text variant="subhead" style={{ flex: 1, color: C.text }}>{yourLastLine(last.sets)}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <BodyMap main={muscles.main} helpers={muscles.helpers} width={220} />
          <View style={{ alignSelf: 'stretch' }}>
            <View
              style={{
                flexDirection: 'row',
                gap: space.ms,
                paddingVertical: space.ms,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: C.line,
              }}
            >
              <Text variant="subhead" style={{ width: 88, color: C.muted }}>Main</Text>
              <Text variant="subhead" style={{ flex: 1, color: C.text }}>{muscles.main.map(areaTitle).join(', ')}</Text>
            </View>
            {muscles.helpers.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: space.ms,
                  paddingVertical: space.ms,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: C.line,
                }}
              >
                <Text variant="subhead" style={{ width: 88, color: C.muted }}>Helps</Text>
                <Text variant="subhead" style={{ flex: 1, color: C.text }}>
                  {muscles.helpers.map(areaTitle).join(', ')}
                </Text>
              </View>
            )}
          </View>
          {emphasisesAbs ? (
            <Text variant="footnote" style={{ alignSelf: 'stretch', color: C.muted }}>
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
          minHeight: hit,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.ms,
          opacity: pressed ? opacity.pressed : 1,
        })}
      >
        <Text variant="callout" style={{ flex: 1, color: C.lime }}>{title}</Text>
        <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.lg} />
      </Pressable>
    ) : (
      <View
        key={key}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${title}, ${detail}`}
        style={{ minHeight: hit, flexDirection: 'row', alignItems: 'center', gap: space.ms }}
      >
        <Text variant="callout" style={{ flex: 1, color: C.text }}>{title}</Text>
        <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text>
      </View>
    );
  const group = (title: string, rows: React.ReactNode[]) =>
    rows.length ? (
      <View style={{ gap: 0 }}>
        <Text variant="footnote" style={{ color: C.muted, fontWeight: '600', marginTop: space.xs }}>{title}</Text>
        {rows}
      </View>
    ) : null;
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title="Found in" />
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
    <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm }}>
      <View
        style={{
          height: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          borderWidth: stroke.line,
          borderColor: C.line,
          backgroundColor: C.card,
          borderRadius: radius.pill,
          paddingHorizontal: space.ms,
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
          style={{ flex: 1, height: 36, paddingVertical: 0, color: C.text, fontSize: textRoles.subhead.fontSize }}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear exercise search"
            onPress={() => onChange('')}
            hitSlop={8}
          >
            <Text variant="subhead" style={{ color: C.muted }}>✕</Text>
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
  topInset,
  pick,
}: {
  library: HabitFlow[];
  onBack: () => void;
  onView: (flow: HabitFlow) => void;
  /** Used when this catalog is opened inside another screen, such as a swap. */
  topInset?: number;
  /** Choosing a replacement. The list starts on this muscle, and a detail page can accept it. */
  pick?: {
    muscle?: MuscleArea | null;
    onPick: (exerciseId: string) => void;
    /** One sentence when this exercise cannot stand in. Null when it can. */
    refuse?: (exerciseId: string) => string | null;
  };
}) {
  const { colors: C } = useTheme();
  const contextInset = useRootListInset();
  const inset = topInset ?? contextInset;
  const [paneGroup, setPaneGroup] = usePaneState('exerciseGroup', 'all');
  const [paneOpen, setPaneOpen] = usePaneState<string | null>('exerciseOpen', null);
  const [paneQuery, setPaneQuery] = usePaneState('exerciseQuery', '');
  // Pick mode must not reuse the catalogue the member left open.
  const [localGroup, setLocalGroup] = useState('all');
  const [localOpen, setLocalOpen] = useState<string | null>(null);
  const [localQuery, setLocalQuery] = useState('');
  const [showMuscle, setShowMuscle] = useState(Boolean(pick?.muscle));
  const groupId = pick ? localGroup : paneGroup;
  const setGroupId = pick ? setLocalGroup : setPaneGroup;
  const openedId = pick ? localOpen : paneOpen;
  const setOpenedId = pick ? setLocalOpen : setPaneOpen;
  const query = pick ? localQuery : paneQuery;
  const setQuery = pick ? setLocalQuery : setPaneQuery;
  const [width, setWidth] = useState(0);
  const opened = openedId ? exercise(openedId) : undefined;
  if (opened)
    return (
      <ExercisePage
        item={opened}
        library={library}
        topInset={topInset}
        onBack={() => setOpenedId(null)}
        onView={onView}
        onUse={
          pick
            ? () => {
                const reason = pick.refuse?.(opened.id);
                if (reason) return reason;
                pick.onPick(opened.id);
              }
            : undefined
        }
      />
    );
  const group = equipmentGroups.find(entry => entry.id === groupId);
  const searching = query.trim().length > 0;
  const muscle = pick?.muscle && showMuscle ? pick.muscle : null;
  const keep = (items: GymExercise[]) => (muscle ? items.filter(item => muscleMapFor(item.id).main[0] === muscle) : items);
  // A group with several pieces of equipment names each one above its exercises.
  const sections: { title: string | null; items: GymExercise[] }[] = searching
    ? [{ title: null, items: keep(searchExercises(query)) }]
    : !group
      ? [{ title: null, items: keep(exercisesAtStation('all')) }]
      : group.stations.map(id => ({
          title: group.stations.length > 1 ? (station(id)?.title ?? id) : null,
          items: keep(exercisesAtStation(id)),
        }));
  const found = sections.some(section => section.items.length > 0);
  const inner = width > space.ms * 2 ? width - space.ms * 2 : 0;
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
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar
        title="All Exercises"
        onBack={() => {
          setQuery('');
          onBack();
        }}
      />
      <ExerciseSearch query={query} onChange={setQuery} />
      {pick?.muscle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showMuscle
              ? `Showing ${areaTitle(pick.muscle)}. Show every exercise`
              : `Only ${areaTitle(pick.muscle)}`
          }
          onPress={() => setShowMuscle(value => !value)}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            minHeight: hit,
            marginHorizontal: space.md,
            marginBottom: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.pill,
            borderWidth: stroke.line,
            borderColor: showMuscle ? C.lime : C.line,
            backgroundColor: showMuscle ? C.lime : C.card,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <Text variant="subhead" style={{ color: showMuscle ? C.onAccent : C.text, fontWeight: '600' }}>
            {showMuscle ? `${areaTitle(pick.muscle)} ✕` : `Only ${areaTitle(pick.muscle)}`}
          </Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
        <ScrollView
          style={{ width: railWidth, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
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
                  minHeight: size.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: space.ms,
                  paddingHorizontal: space.sm,
                }}
              >
                <Text
                  numberOfLines={2}
                  variant="footnote"
                  style={{
                    color: selected ? C.lime : C.muted,
                    fontWeight: selected ? '600' : '400',
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
                      top: space.ms,
                      bottom: space.ms,
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
              contentContainerStyle={{ padding: space.ms, paddingBottom: 128 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              stickySectionHeadersEnabled={false}
              keyExtractor={row => row.map(item => item.id).join('|')}
              renderSectionHeader={({ section }) =>
                section.title ? (
                  <Text
                    accessibilityRole="header"
                    variant="subhead"
                    style={{
                      color: C.text,
                      fontWeight: '600',
                      marginTop: section.leading ? space.lg : 0,
                      marginBottom: space.ms,
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
                      style={({ pressed }) => ({ width: cell, gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
                    >
                      <ExerciseSquare item={item} />
                      <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                        {item.name}
                      </Text>
                      <Text variant="caption" style={{ color: C.muted }}>{label(item.muscles[0])}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              ListEmptyComponent={
                searching && !found ? (
                  <Text variant="subhead" style={{ color: C.muted }}>No exercises found.</Text>
                ) : muscle && !found ? (
                  <Text variant="subhead" style={{ color: C.muted }}>No exercises for this muscle.</Text>
                ) : undefined
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
