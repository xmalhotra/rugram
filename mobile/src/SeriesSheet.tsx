import { DetailSurface } from './design/DetailSurface';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
  type ViewStyle
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { type SymbolViewProps } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { routineCheckpoints, type RoutineCheckpoint } from '../../shared/routines';
import {
  addCalendarDays,
  calendarWeekday,
  describeRecurrence,
  formatSeriesClock,
  formatSeriesDate,
  type FlowSeries,
  type Recurrence,
  type SeriesEnd,
  type SeriesTime
} from '../../shared/flow-series';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { numeric, useTheme, space, radius, hit, opacity, size } from './design/theme';
import { createSeries, deleteSeries, moveOccurrence, peekFlowSeries, updateSeries } from './flow-series';
import { gymFlowById } from '../../shared/gym-flows';
import { mainSetsFor, seriesImpactLines, setsFromCards, type AreaSets } from '../../shared/series-impact';
import { SeriesPlanChange } from './PredictedBodyFlow';
import { api } from './api';
import { useBodyFlow } from './body-flow';

type Repeat = Recurrence['kind'];
type EndKind = SeriesEnd['kind'];
type Page = 'form' | 'time' | 'repeat' | 'custom' | 'ends';
type Unit = 'day' | 'week' | 'month';
type SymbolName =
  | 'figure.strengthtraining.traditional'
  | 'clock'
  | 'sun.horizon'
  | 'arrow.triangle.2.circlepath'
  | 'calendar.badge.clock'
  | 'chevron.right'
  | 'chevron.left'
  | 'checkmark';

const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekdayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The icon column, so labels and hairlines line up as they do in an iOS settings list. */
const labelInset = 56;
const rowHeight = 58;
/** Deepest navigation inside the sheet: form, Repeat, Custom. */
const maxDepth = 4;

const symbolFallback: Record<SymbolName, string> = {
  'figure.strengthtraining.traditional': '●',
  clock: '◷',
  'sun.horizon': '☀',
  'arrow.triangle.2.circlepath': '↻',
  'calendar.badge.clock': '▦',
  'chevron.right': '›',
  'chevron.left': '‹',
  checkmark: '✓'
};

export type SeriesSheetRequest =
  | {
      mode: 'create';
      title: string;
      itemKind: 'flow' | 'session' | 'community';
      itemId: string;
      /** The published version, when this is a community flow. */
      version?: number;
      /** Exercises already worked out, for a community flow. A Qram flow is read from the catalogue. */
      exercises?: { exerciseId: string; sets: number }[];
      start: string;
      onClose: () => void;
    }
  | { mode: 'edit'; title: string; series: FlowSeries; exercises?: { exerciseId: string; sets: number }[]; onClose: () => void }
  | { mode: 'move'; title: string; series: FlowSeries; exercises?: { exerciseId: string; sets: number }[]; original: string; date: string; time: SeriesTime; onClose: () => void };

function exerciseRows(items: { exerciseId: string; sets: number }[] | undefined) {
  return items ?? [];
}

async function plannedSets(item: { itemKind: string; itemId: string; version?: number }) {
  if (item.itemKind === 'flow')
    return gymFlowById(item.itemId)?.items.map(row => ({ exerciseId: row.exerciseId, sets: row.sets })) ?? [];
  if (item.itemKind !== 'community') return [];
  try {
    const result = await api<{ flow: { cards: { cardId: string }[]; version: number }; versions: { version: number; cards: { cardId: string }[] }[] }>(
      `/api/mobile/community?id=${encodeURIComponent(item.itemId)}`,
    );
    const pinned = item.version != null ? result.versions.find(row => row.version === item.version) : undefined;
    return setsFromCards(pinned?.cards ?? result.flow.cards);
  } catch {
    return [];
  }
}

