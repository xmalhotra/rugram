import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { TrainingPlan, TrainingSession, TrainingType } from '../../shared/training';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { saveTrainingDefinition, setTrainingStatus, trainingManage } from './training-api';

type Kind = 'type' | 'session' | 'plan';

const blank: Record<Kind, unknown> = {
  type: { id: 'new-type', title: 'New type', about: 'Describe what gets recorded.', iconKey: 'mark', blockFields: [{ key: 'amount', label: 'Amount', input: 'number', required: true }], sessionFields: [], canPost: false, usesExerciseRecords: false, status: 'draft' },
  session: { id: 'new-session', typeId: 'new-type', title: 'New session', goal: 'What this session is for.', blocks: [{ id: 'main', sets: 1 }], status: 'draft' },
  plan: { id: 'new-plan', title: 'New plan', goal: 'What this week is for.', weeks: 1, slots: [], status: 'draft' },
};

export function TrainingAdmin() {
  const { colors: C } = useTheme();
  const [types, setTypes] = useState<TrainingType[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [kind, setKind] = useState<Kind>('type');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  function load() {
    trainingManage()
      .then(result => {
        setTypes(result.types);
        setSessions(result.sessions);
        setPlans(result.plans);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
  }
  useEffect(load, []);
  const rows = kind === 'type' ? types : kind === 'session' ? sessions : plans;
  function open(value: unknown) {
    setText(JSON.stringify(value, null, 2));
    setError('');
  }
  async function save() {
    setError('');
    try {
      const value = JSON.parse(text) as unknown;
      await saveTrainingDefinition(kind, value);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Check the JSON and try again.');
    }
  }
  async function publish(id: string, status: 'draft' | 'live') {
    setError('');
    try {
      await setTrainingStatus(kind, id, status);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
        Training
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {(['type', 'session', 'plan'] as const).map(option => (
          <Pressable key={option} accessibilityRole="button" accessibilityLabel={option} onPress={() => setKind(option)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: kind === option ? C.lime : C.text, fontWeight: '700' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={{ maxHeight: 240 }}>
        {rows.map(row => (
          <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}, ${row.status}`} onPress={() => open(row)} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: C.text }}>{row.title}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{row.status}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={row.status === 'live' ? `Unpublish ${row.title}` : `Publish ${row.title}`} onPress={() => void publish(row.id, row.status === 'live' ? 'draft' : 'live')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: C.lime }}>{row.status === 'live' ? 'Unpublish' : 'Publish'}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={`New ${kind}`} onPress={() => open(blank[kind])} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: C.lime, fontWeight: '600' }}>New {kind}</Text>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        accessibilityLabel="Training JSON"
        style={{ minHeight: 180, color: C.text, fontSize: 13, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12 }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Save training JSON" onPress={() => void save()} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: C.lime }}>
        <Text style={{ color: C.onAccent, fontWeight: '700' }}>Save</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
