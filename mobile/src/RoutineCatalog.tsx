import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  routineCheckpoints,
  routineSlug,
  routineTypeFilters,
  type RoutineCard,
  type RoutineCheckpoint,
  type RoutineType,
  type RoutineTypeFilter,
} from '../../shared/routines';
import { addDailyItem, dailyRoutine, removeDailyItem, replaceDailyItem } from '../../shared/daily-checks';
import { Text } from './design/Text';
import { Button } from './design/components';
import { hit, opacity, radius, space, stroke, textRoles, useTheme } from './design/theme';
import { useRootListInset } from './RootList';
import { usePaneState } from './pane-state';
import { CatalogBar } from './FlowCatalogTile';
import { CheckpointIcon, RoutineTypeIcon } from './RoutineIcons';
import { fetchRoutine, fetchRoutines } from './routines';
import { useDailyChecks } from './daily-checks';
import { useSession } from './session';
import { checkpointRoute, emptyRoutineRoute, type RoutineRoute } from './routine-route';

const railWidth = 88;
const columnGap = space.ms;

function useRoute() {
  return usePaneState<RoutineRoute>('routineRoute', emptyRoutineRoute, 'account');
}

function CheckpointRail({
  selected,
  onSelect,
}: {
  selected: RoutineCheckpoint;
  onSelect: (checkpoint: RoutineCheckpoint) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <ScrollView
      style={{ width: railWidth, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
      contentContainerStyle={{ paddingBottom: 128 }}
      showsVerticalScrollIndicator={false}
    >
      {routineCheckpoints.map(checkpoint => {
        const on = checkpoint === selected;
        return (
          <Pressable
            key={checkpoint}
            accessibilityRole="button"
            accessibilityLabel={checkpoint}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(checkpoint)}
            style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.ms, paddingHorizontal: space.sm }}
          >
            <CheckpointIcon checkpoint={checkpoint} color={on ? C.lime : C.muted} size={22} />
            <Text
              numberOfLines={2}
              variant="caption"
              style={{
                color: on ? C.lime : C.muted,
                fontWeight: on ? '600' : undefined,
                textAlign: 'center',
              }}
            >
              {checkpoint}
            </Text>
            {on && (
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
  );
}

function TypeRow({ value, onChange }: { value: RoutineTypeFilter; onChange: (value: RoutineTypeFilter) => void }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ height: 56, flexGrow: 0, flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center', gap: space.sm, paddingHorizontal: space.ms }}
      >
        {routineTypeFilters.map(filter => {
          const selected = value === filter.id;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(filter.id)}
              style={{
                height: 36,
                justifyContent: 'center',
                paddingHorizontal: space.md,
                borderRadius: radius.small,
                backgroundColor: selected ? C.lime : C.card,
                borderWidth: stroke.line,
                borderColor: selected ? C.lime : C.line,
              }}
            >
              <Text variant="subhead" style={{ color: selected ? C.onAccent : C.text }}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RoutineCardView({
  routine,
  width,
  onPress,
}: {
  routine: RoutineCard;
  width: number;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  const parts = routine.parts.map(part => part.name).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={routine.title}
      onPress={onPress}
      style={({ pressed }) => ({ width, padding: space.sm, gap: space.xs, opacity: pressed ? opacity.pressed : 1 })}
    >
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <RoutineTypeIcon type={routine.type} color={C.muted} size={18} />
        <Text numberOfLines={2} variant="subhead" style={{ flex: 1, color: C.text, fontWeight: '600' }}>
          {routine.title}
        </Text>
      </View>
      {!!parts && (
        <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
          {parts}
        </Text>
      )}
    </Pressable>
  );
}

/** Checkpoint list: rail, type row, paged cards, then search and a private free-text row. */
export function RoutineCheckpointPage({ checkpoint }: { checkpoint: RoutineCheckpoint }) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [route, setRoute] = useRoute();
  const type = route.type === 'All' ? undefined : route.type;
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title="Daily flow" onBack={() => setRoute(emptyRoutineRoute)} />
      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
        <CheckpointRail
          selected={checkpoint}
          onSelect={next => setRoute(checkpointRoute(next, route.swapDailyId ?? undefined))}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <TypeRow value={route.type} onChange={next => setRoute(current => ({ ...current, type: next }))} />
          {route.swapDailyId && (
            <Text variant="footnote" style={{ color: C.muted, paddingHorizontal: space.ms, paddingTop: space.sm }}>Pick a replacement</Text>
          )}
          <RoutineBrowser
            checkpoint={checkpoint}
            type={type}
            swapDailyId={route.swapDailyId}
            onOpen={routine =>
              setRoute(current => ({ ...current, routineId: routine.id, fromCheckpoint: checkpoint }))
            }
            onSearch={() => setRoute(current => ({ ...current, search: true, checkpoint: null }))}
            onSwapped={() => {
              setRoute(emptyRoutineRoute);
              router.push('/(tabs)');
            }}
          />
        </View>
      </View>
    </View>
  );
}

function RoutineBrowser({
  checkpoint,
  type,
  q,
  swapDailyId,
  onOpen,
  onSearch,
  onSwapped,
}: {
  checkpoint?: RoutineCheckpoint;
  type?: RoutineType;
  q?: string;
  swapDailyId: string | null;
  onOpen: (routine: RoutineCard) => void;
  onSearch: () => void;
  onSwapped: () => void;
}) {
  const { colors: C } = useTheme();
  const { update } = useDailyChecks(useSession().data?.user?.id);
  const [width, setWidth] = useState(0);
  const [rows, setRows] = useState<RoutineCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [own, setOwn] = useState('');
  const cell = width > 0 ? (width - columnGap) / 2 : 0;
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setRows([]);
    setCursor(null);
    void fetchRoutines({ checkpoint, type, q })
      .then(result => {
        if (!live) return;
        setRows(result.routines);
        setCursor(result.nextCursor);
      })
      .catch(() => {
        if (live) setError('Could not load Daily flow.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [checkpoint, type, q]);
  function more() {
    if (!cursor || loading) return;
    setLoading(true);
    void fetchRoutines({ checkpoint, type, q, cursor })
      .then(result => {
        setRows(current => [...current, ...result.routines]);
        setCursor(result.nextCursor);
      })
      .catch(() => setError('Could not load Daily flow.'))
      .finally(() => setLoading(false));
  }
  const last = !loading && !cursor;
  return (
    <View style={{ flex: 1 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {cell > 0 && (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          numColumns={2}
          onEndReached={more}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 128, paddingTop: space.sm }}
          ListEmptyComponent={
            !loading ? (
              <Text variant="subhead" style={{ color: C.muted, padding: space.ms }}>{error || 'Nothing here yet.'}</Text>
            ) : undefined
          }
          ListFooterComponent={
            last ? (
              <View style={{ gap: space.sm, paddingHorizontal: space.ms, paddingTop: space.sm }}>
                {!q && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search everything"
                    onPress={onSearch}
                    style={{ minHeight: hit, justifyContent: 'center' }}
                  >
                    <Text variant="subhead" style={{ color: C.muted }}>Search everything</Text>
                  </Pressable>
                )}
                {checkpoint && (
                  <View style={{ gap: space.sm }}>
                    <TextInput
                      accessibilityLabel="Add your own"
                      value={own}
                      onChangeText={setOwn}
                      maxLength={40}
                      placeholder="Add your own"
                      placeholderTextColor={C.muted}
                      style={{
                        minHeight: hit,
                        borderRadius: radius.small,
                        borderWidth: stroke.line,
                        borderColor: C.line,
                        backgroundColor: C.card,
                        color: C.text,
                        fontSize: textRoles.callout.fontSize,
                        paddingHorizontal: space.ms,
                      }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add your own"
                      accessibilityState={{ disabled: !own.trim() }}
                      disabled={!own.trim()}
                      onPress={() => {
                        update(current => addDailyItem(current, own, 1, `d-${Date.now().toString(36)}`, checkpoint));
                        setOwn('');
                      }}
                      style={{ minHeight: hit, justifyContent: 'center', opacity: own.trim() ? 1 : 0.5 }}
                    >
                      <Text variant="subhead" style={{ color: C.text }}>Add your own</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <RoutineCardView
              routine={item}
              width={cell}
              onPress={() => {
                if (swapDailyId) {
                  update(current => replaceDailyItem(current, swapDailyId, { name: item.title, routineId: item.id }));
                  onSwapped();
                  return;
                }
                onOpen(item);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

/** Search across every checkpoint. */
export function RoutineSearchPage() {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [route, setRoute] = useRoute();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const type = route.type === 'All' ? undefined : route.type;
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar
        title="Daily flow"
        onBack={() => setRoute(current => ({ ...current, search: false, checkpoint: current.fromCheckpoint }))}
      />
      <View style={{ flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
        <View style={{ flexDirection: 'row', gap: space.sm, padding: space.ms }}>
          <TextInput
            accessibilityLabel="Search Daily flow"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => setQ(text.trim())}
            maxLength={80}
            placeholder="Search Daily flow"
            placeholderTextColor={C.muted}
            style={{
              flex: 1,
              minHeight: hit,
              borderRadius: radius.small,
              borderWidth: stroke.line,
              borderColor: C.line,
              backgroundColor: C.card,
              color: C.text,
              fontSize: textRoles.callout.fontSize,
              paddingHorizontal: space.ms,
            }}
          />
          <Button variant="text" size="regular" title="Search" accessibilityLabel="Search" onPress={() => setQ(text.trim())} />
        </View>
        <TypeRow value={route.type} onChange={next => setRoute(current => ({ ...current, type: next }))} />
        {q ? (
          <RoutineBrowser
            q={q}
            type={type}
            swapDailyId={null}
            onOpen={routine => setRoute(current => ({ ...current, routineId: routine.id, fromCheckpoint: null }))}
            onSearch={() => undefined}
            onSwapped={() => undefined}
          />
        ) : (
          <Text variant="subhead" style={{ color: C.muted, paddingHorizontal: space.ms }}>Search across all checkpoints.</Text>
        )}
      </View>
    </View>
  );
}

/** One routine: what is in it, when it usually happens, and add or remove. */
export function RoutineDetailPage({ routineId }: { routineId: string }) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [route, setRoute] = useRoute();
  const { checks, update } = useDailyChecks(useSession().data?.user?.id);
  const [routine, setRoutine] = useState<RoutineCard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void fetchRoutine(routineId)
      .then(result => {
        if (live) setRoutine(result);
      })
      .catch(() => {
        if (live) setError('Could not load that.');
      });
    return () => {
      live = false;
    };
  }, [routineId]);
  const slot = route.fromCheckpoint ?? routine?.mainCheckpoint;
  const saved = routine && slot ? dailyRoutine(checks, routine.id, slot) : undefined;
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar
        title="Daily flow"
        onBack={() =>
          setRoute(current => ({
            ...current,
            routineId: null,
            search: current.fromCheckpoint ? false : current.search,
          }))
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 128, gap: space.md }}>
        {error ? <Text style={{ color: C.muted }}>{error}</Text> : null}
        {routine && (
          <>
            <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
              {routine.title}
            </Text>
            <Text variant="subhead" style={{ color: C.muted }}>{routine.type}</Text>
            <Text variant="headline" style={{ color: C.text }}>What's in it</Text>
            {routine.parts.map(part => (
              <Text key={`${part.name}-${part.amount ?? ''}`} variant="callout" style={{ color: C.text }}>
                {[part.amount, part.name].filter(Boolean).join(' ')}
              </Text>
            ))}
            <Text variant="headline" style={{ color: C.text }}>Usually</Text>
            <Text variant="callout" style={{ color: C.text }}>{routine.checkpoints.join(', ')}</Text>
            <Button
              title={saved ? '✓ In my day' : 'Add to my day'}
              accessibilityLabel={saved ? 'In my day' : 'Add to my day'}
              onPress={() => {
                if (!slot) return;
                if (saved) {
                  update(current => removeDailyItem(current, saved.id));
                  return;
                }
                update(current =>
                  addDailyItem(
                    current,
                    routine.title,
                    1,
                    `r-${routine.id}-${routineSlug(slot)}`,
                    slot,
                    routine.id,
                  ),
                );
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function RoutineCheckpointCover({ checkpoint }: { checkpoint: RoutineCheckpoint }) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1,
        borderRadius: radius.control,
        overflow: 'hidden',
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CheckpointIcon checkpoint={checkpoint} color={C.muted} size={34} />
    </View>
  );
}