/** The muted Body flow line. It never blocks saving. */
function SeriesNote({
  kind,
  id,
  version,
  exercises,
  start
}: {
  kind: 'flow' | 'session' | 'community';
  id: string;
  version?: number;
  exercises?: { exerciseId: string; sets: number }[];
  start: string;
}) {
  const { colors: C } = useTheme();
  const week = useBodyFlow('week');
  const [own, setOwn] = useState<{ exerciseId: string; sets: number }[]>(() =>
    exerciseRows(
      exercises?.length
        ? exercises
        : kind === 'flow'
          ? gymFlowById(id)?.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets }))
          : [],
    ),
  );
  const [nearby, setNearby] = useState<{ side: 'before' | 'after'; areas: AreaSets[] }[]>([]);
  useEffect(() => {
    if (exercises?.length || kind !== 'community') return;
    let live = true;
    plannedSets({ itemKind: 'community', itemId: id, version })
      .then(rows => {
        if (live) setOwn(rows);
      })
      .catch(() => {
        if (live) setOwn([]);
      });
    return () => {
      live = false;
    };
  }, [exercises, id, kind, version]);
  useEffect(() => {
    let live = true;
    const before = addCalendarDays(start, -1);
    const after = addCalendarDays(start, 1);
    peekFlowSeries(before, after)
      .then(async bundle => {
        const rows = bundle.occurrences.filter(item => item.date === before || item.date === after);
        const next = await Promise.all(
          rows.map(async item => ({
            side: (item.date === before ? 'before' : 'after') as 'before' | 'after',
            areas: mainSetsFor(await plannedSets(item))
          })),
        );
        if (live) setNearby(next);
      })
      .catch(() => {
        if (live) setNearby([]);
      });
    return () => {
      live = false;
    };
  }, [start]);
  const lines = seriesImpactLines({
    adds: mainSetsFor(own),
    week: (week.data?.areas ?? []).map(area => ({
      area: area.area,
      sets: area.sets,
      low: area.band.low,
      high: area.band.high
    })),
    level: week.data?.level,
    nearby
  });
  if (!lines.length) return null;
  return (
    <View accessible accessibilityLabel={lines.join('. ')} style={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.xs }}>
      {lines.map(line => (
        <Text variant="footnote" key={line} style={{ color: C.muted }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** A checkpoint named in the flow title, such as "Pre-workout". Otherwise Morning. */
function naturalCheckpoint(title: string): RoutineCheckpoint {
  const haystack = ` ${title.toLowerCase()} `;
  const names = [...routineCheckpoints].sort((a, b) => b.length - a.length);
  return names.find(name => haystack.includes(` ${name.toLowerCase()} `)) ?? 'Morning';
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function clockFrom(at?: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(at ?? '');
  let hour = match ? Number(match[1]) : 7;
  let minute = match ? Number(match[2]) : 0;
  minute = Math.round(minute / 5) * 5;
  if (minute >= 60) {
    minute = 0;
    hour = (hour + 1) % 24;
  }
  return { hour, minute };
}

function formatClock(hour: number, minute: number) {
  return formatSeriesClock(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
}

function dateFromParts(iso: string, hour: number, minute: number) {
  return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), hour, minute, 0, 0);
}

function isoFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortDate(iso: string) {
  return `${Number(iso.slice(8, 10))} ${shortMonths[Number(iso.slice(5, 7)) - 1] ?? ''}`;
}

function everyOf(series: FlowSeries) {
  const recurrence = series.recurrence;
  if (recurrence.kind === 'daily' || recurrence.kind === 'weekly' || recurrence.kind === 'monthly') return recurrence.every;
  return 1;
}

/** The three fields the sheet edits, built from the controls. One place, so the dirty check matches what saves. */
function composeTime(checkpoint: RoutineCheckpoint, exact: boolean, hour: number, minute: number): SeriesTime {
  return exact ? { checkpoint, at: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` } : { checkpoint };
}

function composeRecurrence(repeat: Repeat, every: number, days: number[]): Recurrence {
  if (repeat === 'daily') return { kind: 'daily', every: clamp(every, 1, 30) };
  if (repeat === 'weekdays') return { kind: 'weekdays' };
  if (repeat === 'weekly') return { kind: 'weekly', every: clamp(every, 1, 12), days: [...days].sort((a, b) => a - b) };
  if (repeat === 'monthly') return { kind: 'monthly', every: clamp(every, 1, 12), by: 'date' };
  return { kind: 'once' };
}

function composeEnd(repeat: Repeat, kind: EndKind, date: string, count: number): SeriesEnd {
  if (repeat === 'once' || kind === 'never') return { kind: 'never' };
  if (kind === 'on') return { kind: 'on', date };
  return { kind: 'after', count: clamp(count, 1, 365) };
}

function draftKey(start: string, time: SeriesTime, recurrence: Recurrence, end: SeriesEnd) {
  return JSON.stringify([start, time.checkpoint, time.at ?? '', recurrence, end]);
}

function repeatLabel(recurrence: Recurrence) {
  if (recurrence.kind === 'once') return 'Never';
  if (recurrence.kind === 'daily') return recurrence.every === 1 ? 'Every day' : `Every ${recurrence.every} days`;
  if (recurrence.kind === 'weekdays') return 'Every weekday';
  if (recurrence.kind === 'monthly') return recurrence.every === 1 ? 'Every month' : `Every ${recurrence.every} months`;
  const names = [...recurrence.days]
    .sort((a, b) => a - b)
    .map(day => weekdayShort[day - 1] ?? '')
    .filter(Boolean)
    .join(', ');
  return recurrence.every === 1 ? `Every week on ${names}` : `Every ${recurrence.every} weeks on ${names}`;
}

function endLabel(end: SeriesEnd) {
  if (end.kind === 'never') return 'Never';
  if (end.kind === 'after') {
    const word = end.count === 1 ? 'time' : 'times';
    return `After ${end.count} ${word}`;
  }
  return `On ${shortDate(end.date)}`;
}

/** Which plain Repeat row matches, or Custom when the rule is more specific. */
function plainKind(recurrence: Recurrence, start: string): Repeat | 'custom' {
  if (recurrence.kind === 'once' || recurrence.kind === 'weekdays') return recurrence.kind;
  if (recurrence.kind === 'daily') return recurrence.every === 1 ? 'daily' : 'custom';
  if (recurrence.kind === 'monthly') return recurrence.every === 1 ? 'monthly' : 'custom';
  const days = [...recurrence.days].sort((a, b) => a - b);
  if (recurrence.every === 1 && days.length === 1 && days[0] === calendarWeekday(start)) return 'weekly';
  return 'custom';
}

function routineLine(series: FlowSeries) {
  const clock = series.time.at ? formatClock(Number(series.time.at.slice(0, 2)), Number(series.time.at.slice(3, 5))) : '';
  const base = describeRecurrence(series);
  return clock ? `${base} at ${series.time.checkpoint}, ${clock}` : `${base} at ${series.time.checkpoint}`;
}

function SymbolIcon({ name, color, size = 24 }: { name: SymbolName; color: string; size?: number }) {
  return <Glyph name={name as SymbolViewProps['name']} fallback={symbolFallback[name]} color={color} size={size} />;
}

function Hairline({ inset = labelInset }: { inset?: number }) {
  const { colors: C } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: inset }} />;
}

function SheetBar({ title, left, right }: { title: string; left: ReactNode; right?: ReactNode }) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        height: 56,
        justifyContent: 'center',
        backgroundColor: C.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: C.line
      }}
    >
      <Text variant="headline"
        accessibilityRole="header"
        numberOfLines={1}
        style={{ textAlign: 'center', color: C.text, marginHorizontal: 92 }}
      >
        {title}
      </Text>
      <View style={{ position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{left}</View>
      <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{right}</View>
    </View>
  );
}

function FormRow({
  icon,
  label,
  value,
  /** The flow title, which reads as the subject of the form rather than a setting. */
  strong,
  lines = 1,
  chevron,
  onPress,
  disabled,
  trailing,
  /** False when the row holds its own control, so that control keeps the accessible name. */
  grouped = true,
  accessibilityLabel
}: {
  icon?: SymbolName;
  label: string;
  value?: string;
  strong?: boolean;
  lines?: number;
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
  grouped?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors: C } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={{ width: 28, marginRight: space.ms, alignItems: 'center' }}>
          <SymbolIcon name={icon} color={C.text} />
        </View>
      ) : null}
      <Text variant="body" numberOfLines={1} style={{ flexShrink: 1, color: C.text }}>
        {label}
      </Text>
      {value ? (
        <Text variant="body"
          numberOfLines={lines}
          style={{
            flex: 1,
            marginLeft: space.ms,
            textAlign: 'right',
            color: strong ? C.text : C.muted,
            fontWeight: strong ? '600' : '400'
          }}
        >
          {value}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {trailing}
      {chevron ? (
        <View style={{ marginLeft: space.sm, marginRight: -space.xxs }}>
          <SymbolIcon name="chevron.right" color={C.muted} size={14} />
        </View>
      ) : null}
    </>
  );
  const frame: ViewStyle = {
    minHeight: rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space.md,
    paddingLeft: icon ? space.md : labelInset
  };
  if (!onPress) {
    if (!grouped) return <View style={frame}>{content}</View>;
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? `${label}${value ? `, ${value}` : ''}`} style={frame}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}${value ? `, ${value}` : ''}`}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [frame, { backgroundColor: pressed ? C.card : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
}

function ChoiceRow({
  label,
  selected,
  chevron,
  onPress
}: {
  label: string;
  selected: boolean;
  chevron?: boolean;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.button,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space.md,
        backgroundColor: pressed ? C.card : 'transparent'
      })}
    >
      <Text variant="body" style={{ flex: 1, color: C.text }}>{label}</Text>
      <View style={{ width: 22, alignItems: 'flex-end' }}>
        {selected ? <SymbolIcon name="checkmark" color={C.lime} size={17} /> : null}
      </View>
      {chevron ? (
        <View style={{ marginLeft: space.sm, marginRight: -space.xxs }}>
          <SymbolIcon name="chevron.right" color={C.muted} size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

function Stepper({
  value,
  minimum,
  maximum,
  lessLabel,
  moreLabel,
  suffix,
  onChange
}: {
  value: number;
  minimum: number;
  maximum: number;
  lessLabel: string;
  moreLabel: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const { colors: C } = useTheme();
  const button = (label: string, glyph: string, next: number, enabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => onChange(clamp(next, minimum, maximum))}
      style={({ pressed }) => ({
        width: hit,
        height: hit,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? (pressed ? opacity.pressed : 1) : 0.35
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: C.line
        }}
      >
        <Text variant="section" style={{ color: C.text }}>{glyph}</Text>
      </View>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {button(lessLabel, '−', value - 1, value > minimum)}
      <Text variant="headline" style={{ minWidth: 32, textAlign: 'center', color: C.text, ...numeric }}>{value}</Text>
      {button(moreLabel, '+', value + 1, value < maximum)}
      {suffix ? <Text variant="body" style={{ color: C.muted, marginLeft: space.xs }}>{suffix}</Text> : null}
    </View>
  );
}

/** The native iOS wheel, shown inline under the row it belongs to. */
function Wheel({
  value,
  mode,
  minimumDate,
  label,
  onChange
}: {
  value: Date;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  label: string;
  onChange: (date: Date) => void;
}) {
  const { colors: C, scheme } = useTheme();
  const take = (event: { type?: string }, date?: Date) => {
    if (!date || event.type === 'dismissed') return;
    onChange(date);
  };
  if (Platform.OS === 'ios') {
    return (
      <View style={{ paddingHorizontal: space.sm, paddingBottom: space.xs }}>
        <DateTimePicker
          accessibilityLabel={label}
          value={value}
          mode={mode}
          display="spinner"
          themeVariant={scheme}
          minuteInterval={mode === 'datetime' ? 5 : undefined}
          minimumDate={minimumDate}
          textColor={C.text}
          onChange={take}
        />
      </View>
    );
  }
  return (
    <View style={{ paddingBottom: space.sm }}>
      <DateTimePicker
        accessibilityLabel={label}
        value={value}
        mode="date"
        display="spinner"
        minimumDate={minimumDate}
        onChange={(event, date) => {
          if (!date || event.type === 'dismissed') return;
          const next = new Date(value);
          next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          onChange(next);
        }}
      />
      {mode === 'datetime' ? (
        <DateTimePicker
          accessibilityLabel={`${label} time`}
          value={value}
          mode="time"
          display="spinner"
          minuteInterval={5}
          onChange={(event, date) => {
            if (!date || event.type === 'dismissed') return;
            const next = new Date(value);
            next.setHours(date.getHours(), date.getMinutes(), 0, 0);
            onChange(next);
          }}
        />
      ) : null}
    </View>
  );
}

function Heading({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return (
    <Text variant="subhead" style={{ color: C.muted, fontWeight: '600', paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm }}>
      {title}
    </Text>
  );
}

function Footnote({ text, tone }: { text: string; tone?: 'muted' | 'danger' }) {
  const { colors: C } = useTheme();
  return (
    <Text variant="footnote"
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={{ color: tone === 'danger' ? C.danger : C.muted, padding: space.md }}
    >
      {text}
    </Text>
  );
}

export function SeriesSheet(props: SeriesSheetRequest) {
  const { colors: C } = useTheme();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const editing = props.mode === 'edit' ? props.series : null;
  const moving = props.mode === 'move';
  const initialStart = props.mode === 'move' ? props.date : props.mode === 'edit' ? props.series.start : props.start;
  const initialTime = props.mode === 'move' ? props.time : props.mode === 'edit' ? props.series.time : { checkpoint: naturalCheckpoint(props.title) };
  const initialClock = clockFrom(initialTime.at);
  const initialExact = Boolean(initialTime.at);
  const initialRepeat: Repeat = editing ? editing.recurrence.kind : 'once';
  const initialEvery = editing ? everyOf(editing) : 1;
  const initialDays = editing && editing.recurrence.kind === 'weekly' ? [...editing.recurrence.days] : [calendarWeekday(initialStart)];
  const initialEndKind: EndKind = editing ? editing.end.kind : 'never';
  const initialEndDate = editing && editing.end.kind === 'on' ? editing.end.date : addCalendarDays(initialStart, 30);
  const initialEndCount = editing && editing.end.kind === 'after' ? editing.end.count : 10;
  const [start, setStart] = useState(initialStart);
  const startRef = useRef(initialStart);
  const [checkpoint, setCheckpoint] = useState<RoutineCheckpoint>(initialTime.checkpoint);
  const [exact, setExact] = useState(initialExact);
  const [hour, setHour] = useState(initialClock.hour);
  const [minute, setMinute] = useState(initialClock.minute);
  const [repeat, setRepeat] = useState<Repeat>(initialRepeat);
  const [every, setEvery] = useState(initialEvery);
  const [days, setDays] = useState<number[]>(initialDays);
  const [endKind, setEndKind] = useState<EndKind>(initialEndKind);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [endCount, setEndCount] = useState(initialEndCount);
  const [startOpen, setStartOpen] = useState(false);
  const [stack, setStack] = useState<Page[]>(['form']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Pages stay mounted and slide, so the form keeps its scroll offset and every open wheel.
  const position = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  const saving = useRef(false);
  const baseline = useRef('');
  const slides = useMemo(
    () =>
      Array.from({ length: maxDepth }, (_, index) =>
        position.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [width, 0, -Math.round(width * 0.22)],
          extrapolate: 'clamp'
        }),
      ),
    [position, width],
  );
  const time = composeTime(checkpoint, exact, hour, minute);
  const recurrence = composeRecurrence(repeat, every, days);
  const end = composeEnd(repeat, endKind, endDate, endCount);
  if (!baseline.current)
    baseline.current = draftKey(
      initialStart,
      composeTime(initialTime.checkpoint, initialExact, initialClock.hour, initialClock.minute),
      composeRecurrence(initialRepeat, initialEvery, initialDays),
      composeEnd(initialRepeat, initialEndKind, initialEndDate, initialEndCount),
    );
  const dirty = baseline.current !== draftKey(start, time, recurrence, end);
  const previewSeries: FlowSeries =
    props.mode === 'create'
      ? {
          id: '00000000-0000-4000-8000-000000000000',
          itemKind: props.itemKind,
          itemId: props.itemId,
          ...(props.version != null ? { version: props.version } : {}),
          start,
          time,
          recurrence,
          end,
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      : { ...props.series, start, time, recurrence, end };
  const problem = !moving && end.kind === 'on' && end.date < start ? 'The series ends before it starts. Pick a later end date.' : '';
  const blocked = busy || Boolean(problem);
  const heading = props.mode === 'edit' ? 'Edit series' : moving ? 'This time only' : 'Add to Daily flow';
  const unit: Unit = repeat === 'daily' ? 'day' : repeat === 'monthly' ? 'month' : 'week';
  const everyMax = unit === 'day' ? 30 : 12;
  const startDate = dateFromParts(start, exact ? hour : 0, exact ? minute : 0);
  const endDateValue = dateFromParts(endDate < start ? start : endDate, 0, 0);
  const chosen = plainKind(recurrence, start);
  const bottomSpace = Math.max(inset.bottom, 16) + 24;
  const subject = (props.mode === 'create' ? props.itemKind : props.series.itemKind) === 'session' ? 'Session' : 'Flow';

  function push(next: Page) {
    if (animating.current || busy || stack.includes(next)) return;
    animating.current = true;
    const target = stack.length;
    setStack(current => [...current, next]);
    Animated.timing(position, { toValue: target, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      animating.current = false;
    });
  }

  function pop() {
    if (animating.current || stack.length < 2) return;
    animating.current = true;
    const depth = stack.length;
    Animated.timing(position, { toValue: depth - 2, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      animating.current = false;
      if (finished) setStack(current => (current.length > 1 ? current.slice(0, -1) : current));
      else position.setValue(depth - 1);
    });
  }

  function cancel() {
    if (busy) return;
    if (!dirty) {
      props.onClose();
      return;
    }
    Alert.alert('Discard changes?', 'Your changes to this Daily flow will not be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: props.onClose },
    ]);
  }

  function close() {
    if (stack.length > 1) pop();
    else cancel();
  }

  function applyStart(date: Date) {
    const iso = isoFromDate(date);
    const previous = startRef.current;
    startRef.current = iso;
    setStart(iso);
    if (exact) {
      setHour(date.getHours());
      setMinute(date.getMinutes());
    }
    setEndDate(current => (current < iso ? iso : current));
    setDays(current => {
      if (repeat !== 'weekly') return [calendarWeekday(iso)];
      const oldDay = calendarWeekday(previous);
      if (current.length === 1 && current[0] === oldDay) return [calendarWeekday(iso)];
      return current.length ? current : [calendarWeekday(iso)];
    });
  }

  function setUnit(next: Unit) {
    setEvery(value => clamp(value, 1, next === 'day' ? 30 : 12));
    if (next === 'day') setRepeat('daily');
    else if (next === 'month') setRepeat('monthly');
    else {
      setRepeat('weekly');
      setDays(current => (current.length ? current : [calendarWeekday(startRef.current)]));
    }
  }

  function openCustom() {
    if (repeat === 'once') {
      setRepeat('weekly');
      setEvery(1);
      setDays([calendarWeekday(startRef.current)]);
    } else if (repeat === 'weekdays') {
      setRepeat('weekly');
      setEvery(1);
      setDays([1, 2, 3, 4, 5]);
    }
    push('custom');
  }

  async function save() {
    // A second tap lands before `busy` re-renders the dimmed Done, so the ref is the real guard.
    if (saving.current || blocked) return;
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      if (props.mode === 'move') await moveOccurrence(props.series.id, props.original, { date: start, time });
      else if (props.mode === 'edit') await updateSeries(props.series.id, { start, time, recurrence, end });
      else
        await createSeries({
          itemKind: props.itemKind,
          itemId: props.itemId,
          ...(props.version != null ? { version: props.version } : {}),
          start,
          time,
          recurrence,
          end
        });
      props.onClose();
    } catch (reason) {
      saving.current = false;
      setBusy(false);
      setError(reason instanceof Error ? reason.message : 'Try again.');
    }
  }

  async function remove() {
    if (props.mode !== 'edit' || saving.current) return;
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      await deleteSeries(props.series.id);
      props.onClose();
    } catch (reason) {
      saving.current = false;
      setBusy(false);
      setError(reason instanceof Error ? reason.message : 'Try again.');
    }
  }

  function confirmDelete() {
    Alert.alert('Delete series?', 'This removes every occurrence from your Daily flow.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  const barButton = (label: string, onPress: () => void, accent = false, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: hit,
        minWidth: 64,
        justifyContent: 'center',
        paddingHorizontal: space.ms,
        opacity: disabled ? 0.35 : pressed ? opacity.pressed : 1
      })}
    >
      <Text variant="body" style={{ color: accent ? C.lime : C.text, fontWeight: accent ? '600' : '400', textAlign: accent ? 'right' : 'left' }}>
        {label}
      </Text>
    </Pressable>
  );

  function header(which: Page) {
    const title = which === 'form' ? heading : which === 'time' ? 'Time of day' : which === 'repeat' ? 'Repeat' : which === 'custom' ? 'Custom' : 'Ends';
    if (which === 'form') {
      return (
        <SheetBar
          title={title}
          left={barButton('Cancel', cancel, false, busy)}
          right={
            busy ? (
              <View style={{ minHeight: hit, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: space.ms }}>
                <ActivityIndicator accessibilityLabel="Saving" color={C.lime} />
              </View>
            ) : (
              barButton('Done', () => void save(), true, blocked)
            )
          }
        />
      );
    }
    return (
      <SheetBar
        title={title}
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={pop}
            style={({ pressed }) => ({ minWidth: hit, minHeight: hit, justifyContent: 'center', paddingHorizontal: space.ms, opacity: pressed ? opacity.pressed : 1 })}
          >
            <SymbolIcon name="chevron.left" color={C.text} size={22} />
          </Pressable>
        }
      />
    );
  }

  function formPage() {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header('form')}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomSpace }}>
          <FormRow icon="figure.strengthtraining.traditional" label={subject} value={props.title} strong lines={2} />
          <SeriesNote
            kind={props.mode === 'create' ? props.itemKind : props.series.itemKind}
            id={props.mode === 'create' ? props.itemId : props.series.itemId}
            version={props.mode === 'create' ? props.version : props.series.version}
            exercises={props.exercises}
            start={start}
          />
          {moving ? null : (
            <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm }}>
              <SeriesPlanChange
                mode={editing ? 'remove' : 'add'}
                draft={previewSeries}
                removeId={editing?.id}
                items={props.exercises}
              />
            </View>
          )}
          <Hairline />
          <FormRow
            icon="clock"
            label="Exact time"
            grouped={false}
            trailing={
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Exact time"
                accessibilityState={{ checked: exact }}
                onPress={() => setExact(value => !value)}
                hitSlop={6}
                style={{ minWidth: size.button, minHeight: hit, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                  <Switch
                    accessibilityLabel="Exact time"
                    value={exact}
                    onValueChange={setExact}
                    trackColor={{ true: C.lime, false: C.line }}
                    ios_backgroundColor={C.line}
                    thumbColor={Platform.OS === 'android' ? C.card : undefined}
                  />
                </View>
              </Pressable>
            }
          />
          <Hairline />
          <FormRow
            label={moving ? 'Date' : 'Starts'}
            value={exact ? `${formatSeriesDate(start)} at ${formatClock(hour, minute)}` : formatSeriesDate(start)}
            disabled={busy}
            onPress={() => setStartOpen(value => !value)}
            accessibilityLabel={`${moving ? 'Date' : 'Starts'}, ${exact ? `${formatSeriesDate(start)} at ${formatClock(hour, minute)}` : formatSeriesDate(start)}${startOpen ? ', close the picker' : ', open the picker'}`}
          />
          {startOpen ? (
            <>
              <Hairline />
              <Wheel label={moving ? 'Date' : 'Starts'} value={startDate} mode={exact ? 'datetime' : 'date'} onChange={applyStart} />
            </>
          ) : null}
          <Hairline />
          <FormRow icon="sun.horizon" label="Time of day" value={checkpoint} chevron disabled={busy} onPress={() => push('time')} />
          <Hairline />
          {moving ? null : (
            <>
              <FormRow
                icon="arrow.triangle.2.circlepath"
                label="Repeat"
                value={repeatLabel(recurrence)}
                chevron
                disabled={busy}
                onPress={() => push('repeat')}
              />
              <Hairline />
              {repeat === 'once' ? null : (
                <>
                  <FormRow
                    icon="calendar.badge.clock"
                    label="Ends"
                    value={endLabel(end)}
                    chevron
                    disabled={busy}
                    onPress={() => push('ends')}
                  />
                  <Hairline />
                </>
              )}
              <Footnote text={routineLine(previewSeries)} />
            </>
          )}
          {problem ? <Footnote text={problem} tone="danger" /> : null}
          {error ? <Footnote text={error} tone="danger" /> : null}
          {props.mode === 'edit' ? (
            <View style={{ marginTop: space.md }}>
              <Hairline inset={0} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete series"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={confirmDelete}
                style={({ pressed }) => ({
                  minHeight: rowHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? C.card : 'transparent',
                  opacity: busy ? 0.4 : 1
                })}
              >
                <Text variant="body" style={{ color: C.danger }}>Delete series</Text>
              </Pressable>
              <Hairline inset={0} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  function timePage() {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header('time')}
        <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
          <Heading title="Choose when" />
          <Hairline inset={0} />
          {routineCheckpoints.map(item => (
            <View key={item}>
              <ChoiceRow
                label={item}
                selected={checkpoint === item}
                onPress={() => {
                  setCheckpoint(item);
                  pop();
                }}
              />
              <Hairline inset={16} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  function repeatPage() {
    const rows: { id: Repeat | 'custom'; label: string; chevron?: boolean; onPress: () => void }[] = [
      { id: 'once', label: 'Never', onPress: () => { setRepeat('once'); pop(); } },
      { id: 'daily', label: 'Every day', onPress: () => { setRepeat('daily'); setEvery(1); pop(); } },
      { id: 'weekdays', label: 'Every weekday (Mon–Fri)', onPress: () => { setRepeat('weekdays'); pop(); } },
      {
        id: 'weekly',
        label: 'Every week',
        onPress: () => {
          setRepeat('weekly');
          setEvery(1);
          setDays([calendarWeekday(startRef.current)]);
          pop();
        }
      },
      { id: 'monthly', label: 'Every month', onPress: () => { setRepeat('monthly'); setEvery(1); pop(); } },
      { id: 'custom', label: 'Custom…', chevron: true, onPress: openCustom },
    ];
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header('repeat')}
        <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
          <Heading title="Set frequency" />
          <Hairline inset={0} />
          {rows.map(row => (
            <View key={row.id}>
              <ChoiceRow label={row.label} selected={chosen === row.id} chevron={row.chevron} onPress={row.onPress} />
              <Hairline inset={16} />
            </View>
          ))}
          <Footnote text={routineLine(previewSeries)} />
        </ScrollView>
      </View>
    );
  }

  function customPage() {
    const units: [Unit, string][] = [
      ['day', 'Day'],
      ['week', 'Week'],
      ['month', 'Month'],
    ];
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header('custom')}
        <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
          <Heading title="Set the interval" />
          <Hairline inset={0} />
          <View style={{ minHeight: rowHeight, flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, paddingRight: space.sm }}>
            <Text variant="body" style={{ flex: 1, color: C.text }}>Every</Text>
            <Stepper
              value={clamp(every, 1, everyMax)}
              minimum={1}
              maximum={everyMax}
              lessLabel={`Fewer ${unit}s between repeats`}
              moreLabel={`More ${unit}s between repeats`}
              suffix={clamp(every, 1, everyMax) === 1 ? unit : `${unit}s`}
              onChange={setEvery}
            />
          </View>
          <Hairline inset={16} />
          <View style={{ minHeight: rowHeight, flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, paddingRight: space.sm }}>
            <Text variant="body" style={{ flex: 1, color: C.text }}>Unit</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {units.map(([id, label]) => {
                const selected = unit === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                    onPress={() => setUnit(id)}
                    style={({ pressed }) => ({
                      minWidth: size.button,
                      minHeight: hit,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? opacity.pressed : 1
                    })}
                  >
                    <Text variant="body" style={{ color: selected ? C.lime : C.text, fontWeight: selected ? '600' : '400'}}>{label}</Text>
                    <View
                      style={{
                        marginTop: space.xs,
                        height: 2,
                        borderRadius: 1,
                        alignSelf: 'stretch',
                        backgroundColor: selected ? C.lime : 'transparent'
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Hairline inset={16} />
          {unit === 'week' ? (
            <>
              <View style={{ paddingHorizontal: space.ms, paddingVertical: space.ms, flexDirection: 'row', justifyContent: 'space-between' }}>
                {dayLetters.map((letter, index) => {
                  const day = index + 1;
                  const on = days.includes(day);
                  const only = on && days.length === 1;
                  return (
                    <Pressable
                      key={dayNames[index]}
                      accessibilityRole="button"
                      accessibilityLabel={dayNames[index] ?? letter}
                      accessibilityState={{ selected: on, disabled: only }}
                      disabled={only}
                      onPress={() =>
                        setDays(current => {
                          if (current.includes(day)) return current.length === 1 ? current : current.filter(item => item !== day);
                          return [...current, day];
                        })
                      }
                      style={({ pressed }) => ({ width: hit, height: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radius.pill,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: on ? C.lime : 'transparent',
                          borderWidth: on ? 0 : StyleSheet.hairlineWidth,
                          borderColor: C.line
                        }}
                      >
                        <Text variant="subhead" style={{ color: on ? C.onAccent : C.text, fontWeight: '600'}}>{letter}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Hairline inset={16} />
            </>
          ) : null}
          <Footnote text={routineLine(previewSeries)} />
        </ScrollView>
      </View>
    );
  }

  function endsPage() {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header('ends')}
        <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
          <Heading title="Set end" />
          <Hairline inset={0} />
          <ChoiceRow label="Never" selected={endKind === 'never'} onPress={() => setEndKind('never')} />
          <Hairline inset={16} />
          <ChoiceRow
            label="On date"
            selected={endKind === 'on'}
            onPress={() => {
              setEndKind('on');
              setEndDate(current => (current < startRef.current ? startRef.current : current));
            }}
          />
          {endKind === 'on' ? (
            <>
              <Hairline inset={16} />
              <Wheel
                label="End date"
                value={endDateValue}
                mode="date"
                minimumDate={dateFromParts(start, 0, 0)}
                onChange={date => {
                  const iso = isoFromDate(date);
                  setEndDate(iso < startRef.current ? startRef.current : iso);
                }}
              />
            </>
          ) : null}
          <Hairline inset={16} />
          <ChoiceRow label="After a number of times" selected={endKind === 'after'} onPress={() => setEndKind('after')} />
          {endKind === 'after' ? (
            <>
              <Hairline inset={16} />
              <View style={{ minHeight: rowHeight, flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, paddingRight: space.sm }}>
                <Text variant="subhead" style={{ flex: 1, color: C.muted }}>Occurrences</Text>
                <Stepper
                  value={endCount}
                  minimum={1}
                  maximum={365}
                  lessLabel="Fewer times"
                  moreLabel="More times"
                  suffix={endCount === 1 ? 'time' : 'times'}
                  onChange={setEndCount}
                />
              </View>
            </>
          ) : null}
          <Hairline inset={16} />
          <Footnote text={routineLine(previewSeries)} />
        </ScrollView>
      </View>
    );
  }

  function body(which: Page) {
    if (which === 'time') return timePage();
    if (which === 'repeat') return repeatPage();
    if (which === 'custom') return customPage();
    if (which === 'ends') return endsPage();
    return formPage();
  }

  return (
    <DetailSurface presentation="modal" fullScreen={Platform.OS !== 'ios'} safeArea={false} onClose={close}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? space.sm : inset.top }}>
        {stack.map((name, index) => {
          const top = index === stack.length - 1;
          return (
            <Animated.View
              key={name}
              pointerEvents={top ? 'auto' : 'none'}
              accessibilityElementsHidden={!top}
              importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: C.bg, transform: [{ translateX: slides[index] ?? 0 }] },
                index > 0 ? { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: -3, height: 0 }, elevation: 8 } : null,
              ]}
            >
              {body(name)}
            </Animated.View>
          );
        })}
      </View>
    </DetailSurface>
  );
}
