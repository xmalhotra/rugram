import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { coverageForTarget, exercisesForTarget, type BodyTarget, type CoverageSource } from '../../shared/body-flow-actions';
import { areaPicture, bodyRegions, mainAreasTrained, pictureHeadline, type AreaPicture } from '../../shared/body-flow';
import { exercise, station } from '../../shared/exercises';
import { catalogFlows } from '../../shared/flow-catalog';
import { localDate } from '../../shared/flow-habits';
import { addCalendarDays, calendarWeekday, formatSeriesDate, type SeriesItemKind } from '../../shared/flow-series';
import { gymFlowById } from '../../shared/gym-flows';
import type { Joint } from '../../shared/joint-map';
import type { HabitFlow } from '../../shared/mobile';
import type { MuscleArea } from '../../shared/muscle-map';
import { trainingCatalog } from '../../shared/training-seed';
import { bodyShadeFill, bodyShadeNames, BodyJointMap, BodyPicture, pictureFill } from './BodyMap';
import { useBodyFlow, type BodyFlowArea, type BodyFlowJoint, type BodyFlowRange } from './body-flow';
import { liveFlowId } from './catalog-live';
import { Button, Sheet } from './design/components';
import { DetailSurface } from './design/DetailSurface';
import { Glyph } from './design/Glyph';
import { SpanSwitch } from './design/SpanSwitch';
import { Text } from './design/Text';
import { layout, numeric, space, useTheme, radius, hit, opacity } from './design/theme';
import { ExercisePage } from './ExerciseCatalog';
import { exerciseIcons } from './exercise-icons';
import { ExerciseVisual } from './ExerciseVisual';
import { howToFrames } from './how-to-frames';
import { usePaneState } from './pane-state';
import { usePersonalMetrics } from './personal-metrics';
import { ListCard, ListHairline, SectionHeader } from './RoutineCalendar';
import { SeriesSheet } from './SeriesSheet';
import { BodyFlowStarter, useSuggestedFlow } from './ColdStart';
import { FocusReviewSheet } from './FocusReview';
import { peekFlowSeries } from './flow-series';
import { followedPlanAreas, useMapFlows } from './map-flows';
import { trainingSessions, type TrainingSessionSummary } from './training-api';
import { useTrainingSessionPane } from './training-route';

const ranges = [
  ['week', 'This week'],
  ['month', 'This month'],
  ['start', 'Since start'],
] as const;

const layers = [
  ['muscles', 'Muscles'],
  ['mobility', 'Mobility'],
] as const;

type BodyLayer = (typeof layers)[number][0];

const quietPicture: AreaPicture = { state: 'quiet', step: 0 };
const noPriorities: MuscleArea[] = [];

const emptyPlan: {
  key: string;
  seriesIds: string[];
  open: { kind: SeriesItemKind; id: string }[];
} = { key: '', seriesIds: [], open: [] };

/** Helper sets count a half, so a whole number would hide the difference. */
function formatSets(sets: number) {
  return Number.isInteger(sets) ? String(sets) : sets.toFixed(1);
}

function setWords(sets: number) {
  return `${formatSets(sets)} ${sets === 1 ? 'set' : 'sets'}`;
}

function spanWords(range: BodyFlowRange) {
  return range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'since you started';
}

function shadeWords(shade: number) {
  return (bodyShadeNames[shade] ?? bodyShadeNames[0] ?? 'Not yet').toLowerCase();
}

function dayWords(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Spoken name for a joint, on the map dots and in the list. */
function mobilityLabel(joint: { title: string; days: number; shade: number }) {
  return `${joint.title}, mobility on ${dayWords(joint.days)}, ${shadeWords(joint.shade)}`;
}

function attentionLine(joint: BodyFlowJoint, range: BodyFlowRange) {
  if (joint.shade > 1) return null;
  const work = joint.shade === 0 ? 'no mobility work' : 'little mobility work';
  return `${joint.title}: ${work} ${spanWords(range)}`;
}

function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86400000);
}

/** How much of a week the range covers, so the band can be read back as sets a week. */
function weeksCovered(from: string, to: string) {
  const days = daysBetween(from, to);
  return days == null || days < 0 ? 1 : (days + 1) / 7;
}

function lastTrainedWords(lastDate: string | null, today: string) {
  if (!lastDate) return 'Not trained yet';
  const days = daysBetween(lastDate, today);
  if (days == null) return formatSeriesDate(lastDate);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatSeriesDate(lastDate);
}

const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Shown eight at a time until the member asks for the rest. */
const exercisePreview = 8;

/**
 * The run and a training session are their own modals at the app root.
 * iOS will not present them while this page sheet is still dismissing, so they open once it has gone.
 */
const modalHandoffMs = 500;

const readyExerciseIds = new Set(
  Object.keys(howToFrames).filter(id => (howToFrames[id]?.length ?? 0) > 0 && Object.prototype.hasOwnProperty.call(exerciseIcons, id)),
);

