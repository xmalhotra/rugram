import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { Lifestyle } from '../../shared/flow-benchmarks';
import { formatKg } from '../../shared/progression';
import { strengthPatterns, type StrengthPattern } from '../../shared/strength';
import { muscleAreas, type MuscleArea } from '../../shared/muscle-map';
import { lifestyles } from './AboutYou';
import { Text } from './design/Text';
import { Button, ReasonLine, SectionHeader, Sheet } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, space, textRoles, useTheme } from './design/theme';
import { CatalogBar } from './FlowCatalogTile';
import { useRootListInset } from './RootList';
import { AnchorEditor, StrengthProfile } from './StrengthProfile';
import { saveBody, useStrength } from './strength';
import { savePersonalMetric, usePersonalMetrics } from './personal-metrics';
import { catalogFlows } from '../../shared/flow-catalog';
import { defaultFlowView, trainPlaceChoices, type TrainPlace } from '../../shared/flow-defaults';
import { flowsNowFit, priorityAddedLine } from '../../shared/first-run';
import { gymFlows } from '../../shared/gym-flows';
import { finisherFor, flowLevelOf } from '../../shared/priority-finisher';
import { describedCatalogFlow, useFlowMember, useFlowOverrides } from './flow-member';
import { clockText, intensityShare, paceRange, paceText, riegel, swimPace, vdot } from '../../shared/running-paces';

/**
 * The row at the top of the Qram tab. Before anything is set it invites the member to personalise; after,
 * it says what their flows are using. Either way it opens the setup page.
 */
export function PersonaliseRow({ onOpen }: { onOpen: () => void }) {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const metrics = usePersonalMetrics();
  const lifts = strength?.anchors.length ?? 0;
  const estimated = Boolean(strength?.profile.patterns.length);
  const run = Boolean(metrics['run.recent']);
  const set = [lifts ? 'Gym' : estimated ? 'Gym (body weight)' : null, run ? 'Running' : null].filter(Boolean);
  const title = set.length ? 'Personalised for you' : 'Personalise your flows';
  const detail = set.length
    ? `${set.join(' · ')}. Tap to add or change.`
    : 'One number for what you do, a lift or a recent run, and flows fit you.';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.ms,
        padding: space.md,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: lifts || estimated ? C.line : C.lime,
        backgroundColor: C.card,
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <Text variant="callout" style={{ color: lifts || estimated ? C.text : C.lime, fontWeight: '600' }}>{title}</Text>
        <Text variant="subhead" style={{ color: C.muted }}>{detail}</Text>
      </View>
      <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
    </Pressable>
  );
}

/**
 * Setup for personalised flows, asking only what the estimate needs: one lift the member knows. Without one,
 * body weight and how active they are. More lifts are optional and folded away.
 */
export function PersonalisePage({ onBack }: { onBack: () => void }) {
  const inset = useRootListInset();
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - space.ms) }}>
      <CatalogBar title="Personalise" onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128 }}>
        <PersonaliseContent />
      </ScrollView>
    </View>
  );
}

/**
 * The setup itself, for a page that already scrolls (the profile): one row per kind of flow, each opening to
 * its one essential question. Every category is optional.
 */
