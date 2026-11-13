import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { TrainingPlan, TrainingSession, TrainingType } from '../../shared/training';
import { Text } from './design/Text';
import { Button, SectionHeader } from './design/components';
import { hit, radius, space, stroke, textRoles, useTheme } from './design/theme';
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
    <View style={{ gap: space.ms }}>
      <SectionHeader title="Training" />
      <View style={{ flexDirection: 'row', gap: space.ms }}>
        {(['type', 'session', 'plan'] as const).map(option => (
          <Pressable key={option} accessibilityRole="button" accessibilityLabel={option} onPress={() => setKind(option)} style={{ minHeight: hit, justifyContent: 'center' }}>
            <Text style={{ color: kind === option ? C.lime : C.text, fontWeight: '600' }}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={{ maxHeight: 240 }}>
        {rows.map(row => (
          <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: hit }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}, ${row.status}`} onPress={() => open(row)} style={{ flex: 1, minHeight: hit, justifyContent: 'center' }}>
              <Text style={{ color: C.text }}>{row.title}</Text>
              <Text variant="footnote" style={{ color: C.muted }}>{row.status}</Text>
            </Pressable>
            <Button
              variant="text"
              size="regular"
              title={row.status === 'live' ? 'Unpublish' : 'Publish'}
              accessibilityLabel={row.status === 'live' ? `Unpublish ${row.title}` : `Publish ${row.title}`}
              onPress={() => void publish(row.id, row.status === 'live' ? 'draft' : 'live')}
            />
          </View>
        ))}
      </ScrollView>
      <Button variant="text" size="regular" title={`New ${kind}`} accessibilityLabel={`New ${kind}`} onPress={() => open(blank[kind])} />
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        accessibilityLabel="Training JSON"
        style={{ minHeight: 180, color: C.text, fontSize: textRoles.footnote.fontSize, borderWidth: stroke.line, borderColor: C.line, borderRadius: radius.small, padding: space.ms }}
      />
      <Button title="Save" accessibilityLabel="Save training JSON" onPress={() => void save()} />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
