import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './design/Text';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import { addedFlows, homeFlowSummary } from '../../shared/home-feed';
import { flowCreationEnabled } from '../../shared/flow-catalog';
import { liveFlowIds } from './catalog-live';
import { Sheet } from './design/components';
import { useTheme } from './design/theme';
import { routineCheckpoints, type RoutineCheckpoint } from '../../shared/routines';
import { FlowIllustration } from './FlowIllustration';
import { FlowMindMap, type FlowMindBranchView } from './FlowMindMap';
import { flowMindMap } from '../../shared/flow-mind-map';
import { flowCategoryGroups } from '../../shared/flow-categories';
import { focusOptions } from '../../shared/focus';
import { resolvePersonalFlow, type PersonalFlow } from '../../shared/personal-flows';
import {
  doneToday,
  flowWeight,
  isStale,
  localDate,
  onStreak,
} from '../../shared/flow-habits';
import {
  dailyCount,
  dailySections,
  dailySlot,
  moveDailyItem,
  removeDailyItem,
  setDailyTimes,
  tickDailyItem,
} from '../../shared/daily-checks';
import { checkpointRoute, emptyRoutineRoute, sectionRoute, type RoutineRoute } from './routine-route';
import { useFlowHabits } from './flow-habits';
import { useDailyChecks } from './daily-checks';
import { usePaneState } from './pane-state';
import { TrainingWeek } from './TrainingWeek';
import { useTrainingRoute } from './training-route';

type YoursMode = 'map' | 'daily';
type RunTarget = { kind: 'flow' | 'personal'; id: string; title: string };

export function useYoursMode() {
  return usePaneState<YoursMode>('yoursMode', 'map', 'account');
}

/** The two sides of Yours, held above the tab bar. */
export function YoursSwitch() {
  const { colors: C } = useTheme();
  const [mode, setMode] = useYoursMode();
  const options: { id: YoursMode; label: string }[] = [
    { id: 'map', label: 'Flow map' },
    { id: 'daily', label: 'Daily' },
  ];
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 92, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          padding: 4,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
        }}
      >
        {options.map(option => {
          const selected = mode === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => setMode(option.id)}
              style={{
                minHeight: 40,
                minWidth: 104,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selected ? C.lime : 'transparent',
              }}
            >
              <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 15, fontWeight: '600' }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StartButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 160 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 56,
          minWidth: 180,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          backgroundColor: C.lime,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Start</Text>
      </Pressable>
    </View>
  );
}