function afterClose(onClose: () => void, next: () => void) {
  onClose();
  setTimeout(next, modalHandoffMs);
}

function rangeLine(range: BodyFlowRange, today: string, dayZero: string | null) {
  if (range === 'week') {
    const monday = addCalendarDays(today, 1 - calendarWeekday(today));
    const sunday = addCalendarDays(monday, 6);
    return `This week · ${formatSeriesDate(monday)} – ${formatSeriesDate(sunday)}`;
  }
  if (range === 'month') {
    const month = Number(today.slice(5, 7));
    const year = today.slice(0, 4);
    return `This month · ${fullMonths[month - 1] ?? ''} ${year}`;
  }
  if (!dayZero) return 'Since start';
  const short = formatSeriesDate(dayZero).replace(/^\S+\s/, '');
  return `Since start · ${short} – today`;
}

function equipmentLine(id: string) {
  const item = exercise(id);
  if (!item) return '';
  return station(item.station)?.title ?? item.station;
}

function workLine(hits: number, total: number, title: string) {
  const area = title.toLowerCase();
  const noun = total === 1 ? 'exercise' : 'exercises';
  const verb = hits === 1 ? 'works' : 'work';
  return `${hits} of ${total} ${noun} ${verb} ${area}`;
}

function exerciseIdsOfFlow(id: string, library: HabitFlow[]) {
  const gym = gymFlowById(id);
  if (gym?.items.length) return [...new Set(gym.items.map(item => item.exerciseId))];
  const blocks = library.find(flow => flow.id === id)?.workout?.blocks ?? [];
  return [...new Set(blocks.map(block => block.exerciseId))];
}

function exerciseIdsFor(kind: SeriesItemKind, id: string, library: HabitFlow[]) {
  if (kind === 'session') {
    const blocks = trainingCatalog().sessions.find(session => session.id === id)?.blocks ?? [];
    return [...new Set(blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : [])))];
  }
  return exerciseIdsOfFlow(id, library);
}

