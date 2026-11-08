import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { formatKg } from '../../shared/progression';
import { sourceLine, strengthPatterns, type StrengthPattern } from '../../shared/strength';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { clearAnchor, saveAnchor, useStrength } from './strength';

/**
 * The member's strength on the reference lifts. They can tell us a weight × reps on any of them;
 * the rest are estimated, and logged sets keep everything current. Private to the member.
 */
export function StrengthProfile() {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const [open, setOpen] = useState<StrengthPattern | null>(null);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
          Your strength
        </Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>Only you can see this</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
        Tell us a weight you can lift for a few reps. We start new exercises from it, and your logged sets keep it up to
        date.
      </Text>
      {strengthPatterns.map(item => {
        const estimate = strength?.profile.patterns.find(pattern => pattern.pattern === item.id);
        const anchor = strength?.anchors.find(entry => entry.pattern === item.id);
        const expanded = open === item.id;
        return (
          <View key={item.id} style={{ borderBottomWidth: 0.5, borderColor: C.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${item.title}. ${estimate ? `About ${formatKg(estimate.oneRepMaxKg)} kilograms for one rep. ${sourceLine(estimate)}.` : 'Not set.'} ${expanded ? 'Close' : 'Change'}`}
              onPress={() => setOpen(expanded ? null : item.id)}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 8,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ color: C.text, fontSize: 16 }}>{item.title}</Text>
                <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
                  {anchor
                    ? `You: ${formatKg(anchor.weightKg)} kg × ${anchor.reps}`
                    : estimate
                      ? sourceLine(estimate)
                      : 'Add a lift or your body weight to estimate'}
                </Text>
              </View>
              <Text style={{ color: estimate?.source === 'you' || estimate?.source === 'sets' ? C.text : C.muted, fontSize: 16 }}>
                {estimate ? `~${formatKg(estimate.oneRepMaxKg)} kg` : '—'}
              </Text>
              <Text style={{ color: C.muted, fontSize: 20 }}>{expanded ? '⌃' : '›'}</Text>
            </Pressable>
            {expanded ? (
              <AnchorEditor
                pattern={item.id}
                title={item.title}
                initial={anchor ? { weightKg: anchor.weightKg, reps: anchor.reps } : null}
                onDone={() => setOpen(null)}
              />
            ) : null}
          </View>
        );
      })}
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>
        ~ is an estimated one-rep max. First weights are set a little lighter than that allows.
      </Text>
    </View>
  );
}

function AnchorEditor({
  pattern,
  title,
  initial,
  onDone,
}: {
  pattern: StrengthPattern;
  title: string;
  initial: { weightKg: number; reps: number } | null;
  onDone: () => void;
}) {
  const { colors: C } = useTheme();
  const [weight, setWeight] = useState(initial ? formatKg(initial.weightKg) : '');
  const [reps, setReps] = useState(initial ? String(initial.reps) : '5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }
  function save() {
    const weightKg = Number(weight.replace(',', '.'));
    const count = Number(reps);
    if (!(weightKg > 0 && weightKg <= 500)) return setError('Enter a weight from 1 to 500 kg.');
    if (!Number.isInteger(count) || count < 1 || count > 12) return setError('Enter 1 to 12 reps.');
    void run(() => saveAnchor(pattern, weightKg, count));
  }
  const field = { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, color: C.text, fontSize: 16 } as const;
  return (
    <View style={{ gap: 8, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={`${title} weight in kilograms`}
          value={weight}
          onChangeText={setWeight}
          placeholder="kg"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          style={field}
        />
        <Text style={{ color: C.muted, fontSize: 16 }}>×</Text>
        <TextInput
          accessibilityLabel={`${title} reps`}
          value={reps}
          onChangeText={setReps}
          placeholder="reps"
          placeholderTextColor={C.muted}
          keyboardType="number-pad"
          style={field}
        />
      </View>
      {error ? <Text style={{ color: C.danger ?? C.text, fontSize: 13 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Save ${title}`}
          disabled={busy}
          onPress={save}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Save</Text>
        </Pressable>
        {initial ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove your ${title}`}
            disabled={busy}
            onPress={() => void run(() => clearAnchor(pattern))}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: C.muted, fontSize: 16 }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
