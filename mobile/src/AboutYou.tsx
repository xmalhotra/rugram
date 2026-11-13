import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { Lifestyle, UserMetrics } from '../../shared/flow-benchmarks';
import { Button } from './design/components';
import { Text } from './design/Text';
import { hit, radius, space, textRoles, useTheme } from './design/theme';
import { saveFlowMetrics } from './flow-runs';

export const lifestyles: { id: Lifestyle; label: string }[] = [
  { id: 'sedentary', label: 'Mostly sitting' },
  { id: 'light', label: 'Lightly active' },
  { id: 'active', label: 'Active' },
  { id: 'athlete', label: 'Athlete' },
];

export function AboutYouForm({
  initial,
  onSaved,
}: {
  initial: UserMetrics | null;
  onSaved: (metrics: UserMetrics) => void;
}) {
  const { colors: C } = useTheme();
  const [lifestyle, setLifestyle] = useState<Lifestyle>(initial?.lifestyle ?? 'active');
  const [birthYear, setBirthYear] = useState(initial ? String(initial.birthYear) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    const year = Number(birthYear);
    const weightKg = Number(weight);
    const age = new Date().getFullYear() - year;
    if (!Number.isInteger(year) || age < 13 || age > 100) {
      setError('Enter a birth year that makes you 13 to 100.');
      return;
    }
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
      setError('Enter a weight from 20 to 300 kg.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await saveFlowMetrics({ birthYear: year, weightKg, lifestyle });
      onSaved(saved.metrics);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.md }}>
      <Text variant="subhead" style={{ color: C.muted }}>
        We use this to set your starting targets. It isn&apos;t medical advice. You can change or delete it in your
        profile.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {lifestyles.map(option => {
          const selected = option.id === lifestyle;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => setLifestyle(option.id)}
              style={{
                minHeight: hit,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                justifyContent: 'center',
                backgroundColor: selected ? C.lime : C.card,
                borderWidth: 1,
                borderColor: selected ? C.lime : C.line,
              }}
            >
              <Text style={{ color: selected ? C.onAccent : C.text, fontWeight: '600' }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="footnote" style={{ color: C.muted }}>Birth year</Text>
      <TextInput
        accessibilityLabel="Birth year"
        value={birthYear}
        onChangeText={setBirthYear}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="1990"
        placeholderTextColor={C.muted}
        style={{
          minHeight: hit,
          borderRadius: radius.small,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          color: C.text,
          paddingHorizontal: space.md,
          fontSize: textRoles.body.fontSize,
        }}
      />
      <Text variant="footnote" style={{ color: C.muted }}>Weight in kg</Text>
      <TextInput
        accessibilityLabel="Weight in kilograms"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        maxLength={5}
        placeholder="70"
        placeholderTextColor={C.muted}
        style={{
          minHeight: hit,
          borderRadius: radius.small,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          color: C.text,
          paddingHorizontal: space.md,
          fontSize: textRoles.body.fontSize,
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
          {error}
        </Text>
      )}
      <Button
        title={busy ? 'Saving…' : 'Save'}
        accessibilityLabel="Save your details"
        disabled={busy}
        onPress={() => void save()}
      />
    </View>
  );
}
