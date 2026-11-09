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

/**
 * The row at the top of the Qram tab. Before anything is set it invites the member to personalise; after,
 * it says what their flows are using. Either way it opens the setup page.
 */
export function PersonaliseRow({ onOpen }: { onOpen: () => void }) {
  const { colors: C } = useTheme();
  const strength = useStrength();
  const lifts = strength?.anchors.length ?? 0;
  const estimated = Boolean(strength?.profile.patterns.length);
  const title = lifts || estimated ? 'Personalised for you' : 'Personalise your flows';
  const detail = lifts
    ? `${lifts} lift${lifts === 1 ? '' : 's'} set. Every flow starts from your numbers.`
    : estimated
      ? 'Starting weights come from your body weight. Add a lift to sharpen them.'
      : 'Tell us one lift you know, and every flow starts at your weights.';
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
  const { colors: C } = useTheme();
  const inset = useRootListInset();
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
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar title="Personalise" onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 128, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
            Make every flow fit you
          </Text>
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
            One lift is enough. Every flow then starts at your weights, and your sets keep them current.
          </Text>
        </View>

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
      </ScrollView>
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