function AddMore({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

function FlowMapTab({
  data,
  onExplore,
  onFlow,
  onPersonalFlow,
  onStart,
}: {
  data: MobilePayload;
  onExplore: () => void;
  onFlow: (flow: HabitFlow) => void;
  onPersonalFlow: (flow: PersonalFlow) => void;
  onStart?: (target: RunTarget) => void;
}) {
  const { colors: C } = useTheme();
  const { habits } = useFlowHabits(data.user?.id);
  const now = Date.now();
  // Only flows live in the new catalog show here; the old library stays out of sight.
  const flows = addedFlows(data).filter(flow => liveFlowIds.has(flow.id));
  const personalFlows = flowCreationEnabled
    ? [...(data.profile.personalFlows ?? [])].reverse()
    : [];
  if (!flows.length && !personalFlows.length) return <StartButton label="Start" onPress={onExplore} />;
  const focuses =
    data.library?.focus ?? focusOptions.map(item => ({ ...item, flowIds: [...item.flowIds] }));
  const groups = flowCategoryGroups(focuses, data.library?.settings.flowCategoryGroups);
  const startAction = (target: RunTarget) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${target.title}`}
      onPress={() => onStart?.(target)}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: C.lime,
      }}
    >
      <Text style={{ color: C.onAccent, fontSize: 14, fontWeight: '700' }}>Start</Text>
    </Pressable>
  );
  const hints = (id: string) => ({
    weight: flowWeight(habits, id, now),
    stale: isStale(habits, id, now),
    streak: onStreak(habits, id, now),
  });
  const branches: FlowMindBranchView[] = [
    ...(personalFlows.length
      ? [
          {
            id: 'yours',
            title: 'Made by you',
            nodes: personalFlows.map(flow => {
              const cover = resolvePersonalFlow(flow, data.flows).cards[0];
              return {
                id: flow.id,
                title: flow.name,
                detail: doneToday(habits, flow.id, now)
                  ? '✓ Done today'
                  : `${flow.cards.length} ${flow.cards.length === 1 ? 'card' : 'cards'}`,
                onPress: () => onPersonalFlow(flow),
                art: cover ? <FlowIllustration flow={cover} /> : null,
                action: startAction({ kind: 'personal', id: flow.id, title: flow.name }),
                ...hints(flow.id),
              };
            }),
          },
        ]
      : []),
    ...flowMindMap(flows, groups, focuses).map(branch => ({
      id: branch.id,
      title: branch.title,
      nodes: branch.flowIds.flatMap(id => {
        const flow = flows.find(item => item.id === id);
        return flow
          ? [
              {
                id: flow.id,
                title: flow.title,
                detail: doneToday(habits, flow.id, now) ? '✓ Done today' : homeFlowSummary(flow),
                onPress: () => onFlow(flow),
                art: <FlowIllustration flow={flow} />,
                action: startAction({ kind: 'flow', id: flow.id, title: flow.title }),
                ...hints(flow.id),
              },
            ]
          : [];
      }),
    })),
  ];
  return (
    <View style={{ gap: 16 }}>
      <FlowMindMap branches={branches} />
      <AddMore label="+ Add flows" onPress={onExplore} />
    </View>
  );
}

function DailyTab({
  userId,
  flows,
  onStartFlow,
}: {
  userId: string | undefined;
  flows: HabitFlow[];
  onStartFlow: (id: string, title: string) => void;
}) {
  const { colors: C } = useTheme();
  const { checks, update } = useDailyChecks(userId);
  const [, setRoute] = usePaneState<RoutineRoute>('routineRoute', emptyRoutineRoute, 'account');
  const [, setTraining] = useTrainingRoute();
  const [, setFlowsTab] = usePaneState<'qram' | 'community'>('flowsTab', 'qram', 'account');
  const [editing, setEditing] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const today = localDate(new Date());
  const openedItem = checks.items.find(item => item.id === opened);
  function openCatalog(next: RoutineRoute) {
    setRoute(next);
    setFlowsTab('qram');
    router.push('/(tabs)/flows');
  }
  const stepper = (label: string, change: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (!openedItem) return;
        update(current => setDailyTimes(current, openedItem.id, openedItem.timesPerDay + change));
      }}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <Text style={{ color: C.text, fontSize: 22 }}>{change > 0 ? '+' : '−'}</Text>
    </Pressable>
  );
  const sections = dailySections(checks.items, editing);
  return (
    <View style={{ gap: 16 }}>
      <TrainingWeek
        flows={flows}
        onStartFlow={onStartFlow}
        onBrowse={() => {
          setTraining({ page: 'plans' });
          setFlowsTab('qram');
          router.push('/(tabs)/flows');
        }}
      />
      {!checks.items.length ? <StartButton label="Start" onPress={() => openCatalog(sectionRoute())} /> : null}
      {checks.items.length ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Done editing' : 'Edit'}
          onPress={() => setEditing(current => !current)}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
        >
          <Text style={{ color: C.lime, fontSize: 16, fontWeight: '600' }}>{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
      </View> : null}
      {sections.map(section => {
        const anytime = section.checkpoint === 'anytime';
        const label = anytime ? 'Anytime' : section.checkpoint;
        return (
          <View key={section.checkpoint} style={{ gap: 4 }}>
            {anytime ? (
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={editing ? `Add to ${label}` : label}
                onPress={() => openCatalog(checkpointRoute(section.checkpoint as RoutineCheckpoint))}
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ flex: 1, color: C.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
                {editing && <Text style={{ color: C.lime, fontSize: 28, fontWeight: '600' }}>+</Text>}
              </Pressable>
            )}
            {section.items.map(item => {
              const count = dailyCount(checks, item.id, today);
              const done = count >= item.timesPerDay;
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderColor: C.line,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, options`}
                    onPress={() => setOpened(item.id)}
                    style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ color: done ? C.muted : C.text, fontSize: 17, fontWeight: '600' }}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${count} of ${item.timesPerDay} today. Tick one more`}
                    onPress={() => update(current => tickDailyItem(current, item.id, today))}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {Array.from({ length: item.timesPerDay }, (_, index) => (
                        <View
                          key={index}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 1.5,
                            borderColor: index < count ? C.lime : C.line,
                            backgroundColor: index < count ? C.lime : 'transparent',
                          }}
                        />
                      ))}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}
      {openedItem && (
        <Sheet title={openedItem.name} presentation="modal" onClose={() => setOpened(null)}>
          <View style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Swap ${openedItem.name}`}
              onPress={() => {
                const slot = dailySlot(openedItem);
                setOpened(null);
                openCatalog(checkpointRoute(slot === 'anytime' ? 'Wake up' : slot, openedItem.id));
              }}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={{ color: C.text, fontSize: 17 }}>Swap</Text>
            </Pressable>
            <Text style={{ color: C.muted, fontSize: 13 }}>Move</Text>
            {routineCheckpoints.map(checkpoint => (
              <Pressable
                key={checkpoint}
                accessibilityRole="button"
                accessibilityLabel={`Move to ${checkpoint}`}
                onPress={() => {
                  update(current => moveDailyItem(current, openedItem.id, checkpoint));
                  setOpened(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: C.text, fontSize: 16 }}>{checkpoint}</Text>
              </Pressable>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>Times a day</Text>
              {stepper('One fewer time a day', -1)}
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>{openedItem.timesPerDay}</Text>
              {stepper('One more time a day', 1)}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${openedItem.name}`}
              onPress={() => {
                update(current => removeDailyItem(current, openedItem.id));
                setOpened(null);
              }}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={{ color: C.muted, fontSize: 17 }}>Remove</Text>
            </Pressable>
          </View>
        </Sheet>
      )}
    </View>
  );
}

/** Yours: your flow map, and your daily check-ins. */
export function HomeFeed({
  data,
  onExplore,
  onFlow,
  onPersonalFlow,
  onStart,
}: {
  data: MobilePayload;
  onExplore: () => void;
  onFlow: (flow: HabitFlow) => void;
  onPersonalFlow: (flow: PersonalFlow) => void;
  onStart?: (target: RunTarget) => void;
}) {
  const [mode] = useYoursMode();
  return (
    // Leaves room for the buttons held above the tab bar.
    <View style={{ paddingBottom: 64 }}>
      {mode === 'daily' ? (
        <DailyTab
          userId={data.user?.id}
          flows={data.flows}
          onStartFlow={(id, title) => onStart?.({ kind: 'flow', id, title })}
        />
      ) : (
        <FlowMapTab
          data={data}
          onExplore={onExplore}
          onFlow={onFlow}
          onPersonalFlow={onPersonalFlow}
          onStart={onStart}
        />
      )}
    </View>
  );
}