export function PersonaliseContent() {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const metrics = usePersonalMetrics();
  const [open, setOpen] = useState<'gym' | 'running' | null>(null);
  const lifts = strength?.anchors.length ?? 0;
  const run = metrics['run.recent'];
  const place = trainPlaceChoices.find(item => item.id === metrics['gym.place']?.place)?.label;
  const minutes = metrics['gym.minutes']?.minutes;
  const gymExtras = [place, minutes ? `${minutes} min` : null].filter(Boolean).join(' · ');
  const gymStatus = lifts ? `${lifts} lift${lifts === 1 ? '' : 's'} set` : strength?.body ? 'From your body weight' : 'Weights: one lift you know';
  const rows = [
    {
      id: 'gym' as const,
      title: 'Gym',
      status: [gymStatus, gymExtras].filter(Boolean).join(' · '),
      body: <GymSetup />,
    },
    {
      id: 'running' as const,
      title: 'Running and endurance',
      status: run ? `${formatDistance(run.distanceM)} in ${clockText(run.seconds)}` : 'Paces: one recent run',
      body: <RunningSetup />,
    },
  ];
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader
        title="Make every flow fit you"
        detail="Answer only for what you do. Each takes one number, and what you log keeps it current."
      />
      {rows.map(row => {
        const expanded = open === row.id;
        return (
          <View key={row.id} style={{ borderRadius: radius.control, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${row.title}. ${row.status}`}
              onPress={() => setOpen(expanded ? null : row.id)}
              style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.ms, padding: space.md, opacity: pressed ? opacity.pressed : 1 })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{row.title}</Text>
                <Text numberOfLines={1} variant="subhead" style={{ color: C.muted }}>
                  {row.status}
                </Text>
              </View>
              {expanded ? (
                <Text variant="section" style={{ color: C.muted }}>⌃</Text>
              ) : (
                <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
              )}
            </Pressable>
            {expanded ? <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>{row.body}</View> : null}
          </View>
        );
      })}
      <Text variant="footnote" style={{ color: C.muted }}>
        Calisthenics and CrossFit are next. Anything you change yourself in a flow stays exactly as you set it.
      </Text>
    </View>
  );
}

/** The six groups on Body flow, covering all 24 areas. */
const priorityGroups: { title: string; areas: MuscleArea[] }[] = [
  { title: 'Back', areas: ['lats', 'mid-back', 'lower-back', 'traps', 'neck'] },
  { title: 'Chest', areas: ['upper-chest', 'chest'] },
  { title: 'Shoulders', areas: ['front-delts', 'side-delts', 'rear-delts'] },
  { title: 'Arms', areas: ['biceps', 'triceps', 'forearms'] },
  { title: 'Core', areas: ['upper-abs', 'lower-abs', 'obliques'] },
  { title: 'Legs', areas: ['glutes', 'quads', 'hamstrings', 'calves', 'hip-flexors', 'abductors', 'adductors', 'shins'] },
];

function priorityLabel(areas: readonly MuscleArea[] | undefined) {
  if (!areas?.length) return 'None';
  return areas.map(id => muscleAreas.find(area => area.id === id)?.title ?? id).join(', ');
}

/** Up to three areas. A flow that already trains a neighbour gets a short finisher for each. */
function PriorityAreasSheet({
  selected,
  onClose,
  onChange,
}: {
  selected: readonly MuscleArea[];
  onClose: () => void;
  onChange: (areas: MuscleArea[] | null) => Promise<unknown>;
}) {
  const { colors: C } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const full = selected.length >= 3;
  async function save(next: MuscleArea[] | null) {
    setBusy(true);
    setError('');
    try {
      await onChange(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title="Priority areas" onClose={onClose}>
      <Text variant="subhead" style={{ color: C.muted }}>
        Flows that train nearby muscles get a short finisher for these.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
      {priorityGroups.map(group => (
        <View key={group.title}>
          <Text accessibilityRole="header" variant="footnote" style={{ color: C.muted, fontWeight: '600', paddingTop: space.md, paddingBottom: space.xs }}>
            {group.title}
          </Text>
          {group.areas.map(id => {
            const title = muscleAreas.find(area => area.id === id)?.title ?? id;
            const on = selected.includes(id);
            const locked = full && !on;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={locked ? `${title}, three priorities already` : title}
                accessibilityState={{ selected: on, disabled: locked || busy }}
                disabled={locked || busy}
                onPress={() => void save(on ? selected.filter(area => area !== id) : [...selected, id])}
                style={({ pressed }) => ({
                  minHeight: hit,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: locked ? 0.4 : pressed ? opacity.pressed : 1,
                })}
              >
                <Text variant="callout" style={{ flex: 1, color: C.text }}>{title}</Text>
                {on ? <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.lime} size={space.md} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <Button
        title="Clear"
        variant="text"
        accessibilityLabel="Clear priority areas"
        disabled={busy}
        onPress={() => void save(null)}
      />
    </Sheet>
  );
}

/** Gym: one lift sets every weight; body weight if none; more lifts optional. */
function priorityFlowCount(areas: readonly MuscleArea[]) {
  if (!areas.length) return 0;
  return gymFlows.filter(flow => finisherFor(flow.items, areas, flowLevelOf(flow.level)).length > 0).length;
}

function GymSetup() {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const metrics = usePersonalMetrics();
  const { member } = useFlowMember();
  const [, setOverrides] = useFlowOverrides();
  const [fitWhere, setFitWhere] = useState<null | 'level' | 'setup'>(null);
  const [priorityLine, setPriorityLine] = useState('');
  const described = catalogFlows.flatMap(flow => {
    const row = describedCatalogFlow(flow);
    return row ? [row] : [];
  });
  const fitLine = flowsNowFit(defaultFlowView(described, member).length);
  function forget(key: 'place' | 'minutes') {
    setOverrides(current => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }
  const [choosing, setChoosing] = useState<StrengthPattern | null>(null);
  const [others, setOthers] = useState(false);
  const [more, setMore] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [prioritiesOpen, setPrioritiesOpen] = useState(false);
  const anchors = strength?.anchors ?? [];
  const body = strength?.body ?? null;
  const title = (pattern: StrengthPattern) => strengthPatterns.find(item => item.id === pattern)?.title ?? pattern;
  const chip = (pattern: StrengthPattern) => {
    const selected = choosing === pattern;
    return (
      <Pressable
        key={pattern}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={title(pattern)}
        onPress={() => setChoosing(selected ? null : pattern)}
        style={{
          minHeight: hit,
          justifyContent: 'center',
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? C.lime : C.line,
          backgroundColor: selected ? C.lime : C.card,
        }}
      >
        <Text variant="subhead" style={{ color: selected ? C.onAccent : C.text }}>{title(pattern)}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ gap: space.lg }}>

        <View style={{ gap: space.ms }}>
          <SectionHeader title={anchors.length ? 'Your lifts' : 'A lift you know'} />
          {anchors.map(anchor => (
            <Pressable
              key={anchor.pattern}
              accessibilityRole="button"
              accessibilityLabel={`${title(anchor.pattern)}, ${formatKg(anchor.weightKg)} kilograms for ${anchor.reps} reps. Change`}
              onPress={() => setChoosing(choosing === anchor.pattern ? null : anchor.pattern)}
              style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', opacity: pressed ? opacity.pressed : 1 })}
            >
              <Text variant="callout" style={{ flex: 1, color: C.text }}>{title(anchor.pattern)}</Text>
              <Text variant="callout" style={{ color: C.text }}>{`${formatKg(anchor.weightKg)} kg × ${anchor.reps}`}</Text>
            </Pressable>
          ))}
          {anchors.length ? null : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {quickPicks.map(chip)}
              {others ? (
                strengthPatterns.filter(item => !quickPicks.includes(item.id)).map(item => chip(item.id))
              ) : (
                <Button
                  title="Other lift"
                  variant="text"
                  size="regular"
                  accessibilityLabel="Other lift"
                  onPress={() => setOthers(true)}
                />
              )}
            </View>
          )}
          {choosing ? (
            <AnchorEditor
              pattern={choosing}
              title={title(choosing)}
              initial={anchors.find(anchor => anchor.pattern === choosing) ?? null}
              onDone={() => {
                setChoosing(null);
                setFitWhere('level');
              }}
            />
          ) : null}
          {fitWhere === 'level' ? <ReasonLine>{fitLine}</ReasonLine> : null}
        </View>

        {anchors.length ? null : (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Don’t know any lifts?" />
            {body && !editingBody ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Body weight ${formatKg(body.weightKg)} kilograms, ${lifestyleLabel(body.lifestyle)}. Change`}
                onPress={() => setEditingBody(true)}
                style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', opacity: pressed ? opacity.pressed : 1 })}
              >
                <Text variant="callout" style={{ flex: 1, color: C.text }}>
                  {`${formatKg(body.weightKg)} kg · ${lifestyleLabel(body.lifestyle)}`}
                </Text>
                <Text variant="subhead" style={{ color: C.lime, fontWeight: '600' }}>Change</Text>
              </Pressable>
            ) : (
              <BodyForm
                initial={body}
                onDone={() => {
                  setEditingBody(false);
                  setFitWhere('level');
                }}
              />
            )}
          </View>
        )}

        <ChoiceChips
          label="Where do you train?"
          options={trainPlaceChoices.map(item => ({ id: item.id, label: item.label }))}
          selected={metrics['gym.place']?.place ?? null}
          onSelect={async id => {
            const place = id as TrainPlace;
            if (metrics['gym.place']?.place === place) await savePersonalMetric('gym.place', null);
            else await savePersonalMetric('gym.place', { place });
            forget('place');
            setFitWhere('setup');
          }}
        />
        <ChoiceChips
          label="Time for a workout"
          options={[
            { id: '30', label: '30 min' },
            { id: '45', label: '45 min' },
            { id: '60', label: '60 min' },
            { id: 'varies', label: 'Varies' },
          ]}
          selected={metrics['gym.minutes'] ? String(metrics['gym.minutes'].minutes) : 'varies'}
          onSelect={async id => {
            if (id === 'varies') await savePersonalMetric('gym.minutes', null);
            else await savePersonalMetric('gym.minutes', { minutes: Number(id) as 30 | 45 | 60 });
            forget('minutes');
            setFitWhere('setup');
          }}
        />
        {fitWhere === 'setup' ? <ReasonLine>{fitLine}</ReasonLine> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Priority areas, ${priorityLabel(metrics['gym.priorities']?.areas)}`}
          onPress={() => setPrioritiesOpen(true)}
          style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', gap: space.ms, opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="callout" style={{ flex: 1, color: C.text, fontWeight: '600' }}>Priority areas</Text>
          <Text variant="subhead" style={{ color: C.muted }}>{priorityLabel(metrics['gym.priorities']?.areas)}</Text>
        </Pressable>
        {priorityLine ? <ReasonLine>{priorityLine}</ReasonLine> : null}
        {prioritiesOpen ? (
          <PriorityAreasSheet
            selected={metrics['gym.priorities']?.areas ?? []}
            onClose={() => setPrioritiesOpen(false)}
            onChange={async areas => {
              await savePersonalMetric('gym.priorities', areas?.length ? { areas } : null);
              setPriorityLine(priorityAddedLine(priorityFlowCount(areas ?? [])));
            }}
          />
        ) : null}

        <View style={{ gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: more }}
            accessibilityLabel={more ? 'Hide more lifts' : 'Add more lifts, optional'}
            onPress={() => setMore(value => !value)}
            style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', opacity: pressed ? opacity.pressed : 1 })}
          >
            <Text variant="callout" style={{ flex: 1, color: C.text, fontWeight: '600' }}>Add more lifts</Text>
            <Text variant="subhead" style={{ color: C.muted }}>{more ? 'Hide' : 'Optional'}</Text>
          </Pressable>
          {more ? <StrengthProfile embedded onSaved={() => setFitWhere('level')} /> : null}
        </View>
    </View>
  );
}

/** The three lifts most people know; the rest sit behind "Other lift". */
const quickPicks: StrengthPattern[] = ['hinge', 'squat', 'press'];

/** One optional choice, saved as soon as it's tapped. Tapping the current place again clears it. */
function ChoiceChips({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string | null;
  onSelect: (id: string) => Promise<unknown>;
}) {
  const { colors: C } = useTheme();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function choose(id: string) {
    setBusy(true);
    setError('');
    try {
      await onSelect(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.ms }}>
      <SectionHeader title={label} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map(option => {
          const on = selected === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: busy }}
              accessibilityLabel={option.label}
              disabled={busy}
              onPress={() => void choose(option.id)}
              style={{
                minHeight: hit,
                justifyContent: 'center',
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: on ? C.lime : C.line,
                backgroundColor: on ? C.lime : C.card,
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text variant="subhead" style={{ color: on ? C.onAccent : C.text }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="footnote" style={{ color: C.danger }}>{error}</Text> : null}
    </View>
  );
}

function lifestyleLabel(id: Lifestyle) {
  return lifestyles.find(item => item.id === id)?.label ?? id;
}

/** Body weight and activity: the two things the estimate needs when no lift is known. */
function BodyForm({ initial, onDone }: { initial: { weightKg: number; lifestyle: Lifestyle } | null; onDone: () => void }) {
  const { colors: C } = useTheme();
  const [weight, setWeight] = useState(initial ? formatKg(initial.weightKg) : '');
  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(initial?.lifestyle ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    const weightKg = Number(weight.replace(',', '.'));
    if (!(weightKg >= 20 && weightKg <= 300)) return setError('Enter a body weight from 20 to 300 kg.');
    if (!lifestyle) return setError('Choose how active you are.');
    setBusy(true);
    setError('');
    try {
      await saveBody(weightKg, lifestyle);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.ms }}>
      <TextInput
        accessibilityLabel="Body weight in kilograms"
        value={weight}
        onChangeText={setWeight}
        placeholder="Body weight, kg"
        placeholderTextColor={C.muted}
        keyboardType="decimal-pad"
        style={{ minHeight: hit, borderWidth: 1, borderColor: C.line, borderRadius: radius.small, paddingHorizontal: space.ms, color: C.text, fontSize: textRoles.callout.fontSize }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {lifestyles.map(item => {
          const selected = lifestyle === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => setLifestyle(item.id)}
              style={{
                minHeight: hit,
                justifyContent: 'center',
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? C.lime : C.line,
                backgroundColor: selected ? C.lime : C.card,
              }}
            >
              <Text variant="subhead" style={{ color: selected ? C.onAccent : C.text }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="footnote" style={{ color: C.danger }}>{error}</Text> : null}
      <Button
        title="Save"
        variant="text"
        accessibilityLabel="Save body weight"
        disabled={busy}
        onPress={() => void save()}
      />
    </View>
  );
}

const runDistances = [
  { metres: 5000, label: '5 km' },
  { metres: 10000, label: '10 km' },
  { metres: 21097.5, label: 'Half marathon' },
  { metres: 42195, label: 'Marathon' },
];

function formatDistance(metres: number) {
  const known = runDistances.find(item => Math.abs(item.metres - metres) < 1);
  return known ? known.label : `${Math.round(metres / 100) / 10} km`;
}

/** "25:00", "1:45:30" or plain minutes ("25") to seconds. */
function parseTime(text: string) {
  const parts = text.trim().split(':').map(Number);
  if (!parts.length || parts.some(part => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** Running and endurance: one recent run gives every pace; weekly km and a swim time are optional. */
function RunningSetup() {
  const { colors: C } = useTheme();
  const metrics = usePersonalMetrics();
  const run = metrics['run.recent'];
  const [editing, setEditing] = useState(!run);
  const [distance, setDistance] = useState<number | null>(run?.distanceM ?? 5000);
  const [other, setOther] = useState('');
  const [time, setTime] = useState(run ? clockText(run.seconds) : '');
  const [extras, setExtras] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = run ? vdot(run.distanceM, run.seconds) : null;
  async function save() {
    const metres = distance ?? Number(other.replace(',', '.')) * 1000;
    const seconds = parseTime(time);
    if (!(metres >= 1500 && metres <= 42195)) return setError('Choose a distance from 1.5 km to a marathon.');
    if (seconds == null || seconds < 210 || seconds > 5 * 3600) return setError('Enter the time as minutes:seconds, like 25:00.');
    if (vdot(metres, seconds) == null) return setError('That time looks off for the distance. Check it and try again.');
    setBusy(true);
    setError('');
    try {
      await savePersonalMetric('run.recent', { distanceM: metres, seconds });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const field = { minHeight: hit, borderWidth: 1, borderColor: C.line, borderRadius: radius.small, paddingHorizontal: space.ms, color: C.text, fontSize: textRoles.callout.fontSize } as const;
  return (
    <View style={{ gap: space.md }}>
      {editing ? (
        <View style={{ gap: space.ms }}>
          <Text variant="subhead" style={{ color: C.text }}>A recent run you went hard on, like a race or a timed run.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {[...runDistances, { metres: null, label: 'Other' }].map(item => {
              const selected = distance === item.metres;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                  onPress={() => setDistance(item.metres)}
                  style={{
                    minHeight: hit,
                    justifyContent: 'center',
                    paddingHorizontal: space.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: selected ? C.lime : C.line,
                    backgroundColor: selected ? C.lime : C.bg,
                  }}
                >
                  <Text variant="subhead" style={{ color: selected ? C.onAccent : C.text }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {distance == null ? (
            <TextInput accessibilityLabel="Distance in kilometres" value={other} onChangeText={setOther} placeholder="Distance, km" placeholderTextColor={C.muted} keyboardType="decimal-pad" style={field} />
          ) : null}
          <TextInput accessibilityLabel="Time, minutes and seconds" value={time} onChangeText={setTime} placeholder="Time, like 25:00 or 1:52:30" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" style={field} />
          {error ? <Text variant="footnote" style={{ color: C.danger }}>{error}</Text> : null}
          <Button
            title="Save"
            variant="text"
            accessibilityLabel="Save run"
            disabled={busy}
            onPress={() => void save()}
          />
        </View>
      ) : run && value ? (
        <View style={{ gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatDistance(run.distanceM)} in ${clockText(run.seconds)}. Change`}
            onPress={() => setEditing(true)}
            style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', opacity: pressed ? opacity.pressed : 1 })}
          >
            <Text variant="callout" style={{ flex: 1, color: C.text }}>{`${formatDistance(run.distanceM)} in ${clockText(run.seconds)}`}</Text>
            <Text variant="subhead" style={{ color: C.lime, fontWeight: '600' }}>Change</Text>
          </Pressable>
          <Text variant="footnote" style={{ color: C.muted }}>Your paces</Text>
          {(['easy', 'marathon', 'threshold', 'interval'] as const).map(intensity => (
            <View key={intensity} style={{ flexDirection: 'row', paddingVertical: space.xs }}>
              <Text variant="subhead" style={{ flex: 1, color: C.text }}>{intensityShare[intensity].title}</Text>
              <Text variant="subhead" style={{ color: C.text }}>{paceText(paceRange(value, intensity))}</Text>
            </View>
          ))}
          <Text variant="footnote" style={{ color: C.muted }}>
            {`Likely today: ${runDistances
              .filter(item => Math.abs(item.metres - run.distanceM) > 1)
              .slice(0, 3)
              .map(item => `${item.label} ${clockText(riegel(run.distanceM, run.seconds, item.metres))}`)
              .join(', ')}.`}
          </Text>
        </View>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: extras }}
          accessibilityLabel={extras ? 'Hide optional running details' : 'Optional: weekly distance and swim time'}
          onPress={() => setExtras(valueNow => !valueNow)}
          style={({ pressed }) => ({ minHeight: hit, flexDirection: 'row', alignItems: 'center', opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="subhead" style={{ flex: 1, color: C.text, fontWeight: '600' }}>Weekly distance, swim time</Text>
          <Text variant="subhead" style={{ color: C.muted }}>{extras ? 'Hide' : 'Optional'}</Text>
        </Pressable>
        {extras ? (
          <View style={{ gap: space.ms }}>
            <MetricField
              label="Km you run in a week"
              placeholder="About how many km"
              initial={metrics['run.weekly'] ? String(metrics['run.weekly'].km) : ''}
              onSave={text => {
                const km = Number(text.replace(',', '.'));
                return km >= 0 && km <= 250 ? savePersonalMetric('run.weekly', { km }) : 'Enter 0 to 250 km.';
              }}
            />
            <MetricField
              label="400 m swim time (for triathlon)"
              placeholder="Like 8:30"
              initial={metrics['swim.400'] ? clockText(metrics['swim.400'].seconds) : ''}
              note={metrics['swim.400'] ? `Swim pace about ${clockText(swimPace(metrics['swim.400'].seconds))} per 100 m` : undefined}
              onSave={text => {
                const seconds = parseTime(text);
                return seconds != null && seconds >= 180 && seconds <= 1800
                  ? savePersonalMetric('swim.400', { seconds })
                  : 'Enter the time as minutes:seconds, like 8:30.';
              }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** One optional number with its own Save. `onSave` returns a message when the value isn't right. */
function MetricField({
  label,
  placeholder,
  initial,
  note,
  onSave,
}: {
  label: string;
  placeholder: string;
  initial: string;
  note?: string;
  onSave: (text: string) => Promise<unknown> | string;
}) {
  const { colors: C } = useTheme();
  const [text, setText] = useState(initial);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setMessage('');
    const result = onSave(text);
    if (typeof result === 'string') return setMessage(result);
    setBusy(true);
    try {
      await result;
      setMessage('Saved.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: space.ms, alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={label}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType="numbers-and-punctuation"
          style={{ flex: 1, minHeight: hit, borderWidth: 1, borderColor: C.line, borderRadius: radius.small, paddingHorizontal: space.ms, color: C.text, fontSize: textRoles.callout.fontSize }}
        />
        <Button
          title="Save"
          variant="text"
          size="regular"
          accessibilityLabel={`Save ${label}`}
          disabled={busy}
          onPress={() => void save()}
        />
      </View>
      {message ? <Text variant="footnote" style={{ color: C.muted }}>{message}</Text> : null}
      {note ? <Text variant="footnote" style={{ color: C.muted }}>{note}</Text> : null}
    </View>
  );
}
