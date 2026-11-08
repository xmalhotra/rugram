import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
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
import { useTheme } from './design/theme';
import { useRootListInset } from './RootList';
import { usePaneState } from './pane-state';
import { CatalogBar } from './FlowCatalogTile';
import { CheckpointIcon, RoutineTypeIcon } from './RoutineIcons';
import { fetchRoutine, fetchRoutines } from './routines';
import { useDailyChecks } from './daily-checks';
import { useSession } from './session';
import { checkpointRoute, emptyRoutineRoute, type RoutineRoute } from './routine-route';

const railWidth = 88;
const gap = 12;

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
      style={{ width: railWidth, flexGrow: 0, borderRightWidth: 0.5, borderColor: C.line }}
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
            style={{ alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6 }}
          >
            <CheckpointIcon checkpoint={checkpoint} color={on ? C.lime : C.muted} size={22} />
            <Text
              numberOfLines={2}
              style={{
                color: on ? C.lime : C.muted,
                fontSize: 11,
                fontWeight: on ? '700' : '500',
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
    <View style={{ height: 56, flexGrow: 0, flexShrink: 0, borderBottomWidth: 0.5, borderColor: C.line }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 12 }}
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
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: selected ? C.lime : C.card,
                borderWidth: 1,
                borderColor: selected ? C.lime : C.line,
              }}
            >
              <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 14 }}>{filter.label}</Text>
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
      style={({ pressed }) => ({ width, padding: 6, gap: 4, opacity: pressed ? 0.75 : 1 })}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <RoutineTypeIcon type={routine.type} color={C.muted} size={18} />
        <Text numberOfLines={2} style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 19 }}>
          {routine.title}
        </Text>
      </View>
      {!!parts && (
        <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
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
  const [, setMode] = usePaneState<'map' | 'daily'>('yoursMode', 'map', 'account');
  const type = route.type === 'All' ? undefined : route.type;
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar title="Routine" onBack={() => setRoute(emptyRoutineRoute)} />
      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: 0.5, borderColor: C.line }}>
        <CheckpointRail
          selected={checkpoint}
          onSelect={next => setRoute(checkpointRoute(next, route.swapDailyId ?? undefined))}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <TypeRow value={route.type} onChange={next => setRoute(current => ({ ...current, type: next }))} />
          {route.swapDailyId && (
            <Text style={{ color: C.muted, fontSize: 13, paddingHorizontal: 12, paddingTop: 8 }}>Pick a replacement</Text>
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
              setMode('daily');
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
  const cell = width > 0 ? (width - gap) / 2 : 0;
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
        if (live) setError('Could not load routines.');
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
      .catch(() => setError('Could not load routines.'))
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
          contentContainerStyle={{ paddingBottom: 128, paddingTop: 8 }}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ color: C.muted, fontSize: 14, padding: 12 }}>{error || 'Nothing here yet.'}</Text>
            ) : undefined
          }
          ListFooterComponent={
            last ? (
              <View style={{ gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
                {!q && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search everything"
                    onPress={onSearch}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.muted, fontSize: 15 }}>Search everything</Text>
                  </Pressable>
                )}
                {checkpoint && (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      accessibilityLabel="Add your own"
                      value={own}
                      onChangeText={setOwn}
                      maxLength={40}
                      placeholder="Add your own"
                      placeholderTextColor={C.muted}
                      style={{
                        minHeight: 48,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.line,
                        backgroundColor: C.card,
                        color: C.text,
                        fontSize: 16,
                        paddingHorizontal: 12,
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
                      style={{ minHeight: 44, justifyContent: 'center', opacity: own.trim() ? 1 : 0.5 }}
                    >
                      <Text style={{ color: C.text, fontSize: 15 }}>Add your own</Text>
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
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar
        title="Routine"
        onBack={() => setRoute(current => ({ ...current, search: false, checkpoint: current.fromCheckpoint }))}
      />
      <View style={{ flex: 1, borderTopWidth: 0.5, borderColor: C.line }}>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
          <TextInput
            accessibilityLabel="Search routines"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => setQ(text.trim())}
            maxLength={80}
            placeholder="Search routines"
            placeholderTextColor={C.muted}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.card,
              color: C.text,
              fontSize: 16,
              paddingHorizontal: 12,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => setQ(text.trim())}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
          >
            <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Search</Text>
          </Pressable>
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
          <Text style={{ color: C.muted, fontSize: 14, paddingHorizontal: 12 }}>Search across all checkpoints.</Text>
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
        if (live) setError('Could not load that routine.');
      });
    return () => {
      live = false;
    };
  }, [routineId]);
  const slot = route.fromCheckpoint ?? routine?.mainCheckpoint;
  const saved = routine && slot ? dailyRoutine(checks, routine.id, slot) : undefined;
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar
        title="Routine"
        onBack={() =>
          setRoute(current => ({
            ...current,
            routineId: null,
            search: current.fromCheckpoint ? false : current.search,
          }))
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 128, gap: 16 }}>
        {error ? <Text style={{ color: C.muted }}>{error}</Text> : null}
        {routine && (
          <>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '700' }}>
              {routine.title}
            </Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>{routine.type}</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>What's in it</Text>
            {routine.parts.map(part => (
              <Text key={`${part.name}-${part.amount ?? ''}`} style={{ color: C.text, fontSize: 16 }}>
                {[part.amount, part.name].filter(Boolean).join(' ')}
              </Text>
            ))}
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>Usually</Text>
            <Text style={{ color: C.text, fontSize: 16 }}>{routine.checkpoints.join(', ')}</Text>
            <Pressable
              accessibilityRole="button"
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
              style={{
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 26,
                backgroundColor: C.lime,
                marginTop: 8,
              }}
            >
              <Text style={{ color: C.onAccent, fontSize: 16, fontWeight: '700' }}>
                {saved ? '✓ In my day' : 'Add to my day'}
              </Text>
            </Pressable>
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
        borderRadius: 14,
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
