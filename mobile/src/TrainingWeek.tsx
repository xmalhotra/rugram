import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import type { PlanItem } from '../../shared/training';
import { localDate } from '../../shared/flow-habits';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import {
  setTrainingDay,
  skipTraining,
  swapTrainingDays,
  trainingSessions,
  trainingWeek,
  type TrainingSessionSummary,
  type WeekDay,
  type WeekItem,
} from './training-api';
import { useTrainingSessionPane, useTrainingTick } from './training-route';

const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toItems(items: WeekItem[]): PlanItem[] {
  const next: PlanItem[] = [];
  for (const item of items) {
    if (item.kind === 'rest') next.push({ kind: 'rest', label: item.label ?? 'Rest' });
    else if (item.id && (item.kind === 'session' || item.kind === 'flow'))
      next.push(item.optional ? { kind: item.kind, id: item.id, optional: true } : { kind: item.kind, id: item.id });
  }
  return next;
}

export function TrainingWeek({
  flows,
  onStartFlow,
  onBrowse,
}: {
  flows: HabitFlow[];
  onStartFlow: (id: string, title: string) => void;
  onBrowse: () => void;
}) {
  const { colors: C } = useTheme();
  const today = localDate(new Date());
  const [tick, setTick] = useTrainingTick();
  const [, setSession] = useTrainingSessionPane();
  const [week, setWeek] = useState<Awaited<ReturnType<typeof trainingWeek>> | null>(null);
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    trainingWeek(today)
      .then(result => {
        if (live) setWeek(result);
      })
      .catch(() => {
        if (live) setWeek(null);
      });
    return () => {
      live = false;
    };
  }, [today, tick]);
  const day = week?.days.find(item => item.date === selected) ?? week?.days.find(item => item.date === today);
  async function save(next: WeekDay, items: PlanItem[]) {
    setError('');
    try {
      await setTrainingDay({ week: next.week, weekday: next.weekday, items, startDate: today });
      setTick(value => value + 1);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {letters.map((letter, index) => {
          const item = week?.days[index];
          const date = item?.date;
          const on = date === selected;
          return (
            <Pressable
              key={item?.date ?? letter + index}
              accessibilityRole="button"
              accessibilityLabel={`${letter}${item?.status === 'done' ? ', done' : ''}`}
              onPress={() => date && setSelected(date)}
              style={{ alignItems: 'center', gap: 4, minWidth: 36, minHeight: 44, justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? C.lime : 'transparent',
                }}
              >
                <Text style={{ color: on ? C.onAccent : C.text, fontSize: 15, fontWeight: '700' }}>{letter}</Text>
              </View>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item?.status === 'done' ? C.lime : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{selected === today ? 'Today' : 'That day'}</Text>
      {!week?.active ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Plan your week" onPress={onBrowse} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 16 }}>Plan your week</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 8 }}>
          {day?.items.map((item, index) => (
            <View key={`${item.kind}-${item.id ?? item.label}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
              <Text style={{ flex: 1, color: item.status === 'done' ? C.muted : C.text, fontSize: 17, fontWeight: '600' }}>
                {item.status === 'done' ? '✓ ' : ''}
                {item.kind === 'rest' ? item.label ?? 'Rest' : item.title}
              </Text>
              {item.kind === 'session' && item.id && item.status !== 'done' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${item.title}`}
                  onPress={() => setSession({ id: item.id!, date: day.date })}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.lime }}
                >
                  <Text style={{ color: C.onAccent, fontWeight: '700' }}>Start</Text>
                </Pressable>
              ) : null}
              {item.kind === 'flow' && item.id && item.status !== 'done' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${item.title}`}
                  onPress={() => onStartFlow(item.id!, item.title)}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.lime }}
                >
                  <Text style={{ color: C.onAccent, fontWeight: '700' }}>Start</Text>
                </Pressable>
              ) : null}
              {item.kind === 'session' && item.id && item.status === 'open' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Skip ${item.title}`}
                  onPress={() => {
                    void skipTraining(item.id!, day.date)
                      .then(() => setTick(value => value + 1))
                      .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
                  }}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.muted }}>Skip</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {!day?.items.length ? <Text style={{ color: C.muted, fontSize: 16 }}>Nothing planned.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change this day" onPress={() => setEditing(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Change</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Swap this day" onPress={() => setSwapping(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>Swap</Text>
            </Pressable>
          </View>
          {swapping && day ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {week.days.map(other => (
                <Pressable
                  key={other.date}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap with ${letters[other.weekday - 1]}`}
                  onPress={() => {
                    void swapTrainingDays({ weekA: day.week, weekdayA: day.weekday, weekB: other.week, weekdayB: other.weekday })
                      .then(() => {
                        setSwapping(false);
                        setTick(value => value + 1);
                      })
                      .catch(reason => setError(reason instanceof Error ? reason.message : 'Try again.'));
                  }}
                  style={{ minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: C.text, fontWeight: '700' }}>{letters[other.weekday - 1]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 15 }}>
          {error}
        </Text>
      ) : null}
      {editing && day ? (
        <DayEditor
          day={day}
          flows={flows}
          onClose={() => setEditing(false)}
          onSave={items => void save(day, items)}
        />
      ) : null}
    </View>
  );
}

export function DayEditor({
  day,
  flows,
  onClose,
  onSave,
}: {
  day: WeekDay;
  flows: HabitFlow[];
  onClose: () => void;
  onSave: (items: PlanItem[]) => void;
}) {
  const { colors: C } = useTheme();
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<TrainingSessionSummary[]>([]);
  const items = toItems(day.items);
  useEffect(() => {
    let live = true;
    trainingSessions()
      .then(result => {
        if (live) setSessions(result.sessions);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const needle = query.trim().toLowerCase();
  const sessionHits = sessions.filter(session => session.title.toLowerCase().includes(needle)).slice(0, 8);
  const flowHits = flows.filter(flow => flow.title.toLowerCase().includes(needle)).slice(0, 8);
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search sessions and flows"
        placeholderTextColor={C.muted}
        accessibilityLabel="Search sessions and flows"
        style={{ minHeight: 44, color: C.text, fontSize: 16 }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Choose rest" onPress={() => onSave([{ kind: 'rest', label: 'Rest' }])} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontSize: 16 }}>Rest</Text>
      </Pressable>
      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {sessionHits.map(session => (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={session.title}
            onPress={() => onSave([...items.filter(item => item.kind !== 'rest'), { kind: 'session', id: session.id }])}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 16 }}>{session.title}</Text>
          </Pressable>
        ))}
        {flowHits.map(flow => (
          <Pressable
            key={flow.id}
            accessibilityRole="button"
            accessibilityLabel={flow.title}
            onPress={() => onSave([...items.filter(item => item.kind !== 'rest'), { kind: 'flow', id: flow.id }])}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: C.muted, fontSize: 16 }}>{flow.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Close day editor" onPress={onClose} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: C.muted }}>Close</Text>
      </Pressable>
    </View>
  );
}
