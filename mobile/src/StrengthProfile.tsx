import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { formatKg } from '../../shared/progression';
import { sourceLine, strengthPatterns, workingReps, workingWeight, type StrengthPattern } from '../../shared/strength';
import { Button, SectionHeader } from './design/components';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { hit, opacity, radius, size, space, textRoles, useTheme } from './design/theme';
import { clearAnchor, saveAnchor, useStrength } from './strength';

/**
 * The member's strength on the reference lifts. They can tell us a weight × reps on any of them;
 * the rest are estimated, and logged sets keep everything current. Private to the member.
 */
/** `embedded` drops the heading and intro, for a page that has its own. */
export function StrengthProfile({ embedded = false, onSaved }: { embedded?: boolean; onSaved?: () => void } = {}) {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const [open, setOpen] = useState<StrengthPattern | null>(null);
  return (
    <View style={{ gap: space.sm }}>
      {embedded ? null : (
        <>
          <SectionHeader title="Your strength" detail="Only you can see this" />
          <Text variant="subhead" style={{ color: C.muted }}>
            Tell us a weight you can lift for a few reps. We start new exercises from it, and your logged sets keep it up to
            date.
          </Text>
        </>
      )}
      {strengthPatterns.map(item => {
        const estimate = strength?.profile.patterns.find(pattern => pattern.pattern === item.id);
        const anchor = strength?.anchors.find(entry => entry.pattern === item.id);
        const expanded = open === item.id;
        // Shown the way people think about a lift: what you told us as you told us, otherwise a weight for 8 reps.
        const ownNumbers = anchor && estimate?.source === 'you';
        const shown = ownNumbers
          ? `${formatKg(anchor.weightKg)} kg × ${anchor.reps}`
          : estimate
            ? `~${formatKg(workingWeight(estimate.oneRepMaxKg))} kg × ${workingReps}`
            : '—';
        const under = ownNumbers
          ? 'You told us'
          : anchor && estimate?.source === 'sets'
            ? `Up from your ${formatKg(anchor.weightKg)} kg × ${anchor.reps}: your logged sets`
            : estimate
              ? sourceLine(estimate)
              : 'Add a lift or your body weight to estimate';
        return (
          <View key={item.id} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${item.title}. ${estimate ? `${shown.replace('~', 'about ').replace('×', 'for')} reps. ${under}.` : 'Not set.'} ${expanded ? 'Close' : 'Change'}`}
              onPress={() => setOpen(expanded ? null : item.id)}
              style={({ pressed }) => ({
                minHeight: size.button,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.ms,
                paddingVertical: space.sm,
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                <Text variant="callout" style={{ color: C.text }}>{item.title}</Text>
                <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
                  {under}
                </Text>
              </View>
              <Text variant="callout" style={{ color: estimate?.source === 'you' || estimate?.source === 'sets' ? C.text : C.muted }}>
                {shown}
              </Text>
              {expanded ? (
                <Text variant="section" style={{ color: C.muted }}>⌃</Text>
              ) : (
                <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
              )}
            </Pressable>
            {expanded ? (
              <AnchorEditor
                pattern={item.id}
                title={item.title}
                initial={anchor ? { weightKg: anchor.weightKg, reps: anchor.reps } : null}
                onDone={() => {
                  setOpen(null);
                  onSaved?.();
                }}
              />
            ) : null}
          </View>
        );
      })}
      <Text variant="caption" style={{ color: C.muted }}>
        ~ means our estimate: roughly what you could lift for 8 reps. New exercises start a little lighter than that.
      </Text>
    </View>
  );
}

export function AnchorEditor({
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
  const field = { flex: 1, minHeight: hit, borderWidth: 1, borderColor: C.line, borderRadius: radius.small, paddingHorizontal: space.ms, color: C.text, fontSize: textRoles.callout.fontSize } as const;
  return (
    <View style={{ gap: space.sm, paddingBottom: space.ms }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={`${title} weight in kilograms`}
          value={weight}
          onChangeText={setWeight}
          placeholder="kg"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          style={field}
        />
        <Text variant="callout" style={{ color: C.muted }}>×</Text>
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
      {error ? <Text variant="footnote" style={{ color: C.danger ?? C.text }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Button
          title="Save"
          variant="text"
          size="regular"
          accessibilityLabel={`Save ${title}`}
          disabled={busy}
          onPress={save}
        />
        {initial ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove your ${title}`}
            disabled={busy}
            onPress={() => void run(() => clearAnchor(pattern))}
            style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: busy ? 0.5 : pressed ? opacity.pressed : 1 })}
          >
            <Text variant="callout" style={{ color: C.muted }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
