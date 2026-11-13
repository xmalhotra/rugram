import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import {
  catalogFlow,
  catalogTile,
  flowsInTile,
  programmesInTile,
  sectionsWithTiles,
  tilesInSection,
  type CatalogFlow,
  type CatalogLevel,
  type CatalogProgramme,
} from '../../shared/flow-catalog';
import {
  defaultFlowView,
  goalChip,
  trainPlaceChip,
  type FlowGoal,
  type FlowMember,
  type FlowOverrides,
  type TrainPlace,
  type WorkoutMinutes,
} from '../../shared/flow-defaults';
import { describedCatalogFlow, isFlowLevel, memberCatalogLine, useFlowMember } from './flow-member';
import { localDate } from '../../shared/flow-habits';
import { customflowKey } from '../../shared/customflows';
import { useCustomflows } from './customflows';
import { usePersonalMetrics } from './personal-metrics';
import { Text } from './design/Text';
import { Button } from './design/components';
import { glass, hit, opacity, radius, space, stroke, useTheme } from './design/theme';
import { usePaneState } from './pane-state';
import { useRootListInset } from './RootList';
import { CatalogCover } from './CatalogCover';
import { ExerciseVisual } from './ExerciseVisual';
import { SeriesSheet } from './SeriesSheet';
import { trainingSessionsForTile, type CatalogSessionCard } from './training-api';

const levels: CatalogLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const goalOrder: FlowGoal[] = ['strength', 'size', 'fitness', 'mobility'];
const places: TrainPlace[] = ['gym', 'dumbbells', 'bodyweight'];
const times: WorkoutMinutes[] = [30, 45, 60];
const gap = space.ms;

type FlowCardNote = { labels: string[]; reason?: string };

function noteLine(note?: FlowCardNote) {
  if (!note) return '';
  return [note.reason, ...note.labels].filter(Boolean).join('. ');
}

function nextIn<T>(list: readonly T[], current: T) {
  const index = list.indexOf(current);
  return list[(index + 1) % list.length];
}
const railWidth = 88;