/** The member's series, without touching the calendar's cached window. Open rows are only a stand-in until the Map flow list arrives. */
function useRoutinePlan(from: string | null, to: string | null) {
  const [plan, setPlan] = useState(emptyPlan);
  useEffect(() => {
    if (!from || !to) return undefined;
    const key = `${from}|${to}`;
    let live = true;
    peekFlowSeries(from, to)
      .then(result => {
        if (!live) return;
        setPlan({
          key,
          seriesIds: result.series.map(item => item.itemId),
          // Missed means due and not done: only days before today count. Today and later are still ahead.
          open: result.occurrences
            .filter(item => item.status === 'open' && item.date < localDate(new Date()))
            .map(item => ({ kind: item.itemKind, id: item.itemId }))
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [from, to]);
  const key = from && to ? `${from}|${to}` : '';
  return plan.key === key ? plan : emptyPlan;
}

function liveFlowSources(library: HabitFlow[]): CoverageSource[] {
  const seen = new Set<string>();
  const rows: CoverageSource[] = [];
  for (const flow of catalogFlows) {
    const id = liveFlowId(flow);
    if (!id || seen.has(id)) continue;
    const exerciseIds = exerciseIdsOfFlow(id, library);
    if (!exerciseIds.length) continue;
    seen.add(id);
    const habit = library.find(item => item.id === id);
    rows.push({ kind: 'flow', id, title: habit?.title ?? gymFlowById(id)?.title ?? flow.title, exerciseIds });
  }
  return rows;
}

function sessionSources(sessions: TrainingSessionSummary[]): CoverageSource[] {
  const catalog = new Map(trainingCatalog().sessions.map(session => [session.id, session]));
  return sessions.flatMap(summary => {
    const blocks = catalog.get(summary.id)?.blocks ?? [];
    const exerciseIds = [...new Set(blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : [])))];
    if (!exerciseIds.length) return [];
    return [{ kind: 'session' as const, id: summary.id, title: summary.title, exerciseIds }];
  });
}

function useWorkSources(library: HabitFlow[]) {
  const [sessions, setSessions] = useState<TrainingSessionSummary[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    trainingSessions()
      .then(result => {
        if (live) setSessions(result.sessions);
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const sources = useMemo(() => [...liveFlowSources(library), ...sessionSources(sessions)], [library, sessions]);
  return { sources, ready };
}

function Swatch({ fill, fillOpacity = 1, size = 16 }: { fill: string; fillOpacity?: number; size?: number }) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        borderWidth: 1,
        borderColor: C.line,
        overflow: 'hidden'
      }}
    >
      {/* The fill carries the opacity on its own, so the outline stays crisp at every step. */}
      <View style={{ flex: 1, backgroundColor: fill, opacity: fillOpacity }} />
    </View>
  );
}

function PriorityTag() {
  const { colors: C } = useTheme();
  return <Text variant="caption" style={{ color: C.lime, fontWeight: '600'}}>Priority</Text>;
}

function AreaRow({ area, picture, priority, onPress }: { area: BodyFlowArea; picture: AreaPicture; priority: boolean; onPress: () => void }) {
  const { colors: C } = useTheme();
  const fill = pictureFill(picture.state, picture.step, C);
  const word = picture.state === 'quiet' ? 'not worked' : picture.state;
  const label = `${area.title}${priority ? ', priority' : ''}, ${word}, ${setWords(area.sets)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: hit,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.ms,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        backgroundColor: pressed ? C.bg : 'transparent'
      })}
    >
      <Swatch fill={fill.fill} fillOpacity={fill.fillOpacity} />
      <Text variant="callout" numberOfLines={1} style={{ flex: 1, color: C.text }}>
        {area.title}
      </Text>
      {priority ? <PriorityTag /> : null}
      <Text variant="subhead" style={{ color: C.muted, ...numeric }}>{formatSets(area.sets)}</Text>
    </Pressable>
  );
}

function CardioRow({ minutes, target, weeks, range }: { minutes: number; target: number; weeks: number; range: BodyFlowRange }) {
  const { colors: C } = useTheme();
  const done = Math.round(minutes);
  // The guideline is written per week, so the week view asks for the whole 150 rather than
  // the slice of it that has gone by. Longer ranges keep the target the map was shaded against.
  const full = range === 'week' && weeks > 0 ? target / weeks : target;
  const goal = Math.round(full);
  const share = full > 0 ? Math.max(0, Math.min(1, minutes / full)) : 0;
  const line = `Cardio ${done} of ${goal} min ${spanWords(range)}`;
  return (
    <View accessible accessibilityLabel={line} style={{ paddingHorizontal: space.md, paddingVertical: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
        <Glyph name="figure.run" fallback="↗" color={C.lime} size={18} />
        <Text variant="callout" style={{ flex: 1, color: C.text }}>{line}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
        <View style={{ width: `${share * 100}%`, height: 6, borderRadius: 3, backgroundColor: C.lime }} />
      </View>
    </View>
  );
}

/**
 * What to do about the area or joint: the exercises that work it, and the flows that contain them.
 * The how-to page is the exercise library's own page, presented above this sheet.
 */
function FocusSheet({
  title,
  fill,
  fillOpacity,
  planIds,
  target,
  summary,
  logged,
  today,
  sources,
  sessionsReady,
  library,
  onClose,
  onLeave,
  onStartFlow,
  onOpenFlow
}: {
  title: string;
  fill: string;
  fillOpacity: number;
  planIds: ReadonlySet<string>;
  target: BodyTarget;
  summary: ReactNode;
  logged: { exerciseId: string; name: string; sets: number }[];
  today: string;
  sources: CoverageSource[];
  sessionsReady: boolean;
  library: HabitFlow[];
  onClose: () => void;
  /** Closes Body flow itself, so a run or a flow page is not left behind the page sheet. */
  onLeave: () => void;
  onStartFlow: (id: string, title: string) => void;
  onOpenFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [, setSession] = useTrainingSessionPane();
  const [communityFlowId] = usePaneState<string | null>('communityFlow', null);
  const [showAll, setShowAll] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [routine, setRoutine] = useState<{ kind: 'flow' | 'session'; id: string; title: string } | null>(null);
  const communityOnOpen = useRef<string | null | undefined>(undefined);
  const moves = useMemo(() => exercisesForTarget(target, readyExerciseIds), [target]);
  const flows = useMemo(() => {
    const rows = coverageForTarget(target, sources);
    const plan = rows.filter(row => planIds.has(row.id));
    const catalogue = rows.filter(row => !planIds.has(row.id));
    return { plan, catalogue, rows: [...plan, ...catalogue] };
  }, [planIds, sources, target]);
  const shown = showAll ? moves : moves.slice(0, exercisePreview);
  const opened = exerciseId ? exercise(exerciseId) : undefined;
  useEffect(() => {
    if (!exerciseId) {
      communityOnOpen.current = undefined;
      return;
    }
    if (communityOnOpen.current === undefined) {
      communityOnOpen.current = communityFlowId;
      return;
    }
    // Found in can open a community flow, which sits outside this modal.
    if (communityFlowId && communityFlowId !== communityOnOpen.current) onLeave();
  }, [communityFlowId, exerciseId, onLeave]);
  const listOpen = !opened && !routine;
  return (
    <>
    {listOpen ? (
    <Sheet title={title} presentation="modal" scrollable={false} closeLabel="Close" onClose={onClose}>
      <View style={{ flex: 1, marginHorizontal: -layout.margin }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, paddingHorizontal: layout.margin, paddingBottom: space.ms }}>
          <Swatch fill={fill} fillOpacity={fillOpacity} size={space.lg} />
        </View>
        <ListHairline />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.md, gap: space.ms }}>
          <View style={{ paddingHorizontal: space.md, paddingTop: space.md, gap: space.sm }}>{summary}</View>
          {logged.length ? (
            <View style={{ marginHorizontal: space.md }}>
            <ListCard>
              <SectionHeader title="Top exercises" first />
              {logged.slice(0, 5).map((row, index) => (
                <View key={row.exerciseId}>
                  {index ? <ListHairline /> : null}
                  <View
                    accessible
                    accessibilityLabel={`${row.name}, ${setWords(row.sets)}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, minHeight: hit, paddingHorizontal: space.md, paddingVertical: space.sm }}
                  >
                    <Text variant="callout" numberOfLines={1} style={{ flex: 1, color: C.text }}>
                      {row.name}
                    </Text>
                    <Text variant="subhead" style={{ color: C.muted, ...numeric }}>{formatSets(row.sets)}</Text>
                  </View>
                </View>
              ))}
              <View style={{ height: 8 }} />
            </ListCard>
            </View>
          ) : null}
          <View style={{ marginHorizontal: space.md }}>
            <ListCard>
              <SectionHeader title={`Exercises for ${title}`} first />
              {shown.map((row, index) => {
                const gear = equipmentLine(row.id);
                return (
                  <View key={row.id}>
                    {index ? <ListHairline /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={gear ? `${row.name}, ${gear}` : row.name}
                      onPress={() => setExerciseId(row.id)}
                      style={({ pressed }) => ({
                        minHeight: hit,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.ms,
                        paddingHorizontal: space.md,
                        paddingVertical: space.sm,
                        backgroundColor: pressed ? C.bg : 'transparent'
                      })}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: radius.small, overflow: 'hidden', backgroundColor: C.bg }}>
                        <ExerciseVisual exerciseId={row.id} cover />
                      </View>
                      <View style={{ flex: 1, gap: space.xxs }}>
                        <Text variant="callout" numberOfLines={1} style={{ color: C.text, fontWeight: '600' }}>
                          {row.name}
                        </Text>
                        {gear ? (
                          <Text variant="footnote" numberOfLines={1} style={{ color: C.muted }}>
                            {gear}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
              {!moves.length ? (
                <View style={{ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.md, paddingBottom: space.ms }}>
                  <Text variant="subhead" style={{ color: C.muted }}>No exercises for this yet.</Text>
                </View>
              ) : null}
              {moves.length > exercisePreview && !showAll ? (
                <>
                  <ListHairline />
                  <Button
                    variant="text"
                    size="regular"
                    title={`Show all (${moves.length})`}
                    accessibilityLabel={`Show all ${moves.length} exercises for ${title}`}
                    onPress={() => setShowAll(true)}
                  />
                </>
              ) : (
                <View style={{ height: 8 }} />
              )}
            </ListCard>
          </View>
          <View style={{ marginHorizontal: space.md }}>
            <ListCard>
              <SectionHeader title={flows.plan.length ? 'Your plan' : `Flows that work ${title}`} first />
              {flows.rows.length ? (
                flows.rows.map((row, index) => {
                  const line = workLine(row.hits, row.total, title);
                  return (
                    <View key={`${row.kind}:${row.id}`}>
                      {flows.plan.length > 0 && index === flows.plan.length ? (
                        <SectionHeader title="Catalogue" />
                      ) : index ? (
                        <ListHairline />
                      ) : null}
                      <View style={{ paddingHorizontal: space.md, paddingTop: space.ms, paddingBottom: space.sm, gap: space.sm }}>
                        <View accessible accessibilityRole="text" accessibilityLabel={`${row.title}. ${line}`}>
                          <Text variant="headline" numberOfLines={2} style={{ color: C.text }}>
                            {row.title}
                          </Text>
                          <Text variant="footnote" style={{ color: C.muted, marginTop: space.xxs }}>{line}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: space.sm }}>
                          <View style={{ flex: 1 }}>
                            <Button
                              title="Start"
                              size="regular"
                              accessibilityLabel={`Start ${row.title}. ${line}`}
                              onPress={() => {
                                if (row.kind === 'session') afterClose(onLeave, () => setSession({ id: row.id, date: today }));
                                else afterClose(onLeave, () => onStartFlow(row.id, row.title));
                              }}
                            />
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${row.title} to Daily flow`}
                            onPress={() => setRoutine({ kind: row.kind, id: row.id, title: row.title })}
                            style={({ pressed }) => ({
                              flex: 1,
                              minHeight: hit,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: radius.small,
                              borderWidth: 1,
                              borderColor: C.line,
                              backgroundColor: pressed ? C.bg : C.card
                            })}
                          >
                            <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Add to Daily flow</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : sessionsReady ? (
                <View style={{ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.md, paddingBottom: space.md }}>
                  <Text variant="subhead" style={{ color: C.muted }}>No flow covers this yet. Try the exercises above.</Text>
                </View>
              ) : (
                <View style={{ minHeight: hit, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator accessibilityLabel="Loading flows" color={C.lime} />
                </View>
              )}
              {flows.rows.length ? <View style={{ height: 8 }} /> : null}
            </ListCard>
          </View>
        </ScrollView>
      </View>
    </Sheet>
    ) : null}
      {opened ? (
        <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={() => setExerciseId(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
              <ExercisePage
                item={opened}
                library={library}
                topInset={0}
                onBack={() => setExerciseId(null)}
                onView={flow => {
                  onLeave();
                  onOpenFlow(flow);
                }}
              />
          </SafeAreaView>
        </DetailSurface>
      ) : null}
      {routine ? (
        <SeriesSheet
          mode="create"
          title={routine.title}
          itemKind={routine.kind}
          itemId={routine.id}
          start={today}
          onClose={() => setRoutine(null)}
        />
      ) : null}
    </>
  );
}

/** The area a member tapped: its sets, its band for the range, when it was last worked and by what. */
function AreaSheet({
  area,
  picture,
  priority,
  planIds,
  range,
  weeks,
  today,
  sources,
  sessionsReady,
  library,
  onClose,
  onLeave,
  onStartFlow,
  onOpenFlow
}: {
  area: BodyFlowArea;
  picture: AreaPicture;
  priority: boolean;
  planIds: ReadonlySet<string>;
  range: BodyFlowRange;
  /** Weeks the range covers; the band the server sends is scaled by it. */
  weeks: number;
  today: string;
  sources: CoverageSource[];
  sessionsReady: boolean;
  library: HabitFlow[];
  onClose: () => void;
  onLeave: () => void;
  onStartFlow: (id: string, title: string) => void;
  onOpenFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const mark = pictureFill(picture.state, picture.step, C);
  const weekly = weeks > 0 ? { low: Math.round(area.band.low / weeks), high: Math.round(area.band.high / weeks) } : null;
  return (
    <FocusSheet
      title={area.title}
      fill={mark.fill}
      fillOpacity={mark.fillOpacity}
      planIds={planIds}
      target={{ kind: 'area', id: area.area }}
      logged={area.exercises}
      today={today}
      sources={sources}
      sessionsReady={sessionsReady}
      library={library}
      onClose={onClose}
      onLeave={onLeave}
      onStartFlow={onStartFlow}
      onOpenFlow={onOpenFlow}
      summary={
        <>
          {priority ? <PriorityTag /> : null}
          <Text variant="headline" style={{ color: C.text }}>
            {setWords(area.sets)} {spanWords(range)}
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>
            {formatSets(area.mainSets)} main · {formatSets(area.helperSets)} helper
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>
            {weekly ? `Target ${weekly.low}–${weekly.high} a week` : ''}
            {/* Below a week and a half the two bands round to the same pair, so the span only repeats itself. */}
            {weekly && weeks >= 1.5 ? `, so ${Math.round(area.band.low)}–${Math.round(area.band.high)} ${spanWords(range)}` : ''}
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>Last trained: {lastTrainedWords(area.lastDate, today)}</Text>
        </>
      }
    />
  );
}

function JointRow({ joint, onPress }: { joint: BodyFlowJoint; onPress: () => void }) {
  const { colors: C } = useTheme();
  const mark = bodyShadeFill(joint.shade, C);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mobilityLabel(joint)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: hit,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.ms,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        backgroundColor: pressed ? C.bg : 'transparent'
      })}
    >
      <Swatch fill={mark.fill} fillOpacity={mark.fillOpacity} />
      <Text variant="callout" numberOfLines={1} style={{ flex: 1, color: C.text }}>
        {joint.title}
      </Text>
      <Text variant="subhead" style={{ color: C.muted, ...numeric }}>{dayWords(joint.days)}</Text>
    </Pressable>
  );
}

/** The joint a member tapped: days moved, the weekly target, when it was last done and by what. */
function JointSheet({
  joint,
  planIds,
  range,
  today,
  sources,
  sessionsReady,
  library,
  onClose,
  onLeave,
  onStartFlow,
  onOpenFlow
}: {
  joint: BodyFlowJoint;
  planIds: ReadonlySet<string>;
  range: BodyFlowRange;
  today: string;
  sources: CoverageSource[];
  sessionsReady: boolean;
  library: HabitFlow[];
  onClose: () => void;
  onLeave: () => void;
  onStartFlow: (id: string, title: string) => void;
  onOpenFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const mark = bodyShadeFill(joint.shade, C);
  const last = joint.lastDate ? lastTrainedWords(joint.lastDate, today) : 'Not done yet';
  return (
    <FocusSheet
      title={joint.title}
      fill={mark.fill}
      fillOpacity={mark.fillOpacity}
      planIds={planIds}
      target={{ kind: 'joint', id: joint.joint }}
      logged={joint.exercises}
      today={today}
      sources={sources}
      sessionsReady={sessionsReady}
      library={library}
      onClose={onClose}
      onLeave={onLeave}
      onStartFlow={onStartFlow}
      onOpenFlow={onOpenFlow}
      summary={
        <>
          <Text variant="headline" style={{ color: C.text }}>
            Mobility on {dayWords(joint.days)} {spanWords(range)}
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>Target {joint.band.low}–{joint.band.high} days a week</Text>
          <Text variant="subhead" style={{ color: C.muted }}>Last done: {last}</Text>
        </>
      }
    />
  );
}

/**
 * Body flow opens on the figure. Worked and missed are two colours. Counts sit in Details.
 * Mobility stays on its own figure inside that panel.
 */
export function BodyFlowSheet({
  library,
  focusId,
  onClose,
  onStartFlow,
  onOpenFlow
}: {
  library: HabitFlow[];
  focusId?: string;
  onClose: () => void;
  onStartFlow: (id: string, title: string) => void;
  onOpenFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const window = useWindowDimensions();
  const [range, setRange] = useState<BodyFlowRange>('week');
  const [details, setDetails] = useState(false);
  const [layer, setLayer] = useState<BodyLayer>('muscles');
  const [opened, setOpened] = useState<MuscleArea | null>(null);
  const [planning, setPlanning] = useState(false);
  const [openedJoint, setOpenedJoint] = useState<Joint | null>(null);
  const { data, loading, error, reload } = useBodyFlow(range);
  const priorityOrder = usePersonalMetrics()['gym.priorities']?.areas ?? noPriorities;
  const priorityAreas = new Set(priorityOrder);
  const { sources, ready: sessionsReady } = useWorkSources(library);
  const today = localDate(new Date());
  const mapFlows = useMapFlows(today);
  const plan = useRoutinePlan(data?.from ?? null, data?.to ?? null);
  const planIds = useMemo(() => new Set(plan.seriesIds), [plan.seriesIds]);
  const plannedAreas = useMemo(() => {
    if (mapFlows.list && data) return new Set(followedPlanAreas(mapFlows.list, today, { from: data.from, to: data.to }, library));
    const areas = new Set<MuscleArea>();
    for (const item of plan.open) {
      for (const area of mainAreasTrained(exerciseIdsFor(item.kind, item.id, library))) areas.add(area);
    }
    return areas;
  }, [data, library, mapFlows.list, plan.open, today]);
  const suggestion = useSuggestedFlow(focusId);
  const [, setSession] = useTrainingSessionPane();
  const started = Boolean(data?.dayZero);
  const rangeLabel = rangeLine(range, today, data?.dayZero ?? null);
  const pictures = useMemo(() => {
    const map = new Map<MuscleArea, AreaPicture>();
    if (!data) return map;
    for (const area of data.areas) {
      map.set(
        area.area,
        areaPicture({
          // The payload band is already scaled to this range.
          sets: area.sets,
          band: area.band,
          weeks: 1,
          priority: started && priorityOrder.includes(area.area),
          planned: started && plannedAreas.has(area.area)
        }),
      );
    }
    return map;
  }, [data, plannedAreas, priorityOrder, started]);
  const headline = !data
    ? null
    : !started
      ? { text: 'Finish a flow and your Body flow starts today.', area: null as MuscleArea | null }
      : pictureHeadline(
          data.areas.map(area => ({ area: area.area, state: pictures.get(area.area)?.state ?? 'quiet' })),
          priorityOrder,
          spanWords(range),
        );
  const covering = headline?.area ? coverageForTarget({ kind: 'area', id: headline.area }, sources) : [];
  const chosen = covering.find(row => planIds.has(row.id)) ?? covering[0] ?? null;
  const start = !started
    ? suggestion
      ? { title: suggestion.title, run: () => afterClose(onClose, () => onStartFlow(suggestion.id, suggestion.title)) }
      : null
    : chosen
      ? {
          title: chosen.title,
          run: () => {
            if (chosen.kind === 'session') afterClose(onClose, () => setSession({ id: chosen.id, date: today }));
            else afterClose(onClose, () => onStartFlow(chosen.id, chosen.title));
          }
        }
      : null;
  const openedArea = data?.areas.find(area => area.area === opened) ?? null;
  const openedJointRow = data?.joints.find(joint => joint.joint === openedJoint) ?? null;
  const byArea = new Map((data?.areas ?? []).map(area => [area.area, area]));
  const jointShades: Partial<Record<Joint, number>> = {};
  for (const joint of data?.joints ?? []) jointShades[joint.joint] = joint.shade;
  const attention = (data?.joints ?? []).map(joint => attentionLine(joint, range)).filter((line): line is string => line != null);
  const priorityFirst = data
    ? priorityOrder.flatMap(id => {
        const area = data.areas.find(row => row.area === id);
        if (!area || area.sets >= area.band.high) return [];
        return [`${area.title}: a priority`];
      })
    : [];
  const priorityTitles = new Set(priorityFirst.map(line => line.split(':')[0]));
  const muscleAttention = [...priorityFirst, ...(data?.gaps ?? []).filter(line => !priorityTitles.has(line.split(':')[0] ?? ''))].slice(0, 3);
  const figureWidth = Math.min(320, Math.max(220, window.width - 48));
  return (
    <Sheet title="Body flow" presentation="modal" onClose={onClose}>
      <View style={{ width: '100%', gap: space.lg, alignItems: 'center' }}>
        {loading && !data ? (
          <View style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator accessibilityLabel="Loading your Body flow" color={C.lime} />
          </View>
        ) : null}
        {error ? (
          <View style={{ alignSelf: 'stretch', gap: space.sm, paddingVertical: space.ms }}>
            <Text variant="subhead" accessibilityRole="alert" style={{ color: C.danger }}>
              {error}
            </Text>
            <Button
              variant="text"
              size="regular"
              title="Try again"
              accessibilityLabel="Try loading your Body flow again"
              onPress={() => void reload()}
            />
          </View>
        ) : null}
        {data && headline ? (
          <>
            <BodyPicture
              areas={data.areas.map(area => {
                const picture = pictures.get(area.area) ?? quietPicture;
                return { area: area.area, state: picture.state, step: picture.step };
              })}
              width={figureWidth}
              showLegend
              selected={opened}
              onPressArea={setOpened}
            />
            <View style={{ alignSelf: 'stretch' }}>
              <SpanSwitch options={ranges} value={range} onChange={setRange} width="100%" noun="range" />
            </View>
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
              <Text variant="headline" style={{ flex: 1, color: C.text }}>{headline.text}</Text>
              {start ? (
                <Button
                  title="Start"
                  fit
                  size="regular"
                  accessibilityLabel={`Start ${start.title}. ${headline.text}`}
                  onPress={start.run}
                />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Details"
              onPress={() => setDetails(true)}
              style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: hit, alignItems: 'center', justifyContent: 'center', gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
            >
              <View importantForAccessibility="no-hide-descendants" style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }} />
              <Text variant="callout" style={{ color: C.lime, fontWeight: '600' }}>Details</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      {details && data ? (
        <Sheet title="Details" presentation="modal" onClose={() => setDetails(false)}>
          <View style={{ gap: space.md }}>
            <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{rangeLabel}</Text>
            <SpanSwitch
              options={layers}
              value={layer}
              onChange={next => {
                setLayer(next);
                setOpened(null);
                setOpenedJoint(null);
              }}
              width="100%"
              noun="view"
            />
            {layer === 'mobility' ? (
              <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
                <BodyJointMap
                  shades={started ? jointShades : {}}
                  width={Math.min(280, figureWidth)}
                  selected={openedJoint}
                  onPressJoint={setOpenedJoint}
                  labelFor={jointId => {
                    const joint = data.joints.find(row => row.joint === jointId);
                    return joint ? mobilityLabel(joint) : jointId;
                  }}
                />
              </View>
            ) : null}
            {!started && layer === 'muscles' ? (
              <ListCard>
                <BodyFlowStarter focusId={focusId} onStart={onStartFlow} />
              </ListCard>
            ) : null}
            {!started && layer !== 'muscles' ? (
              <ListCard>
                <View style={{ paddingHorizontal: space.md, paddingVertical: space.md }}>
                  <Text variant="subhead" style={{ color: C.muted }}>Finish any flow and your Body flow starts today.</Text>
                </View>
              </ListCard>
            ) : null}
            {layer === 'muscles' && started ? (
              <ListCard>
                <Button variant="text" size="regular" title="Plan next week" onPress={() => setPlanning(true)} />
              </ListCard>
            ) : null}
            {layer === 'mobility' && started ? (
              <>
                <ListCard>
                  {data.joints.map((joint, index) => (
                    <View key={joint.joint}>
                      {index ? <ListHairline /> : null}
                      <JointRow joint={joint} onPress={() => setOpenedJoint(joint.joint)} />
                    </View>
                  ))}
                </ListCard>
                {attention.length ? (
                  <ListCard>
                    <SectionHeader title="Needs attention" first />
                    {attention.map((line, index) => (
                      <View key={line}>
                        {index ? <ListHairline /> : null}
                        <View
                          accessible
                          accessibilityLabel={line}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, minHeight: hit, paddingHorizontal: space.md, paddingVertical: space.sm }}
                        >
                          <Glyph name="exclamationmark.triangle" fallback="!" color={C.muted} size={18} />
                          <Text variant="subhead" style={{ flex: 1, color: C.text }}>{line}</Text>
                        </View>
                      </View>
                    ))}
                  </ListCard>
                ) : null}
              </>
            ) : null}
            {/* Before day zero every area is equally untouched, so a gap list would only state the obvious. */}
            {layer === 'muscles' && started && muscleAttention.length ? (
              <ListCard>
                <SectionHeader title="Needs attention" first />
                {muscleAttention.map((gap, index) => (
                  <View key={gap}>
                    {index ? <ListHairline /> : null}
                    <View
                      accessible
                      accessibilityLabel={gap}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, minHeight: hit, paddingHorizontal: space.md, paddingVertical: space.sm }}
                    >
                      <Glyph name="exclamationmark.triangle" fallback="!" color={C.muted} size={18} />
                      <Text variant="subhead" style={{ flex: 1, color: C.text }}>{gap}</Text>
                    </View>
                  </View>
                ))}
              </ListCard>
            ) : null}
            {layer === 'muscles' && (started || data.cardio.minutes > 0) ? (
              <ListCard>
                <CardioRow
                  minutes={data.cardio.minutes}
                  target={data.cardio.target}
                  weeks={weeksCovered(data.from, data.to)}
                  range={range}
                />
              </ListCard>
            ) : null}
            {layer === 'muscles' && started ? (
              <ListCard>
                {bodyRegions.map((group, index) => (
                  <View key={group.name}>
                    <SectionHeader title={group.name} first={index === 0} />
                    {group.areas.map((id, row) => {
                      const area = byArea.get(id);
                      if (!area) return null;
                      return (
                        <View key={id}>
                          {row ? <ListHairline /> : null}
                          <AreaRow area={area} picture={pictures.get(id) ?? quietPicture} priority={priorityAreas.has(id)} onPress={() => setOpened(id)} />
                        </View>
                      );
                    })}
                  </View>
                ))}
                <View style={{ height: 10 }} />
              </ListCard>
            ) : null}
          </View>
        </Sheet>
      ) : null}
      {openedArea && data ? (
        <AreaSheet
          area={openedArea}
          picture={pictures.get(openedArea.area) ?? quietPicture}
          priority={priorityAreas.has(openedArea.area)}
          planIds={planIds}
          range={range}
          weeks={weeksCovered(data.from, data.to)}
          today={today}
          sources={sources}
          sessionsReady={sessionsReady}
          library={library}
          onClose={() => setOpened(null)}
          onLeave={onClose}
          onStartFlow={onStartFlow}
          onOpenFlow={onOpenFlow}
        />
      ) : null}
      {openedJointRow && data && layer === 'mobility' ? (
        <JointSheet
          joint={openedJointRow}
          planIds={planIds}
          range={range}
          today={today}
          sources={sources}
          sessionsReady={sessionsReady}
          library={library}
          onClose={() => setOpenedJoint(null)}
          onLeave={onClose}
          onStartFlow={onStartFlow}
          onOpenFlow={onOpenFlow}
        />
      ) : null}
      {planning ? <FocusReviewSheet onClose={() => setPlanning(false)} /> : null}
    </Sheet>
  );
}

/** Body flow's own spot in the app header, beside the notification bell: always one tap away. */
export function BodyFlowHeaderButton({
  library,
  focusId,
  onStartFlow,
  onOpenFlow
}: {
  library: HabitFlow[];
  focusId?: string;
  onStartFlow: (id: string, title: string) => void;
  onOpenFlow: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Body flow"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ width: hit, height: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
      >
        <Glyph name="figure.stand" fallback="◎" size={24} color={C.lime} />
      </Pressable>
      {open ? (
        <BodyFlowSheet library={library} focusId={focusId} onClose={() => setOpen(false)} onStartFlow={onStartFlow} onOpenFlow={onOpenFlow} />
      ) : null}
    </>
  );
}

/** The Body flow pill in the Yours calendar header, beside the Day / Week / Month switch. */
export function BodyFlowButton({ onPress }: { onPress: () => void }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Body flow"
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: hit,
        minHeight: hit,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? opacity.pressed : 1
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.small,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.bg,
          borderWidth: 1,
          borderColor: C.line
        }}
      >
        <Glyph name="figure.stand" fallback="▮" color={C.lime} size={18} />
      </View>
    </Pressable>
  );
}

/** The Body flow row in the profile, in the same style as Personalise. */
export function BodyFlowRow({ onOpen }: { onOpen: () => void }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Body flow. Every flow you finish, added up into your own body."
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.ms,
        padding: space.md,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.card,
        opacity: pressed ? opacity.pressed : 1
      })}
    >
      <Glyph name="figure.stand" fallback="▮" color={C.lime} size={22} />
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <Text variant="callout" style={{ color: C.text, fontWeight: '600'}}>Body flow</Text>
        <Text variant="subhead" style={{ color: C.muted }}>Every flow you finish, added up into your own body.</Text>
      </View>
      <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={22} />
    </Pressable>
  );
}
