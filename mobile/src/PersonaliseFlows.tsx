import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { Lifestyle } from '../../shared/flow-benchmarks';
import { formatKg } from '../../shared/progression';
import { strengthPatterns, type StrengthPattern } from '../../shared/strength';
import { lifestyles } from './AboutYou';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { CatalogBar } from './FlowCatalogTile';
import { useRootListInset } from './RootList';
import { AnchorEditor, StrengthProfile } from './StrengthProfile';
import { saveBody, useStrength } from './strength';
import { savePersonalMetric, usePersonalMetrics } from './personal-metrics';
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
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: lifts || estimated ? C.line : C.lime,
        backgroundColor: C.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: lifts || estimated ? C.text : C.lime, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 19 }}>{detail}</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
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
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar title="Personalise" onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 128 }}>
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
  const rows = [
    {
      id: 'gym' as const,
      title: 'Gym',
      status: lifts ? `${lifts} lift${lifts === 1 ? '' : 's'} set` : strength?.body ? 'From your body weight' : 'Weights: one lift you know',
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
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          Make every flow fit you
        </Text>
        <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
          Answer only for what you do. Each takes one number, and what you log keeps it current.
        </Text>
      </View>
      {rows.map(row => {
        const expanded = open === row.id;
        return (
          <View key={row.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${row.title}. ${row.status}`}
              onPress={() => setOpen(expanded ? null : row.id)}
              style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{row.title}</Text>
                <Text numberOfLines={1} style={{ color: C.muted, fontSize: 14 }}>
                  {row.status}
                </Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 20 }}>{expanded ? '⌃' : '›'}</Text>
            </Pressable>
            {expanded ? <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>{row.body}</View> : null}
          </View>
        );
      })}
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
        Calisthenics and CrossFit are next. Anything you change yourself in a flow stays exactly as you set it.
      </Text>
    </View>
  );
}

/** Gym: one lift sets every weight; body weight if none; more lifts optional. */
function GymSetup() {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const [choosing, setChoosing] = useState<StrengthPattern | null>(null);
  const [others, setOthers] = useState(false);
  const [more, setMore] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
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
          minHeight: 40,
          justifyContent: 'center',
          paddingHorizontal: 14,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: selected ? C.lime : C.line,
          backgroundColor: selected ? C.lime : C.card,
        }}
      >
        <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 15 }}>{title(pattern)}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 20 }}>

        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            {anchors.length ? 'Your lifts' : 'A lift you know'}
          </Text>
          {anchors.map(anchor => (
            <Pressable
              key={anchor.pattern}
              accessibilityRole="button"
              accessibilityLabel={`${title(anchor.pattern)}, ${formatKg(anchor.weightKg)} kilograms for ${anchor.reps} reps. Change`}
              onPress={() => setChoosing(choosing === anchor.pattern ? null : anchor.pattern)}
              style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{title(anchor.pattern)}</Text>
              <Text style={{ color: C.text, fontSize: 16 }}>{`${formatKg(anchor.weightKg)} kg × ${anchor.reps}`}</Text>
            </Pressable>
          ))}
          {anchors.length ? null : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quickPicks.map(chip)}
              {others ? (
                strengthPatterns.filter(item => !quickPicks.includes(item.id)).map(item => chip(item.id))
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Other lift"
                  onPress={() => setOthers(true)}
                  style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 }}
                >
                  <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Other lift</Text>
                </Pressable>
              )}
            </View>
          )}
          {choosing ? (
            <AnchorEditor
              pattern={choosing}
              title={title(choosing)}
              initial={anchors.find(anchor => anchor.pattern === choosing) ?? null}
              onDone={() => setChoosing(null)}
            />
          ) : null}
        </View>

        {anchors.length ? null : (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
              Don’t know any lifts?
            </Text>
            {body && !editingBody ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Body weight ${formatKg(body.weightKg)} kilograms, ${lifestyleLabel(body.lifestyle)}. Change`}
                onPress={() => setEditingBody(true)}
                style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>
                  {`${formatKg(body.weightKg)} kg · ${lifestyleLabel(body.lifestyle)}`}
                </Text>
                <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Change</Text>
              </Pressable>
            ) : (
              <BodyForm initial={body} onDone={() => setEditingBody(false)} />
            )}
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: more }}
            accessibilityLabel={more ? 'Hide more lifts' : 'Add more lifts, optional'}
            onPress={() => setMore(value => !value)}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600' }}>Add more lifts</Text>
            <Text style={{ color: C.muted, fontSize: 14 }}>{more ? 'Hide' : 'Optional'}</Text>
          </Pressable>
          {more ? <StrengthProfile embedded /> : null}
        </View>
    </View>
  );
}