function ChipScroller({ chips, selected, onSelect }: { chips: string[]; selected: string; onSelect: (chip: string) => void }) {
  const { colors: C } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.ms, paddingVertical: space.ms, alignItems: 'center' }}
    >
      {chips.map(chip => {
        const on = selected === chip;
        return (
          <Pressable
            key={chip}
            accessibilityRole="button"
            accessibilityLabel={chip}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(chip)}
            style={{
              height: 36,
              justifyContent: 'center',
              paddingHorizontal: space.md,
              borderRadius: radius.small,
              backgroundColor: on ? C.lime : C.card,
              borderWidth: stroke.line,
              borderColor: on ? C.lime : C.line,
            }}
          >
            <Text variant="subhead" style={{ color: on ? C.onAccent : C.text }}>
              {chip}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** One split: the days it is made of. A day opens on its own, or joins the routine as a series. */
function ProgrammeCard({
  programme,
  notes,
  onOpen,
  onAdd,
}: {
  programme: CatalogProgramme;
  notes?: ReadonlyMap<string, FlowCardNote>;
  onOpen: (id: string) => void;
  onAdd: (flow: CatalogFlow) => void;
}) {
  const { colors: C } = useTheme();
  const customflows = useCustomflows();
  const priorities = usePersonalMetrics()['gym.priorities']?.areas ?? [];
  const days = programme.days.map(id => catalogFlow(id)).filter((day): day is CatalogFlow => Boolean(day));
  return (
    <View style={{ borderRadius: radius.control, borderWidth: stroke.line, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.ms, gap: space.xxs }}>
        <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>
          {programme.title}
        </Text>
        <Text variant="footnote" style={{ color: C.muted }}>
          {programme.level}
        </Text>
      </View>
      {days.map(day => (
        <View
          key={day.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingLeft: space.md,
            paddingRight: space.sm,
            paddingVertical: space.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: C.line,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[`Open ${day.title}`, noteLine(notes?.get(day.id))].filter(Boolean).join('. ')}
            onPress={() => onOpen(day.id)}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.ms,
              minHeight: hit,
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <View style={{ width: 44, height: 44, borderRadius: radius.small, overflow: 'hidden' }}>
              <CatalogCover tileId={day.tileId} flowId={day.id} iconSize={22} square />
            </View>
            <View style={{ flex: 1, gap: space.xxs }}>
              <Text numberOfLines={1} variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                {day.title}
              </Text>
              {notes?.get(day.id)?.reason ? (
                <Text numberOfLines={2} variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                  {notes.get(day.id)?.reason}
                </Text>
              ) : null}
              <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
                {memberCatalogLine(day, priorities, day.flowId ? customflows[customflowKey('qram-flow', day.flowId)] : undefined)}
              </Text>
              {notes?.get(day.id)?.labels.map(label => (
                <Text key={label} numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
                  {label}
                </Text>
              ))}
              {day.flowId && customflows[customflowKey('qram-flow', day.flowId)] ? (
                <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                  Customised
                </Text>
              ) : null}
            </View>
          </Pressable>
          <Button
            variant="text"
            size="regular"
            title="Add to Daily flow"
            accessibilityLabel={`Add ${day.title} to Daily flow`}
            onPress={() => onAdd(day)}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * The bar on a catalog page: back, then a small title. With `overlayTop` it floats as
 * translucent glass, so the page scrolls underneath it.
 */
export function CatalogBar({
  title,
  onBack,
  overlayTop,
  right,
}: {
  title: string;
  onBack: () => void;
  /** Optional control at the bar's right end. */
  right?: React.ReactNode;
  /** Floats the bar this far down the page as glass, instead of holding its own row. */
  overlayTop?: number;
}) {
  const { colors: C, scheme } = useTheme();
  const overlay = overlayTop !== undefined;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', minHeight: hit, paddingHorizontal: space.sm },
        overlay && { position: 'absolute', top: overlayTop, left: 0, right: 0, zIndex: 2, overflow: 'hidden' },
      ]}
    >
      {overlay && (
        <>
          <BlurView
            intensity={glass.blur}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: glass.tint }]} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={C.text}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        variant="callout"
        style={{ flex: 1, color: C.text, fontWeight: '600' }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Two columns of flows. Requesting happens inside a flow's own page, never here. */
function sessionLine(session: CatalogSessionCard) {
  if (session.level) return session.level;
  return `${session.exerciseCount} ${session.exerciseCount === 1 ? 'exercise' : 'exercises'}`;
}

export function CatalogFlowGrid({
  flows,
  sessions = [],
  notes,
  onOpen,
  onOpenSession,
}: {
  flows: CatalogFlow[];
  sessions?: CatalogSessionCard[];
  notes?: ReadonlyMap<string, FlowCardNote>;
  onOpen: (id: string) => void;
  onOpenSession?: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const customflows = useCustomflows();
  const priorities = usePersonalMetrics()['gym.priorities']?.areas ?? [];
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - gap) / 2 : 0;
  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {cell > 0 &&
        sessions.map(session => (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${session.title}`}
            onPress={() => onOpenSession?.(session.id)}
            style={({ pressed }) => ({ width: cell, gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
          >
            <View style={{ width: '100%', aspectRatio: 0.9, borderRadius: radius.control, overflow: 'hidden', backgroundColor: C.card }}>
              <View style={{ flex: 1 }}>
                <ExerciseVisual exerciseId={session.coverExerciseId ?? undefined} cover />
              </View>
            </View>
            <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
              {session.title}
            </Text>
            <Text variant="footnote" style={{ color: C.muted }}>
              {sessionLine(session)}
            </Text>
          </Pressable>
        ))}
      {cell > 0 &&
        flows.map(flow => (
          <Pressable
            key={flow.id}
            accessibilityRole="button"
            accessibilityLabel={[`Open ${flow.title}`, noteLine(notes?.get(flow.id))].filter(Boolean).join('. ')}
            onPress={() => onOpen(flow.id)}
            style={({ pressed }) => ({ width: cell, gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
          >
            <CatalogCover tileId={flow.tileId} flowId={flow.id} aspectRatio={0.9} />
            <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
              {flow.title}
            </Text>
            {notes?.get(flow.id)?.reason ? (
              <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                {notes.get(flow.id)?.reason}
              </Text>
            ) : null}
            <Text variant="footnote" style={{ color: C.muted }}>
              {memberCatalogLine(flow, priorities, flow.flowId ? customflows[customflowKey('qram-flow', flow.flowId)] : undefined)}
            </Text>
            {notes?.get(flow.id)?.labels.map(label => (
              <Text key={label} variant="footnote" style={{ color: C.muted }}>
                {label}
              </Text>
            ))}
            {flow.flowId && customflows[customflowKey('qram-flow', flow.flowId)] ? (
              <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>
                Customised
              </Text>
            ) : null}
          </Pressable>
        ))}
    </View>
  );
}

export function FlowCatalogTile({
  tileId,
  focusId,
  onTile,
  onBack,
  onFlow,
  onSession,
}: {
  tileId: string;
  /** The member's onboarding focus, when they picked one. */
  focusId?: string;
  onTile: (id: string) => void;
  onBack: () => void;
  onFlow: (id: string) => void;
  onSession: (id: string) => void;
}) {
  const tile = catalogTile(tileId);
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [level, setLevel] = usePaneState(`catalogLevel:${tileId}`, 'All');
  const { member, setOverrides } = useFlowMember(focusId);
  const [chip, setChip] = useState('All');
  const [sessions, setSessions] = useState<CatalogSessionCard[]>([]);
  const [routine, setRoutine] = useState<CatalogFlow | null>(null);
  useEffect(() => setChip('All'), [tileId]);
  useEffect(() => {
    let live = true;
    trainingSessionsForTile(tileId)
      .then(result => {
        if (live) setSessions(result.sessions);
      })
      .catch(() => {
        if (live) setSessions([]);
      });
    return () => {
      live = false;
    };
  }, [tileId]);
  if (!tile) return null;
  // The bar names the section and the rail names the tile, so neither repeats.
  const section = sectionsWithTiles().find(item => item.id === tile.sectionId);
  const siblings = tilesInSection(tile.sectionId);
  const gym = tile.sectionId === 'gym';
  const pairing = ['All', ...(tile.chips ?? [])];
  // Gym keeps level on its own row, so a pairing and a level can both be on. Other sections keep one row.
  const flowChips = gym ? pairing : ['All', ...(tile.chips ?? []), ...levels];
  const programmeDays = new Set(programmesInTile(tile.id).flatMap(programme => programme.days));
  const viewMember: FlowMember = {
    ...member,
    overrides: {
      ...member.overrides,
      ...(level !== 'All' && isFlowLevel(level) ? { levelPick: level } : {}),
    },
  };
  const described = gym
    ? flowsInTile(tile.id).flatMap(flow => {
        if (chip !== 'All' && !programmeDays.has(flow.id) && !flow.tags.includes(chip)) return [];
        const facts = describedCatalogFlow(flow);
        return facts ? [facts] : [];
      })
    : [];
  const viewed = gym ? defaultFlowView(described, viewMember) : [];
  const notes: ReadonlyMap<string, FlowCardNote> = new Map(
    viewed.map(item => [item.id, { labels: item.labels, ...(item.reason ? { reason: item.reason } : {}) }]),
  );
  const visible = new Set(viewed.map(item => item.id));
  const flows = gym
    ? viewed.flatMap(item => (programmeDays.has(item.id) ? [] : [item.flow]))
    : flowsInTile(tile.id).filter(flow => {
        if (programmeDays.has(flow.id)) return false;
        if (chip === 'All') return true;
        if (levels.includes(chip as CatalogLevel)) return flow.level === chip;
        return flow.tags.includes(chip);
      });
  const programmes = programmesInTile(tile.id).flatMap(programme => {
    if (gym && level !== 'All' && programme.level !== level) return [];
    if (!gym) return [programme];
    const days = viewed.filter(item => programme.days.includes(item.id) && visible.has(item.id)).map(item => item.id);
    return days.length ? [{ ...programme, days }] : [];
  });
  const sessionCards = sessions.filter(session => {
    if (gym) {
      if (chip !== 'All') return false;
      return level === 'All' || session.level === level;
    }
    if (chip === 'All') return true;
    if (levels.includes(chip as CatalogLevel)) return session.level === chip;
    return false;
  });
  return (
    // The bar sits directly under the top bar, with no dark gap.
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title={section?.title ?? tile.title} onBack={onBack} />
      <View
        style={{ flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
      >
        <ScrollView
          style={{ width: railWidth, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
          contentContainerStyle={{ paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
        >
          {siblings.map(item => {
            const selected = item.id === tile.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityState={{ selected }}
                onPress={() => onTile(item.id)}
                style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.ms, paddingHorizontal: space.sm }}
              >
                <View
                  style={{
                    width: 58,
                    borderRadius: radius.control,
                    borderWidth: stroke.active,
                    borderColor: selected ? C.lime : 'transparent',
                  }}
                >
                  <CatalogCover tileId={item.id} iconSize={24} />
                </View>
                <Text
                  numberOfLines={2}
                  variant="caption"
                  style={{
                    color: selected ? C.lime : C.muted,
                    fontWeight: selected ? '600' : '400',
                    textAlign: 'center',
                  }}
                >
                  {item.title}
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
        <View style={{ flex: 1, minWidth: 0 }}>
          {gym ? <ForYouBar member={member} onChange={setOverrides} /> : null}
          {gym ? <ChipScroller chips={['All', ...levels]} selected={level} onSelect={setLevel} /> : null}
          {flowChips.length > 1 ? <ChipScroller chips={flowChips} selected={chip} onSelect={setChip} /> : null}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: space.ms, paddingBottom: 128, gap: space.md }}
          >
            {programmes.map(programme => (
              <ProgrammeCard key={programme.id} programme={programme} notes={notes} onOpen={onFlow} onAdd={setRoutine} />
            ))}
            {flows.length || sessionCards.length ? (
              <CatalogFlowGrid flows={flows} sessions={sessionCards} notes={notes} onOpen={onFlow} onOpenSession={onSession} />
            ) : null}
            {!programmes.length && !flows.length && !sessionCards.length ? (
              <Text variant="subhead" style={{ color: C.muted }}>
                Nothing here yet.
              </Text>
            ) : null}
          </ScrollView>
          {routine?.flowId ? (
            <SeriesSheet
              mode="create"
              title={routine.title}
              itemKind="flow"
              itemId={routine.flowId}
              start={localDate(new Date())}
              onClose={() => setRoutine(null)}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** The defaults, as chips. Changing or clearing one is remembered and beats the default. */
function ForYouBar({ member, onChange }: { member: FlowMember; onChange: (next: FlowOverrides) => void }) {
  const { colors: C } = useTheme();
  const overrides = member.overrides ?? {};
  const floor = overrides.level === undefined ? member.level : overrides.level;
  const place = overrides.place === undefined ? member.place : overrides.place;
  const minutes = overrides.minutes === undefined ? member.minutes : overrides.minutes;
  const goals = overrides.goals === undefined ? member.goals : overrides.goals;
  const chips: { key: string; label: string; onCycle: () => void; onClear: () => void }[] = [];
  if (floor && floor !== 'All') {
    chips.push({
      key: 'level',
      label: floor,
      onCycle: () => onChange({ ...overrides, level: nextIn(levels, floor) }),
      onClear: () => onChange({ ...overrides, level: null }),
    });
  }
  if (place) {
    chips.push({
      key: 'place',
      label: trainPlaceChip[place],
      onCycle: () => onChange({ ...overrides, place: nextIn(places, place) }),
      onClear: () => onChange({ ...overrides, place: null }),
    });
  }
  if (minutes === 30 || minutes === 45 || minutes === 60) {
    chips.push({
      key: 'minutes',
      label: `${minutes} min`,
      onCycle: () => onChange({ ...overrides, minutes: nextIn(times, minutes) }),
      onClear: () => onChange({ ...overrides, minutes: null }),
    });
  }
  if (goals?.length) {
    chips.push({
      key: 'goals',
      label: goals.map(goal => goalChip[goal]).join(' · '),
      onCycle: () => {
        const last = goals[goals.length - 1];
        onChange({ ...overrides, goals: [nextIn(goalOrder, last)] });
      },
      onClear: () => onChange({ ...overrides, goals: null }),
    });
  }
  if (!chips.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.ms, paddingVertical: space.ms, alignItems: 'center' }}
    >
      <Text variant="subhead" style={{ color: C.muted }}>
        For you:
      </Text>
      {chips.map(chip => (
        <View
          key={chip.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 36,
            borderRadius: radius.small,
            borderWidth: stroke.line,
            borderColor: C.lime,
            backgroundColor: C.card,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${chip.label}, change`}
            onPress={chip.onCycle}
            style={{ height: 36, justifyContent: 'center', paddingLeft: space.ms, paddingRight: space.xs }}
          >
            <Text variant="subhead" style={{ color: C.text }}>
              {chip.label}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${chip.label}`}
            onPress={chip.onClear}
            style={{ height: 36, justifyContent: 'center', paddingRight: space.ms, paddingLeft: space.xs }}
          >
            <Text variant="subhead" style={{ color: C.muted }}>
              ✕
            </Text>
          </Pressable>
        </View>
      ))}
      <Button
        variant="text"
        size="regular"
        title="Clear all"
        accessibilityLabel="Clear all"
        onPress={() => onChange({ level: null, place: null, minutes: null, goals: null })}
      />
    </ScrollView>
  );
}