/** The three lifts most people know; the rest sit behind "Other lift". */
const quickPicks: StrengthPattern[] = ['hinge', 'squat', 'press'];

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
    <View style={{ gap: 10 }}>
      <TextInput
        accessibilityLabel="Body weight in kilograms"
        value={weight}
        onChangeText={setWeight}
        placeholder="Body weight, kg"
        placeholderTextColor={C.muted}
        keyboardType="decimal-pad"
        style={{ minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, color: C.text, fontSize: 16 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                minHeight: 40,
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selected ? C.lime : C.line,
                backgroundColor: selected ? C.lime : C.card,
              }}
            >
              <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 15 }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save body weight"
        disabled={busy}
        onPress={() => void save()}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}
      >
        <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Save</Text>
      </Pressable>
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
  const field = { minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, color: C.text, fontSize: 16 } as const;
  return (
    <View style={{ gap: 14 }}>
      {editing ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>A recent run you went hard on, like a race or a timed run.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                    minHeight: 40,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: selected ? C.lime : C.line,
                    backgroundColor: selected ? C.lime : C.bg,
                  }}
                >
                  <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 15 }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {distance == null ? (
            <TextInput accessibilityLabel="Distance in kilometres" value={other} onChangeText={setOther} placeholder="Distance, km" placeholderTextColor={C.muted} keyboardType="decimal-pad" style={field} />
          ) : null}
          <TextInput accessibilityLabel="Time, minutes and seconds" value={time} onChangeText={setTime} placeholder="Time, like 25:00 or 1:52:30" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" style={field} />
          {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save run"
            disabled={busy}
            onPress={() => void save()}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Save</Text>
          </Pressable>
        </View>
      ) : run && value ? (
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatDistance(run.distanceM)} in ${clockText(run.seconds)}. Change`}
            onPress={() => setEditing(true)}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{`${formatDistance(run.distanceM)} in ${clockText(run.seconds)}`}</Text>
            <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Change</Text>
          </Pressable>
          <Text style={{ color: C.muted, fontSize: 13 }}>Your paces</Text>
          {(['easy', 'marathon', 'threshold', 'interval'] as const).map(intensity => (
            <View key={intensity} style={{ flexDirection: 'row', paddingVertical: 4 }}>
              <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{intensityShare[intensity].title}</Text>
              <Text style={{ color: C.text, fontSize: 15 }}>{paceText(paceRange(value, intensity))}</Text>
            </View>
          ))}
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>
            {`Likely today: ${runDistances
              .filter(item => Math.abs(item.metres - run.distanceM) > 1)
              .slice(0, 3)
              .map(item => `${item.label} ${clockText(riegel(run.distanceM, run.seconds, item.metres))}`)
              .join(', ')}.`}
          </Text>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: extras }}
          accessibilityLabel={extras ? 'Hide optional running details' : 'Optional: weekly distance and swim time'}
          onPress={() => setExtras(valueNow => !valueNow)}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: '600' }}>Weekly distance, swim time</Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>{extras ? 'Hide' : 'Optional'}</Text>
        </Pressable>
        {extras ? (
          <View style={{ gap: 10 }}>
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
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={label}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType="numbers-and-punctuation"
          style={{ flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, color: C.text, fontSize: 16 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Save ${label}`}
          disabled={busy}
          onPress={() => void save()}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Save</Text>
        </Pressable>
      </View>
      {message ? <Text style={{ color: C.muted, fontSize: 13 }}>{message}</Text> : null}
      {note ? <Text style={{ color: C.muted, fontSize: 13 }}>{note}</Text> : null}
    </View>
  );
}
