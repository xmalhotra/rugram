import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import {
  addedFlows,
  buildStoryGroups,
  homeFlowSummary,
  storyGroupSeen,
  type StoryGroup,
} from '../../shared/home-feed';
import { Card } from './design/components';
import { useTheme } from './design/theme';
import { FlowIllustration } from './FlowIllustration';
import { FlowHeartAction } from './FlowHeartAction';
import { FlowMindMap, type FlowMindBranchView } from './FlowMindMap';
import { flowMindMap } from '../../shared/flow-mind-map';
import { flowCategoryGroups } from '../../shared/flow-categories';
import { focusOptions } from '../../shared/focus';
import { resolvePersonalFlow, type PersonalFlow } from '../../shared/personal-flows';

export function HomeFeed({
  data,
  busy = false,
  onExplore,
  onFlow,
  onStory,
  onRemove,
  onPersonalFlow,
}: {
  data: MobilePayload;
  busy?: boolean;
  onExplore: () => void;
  onFlow: (flow: HabitFlow) => void;
  onStory: (group: StoryGroup) => void;
  onRemove: (flow: HabitFlow) => void;
  onPersonalFlow: (flow: PersonalFlow) => void;
}) {
  const { colors: C } = useTheme();
  const [limit, setLimit] = useState(10);
  const flows = addedFlows(data);
  const stories = buildStoryGroups(data);
  const personalFlows = [...(data.profile.personalFlows ?? [])].reverse();
  const shown = flows.slice(0, limit);
  const focuses =
    data.library?.focus ?? focusOptions.map(item => ({ ...item, flowIds: [...item.flowIds] }));
  const catalogue = flowMindMap(
    shown,
    flowCategoryGroups(focuses, data.library?.settings.flowCategoryGroups),
    focuses,
  );
  const branches: FlowMindBranchView[] = [
    ...(personalFlows.length
      ? [
          {
            id: 'yours',
            title: 'Made by you',
            nodes: personalFlows.map(flow => {
              const resolved = resolvePersonalFlow(flow, data.flows);
              const cover = resolved.cards[0];
              return {
                id: flow.id,
                title: flow.name,
                detail: `${flow.cards.length} ${flow.cards.length === 1 ? 'card' : 'cards'}`,
                onPress: () => onPersonalFlow(flow),
                art: cover ? (
                  <FlowIllustration flow={cover} />
                ) : (
                  <Text style={{ color: C.muted, fontSize: 22 }}>＋</Text>
                ),
              };
            }),
          },
        ]
      : []),
    ...catalogue.map(branch => ({
      id: branch.id,
      title: branch.title,
      nodes: branch.flowIds.flatMap(id => {
        const flow = shown.find(item => item.id === id);
        if (!flow) return [];
        return [
          {
            id: flow.id,
            title: flow.title,
            detail: homeFlowSummary(flow),
            onPress: () => onFlow(flow),
            art: <FlowIllustration flow={flow} />,
            action: (
              <FlowHeartAction
                added
                busy={busy}
                label={`Remove ${flow.title} from Home`}
                onToggle={() => onRemove(flow)}
              />
            ),
          },
        ];
      }),
    })),
  ];
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            accessibilityRole="header"
            style={{ color: C.text, fontSize: 25, fontWeight: '600' }}
          >
            Your flows
          </Text>
          <Text style={{ color: C.muted, fontSize: 13 }} accessibilityLiveRegion="polite">
            {flows.length + personalFlows.length === 0
              ? 'Your collection starts here'
              : `${flows.length + personalFlows.length} flows · latest first`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Flows"
          onPress={onExplore}
          style={({ pressed }) => ({
            minHeight: 48,
            paddingHorizontal: 14,
            justifyContent: 'center',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '500' }}>Open Flows</Text>
        </Pressable>
      </View>
      {!flows.length && !personalFlows.length && (
        <Card>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>No flows added yet</Text>
          <Text style={{ color: C.muted, lineHeight: 22 }}>
            The current guides are on the Flows tab. Add one there, and it will show up here.
          </Text>
        </Card>
      )}
      {branches.length > 0 && <FlowMindMap branches={branches} />}
      {flows.length > limit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show more flows"
          onPress={() => setLimit(previous => previous + 10)}
          style={({ pressed }) => ({
            minHeight: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.line,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: C.text, fontSize: 14 }}>Show more flows</Text>
        </Pressable>
      )}
      {stories.length > 0 && (
        <View style={{ gap: 12, paddingTop: 8 }}>
          <Text
            accessibilityRole="header"
            style={{ color: C.text, fontSize: 17, fontWeight: '600' }}
          >
            From your flows
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityLabel="Stories from your flows"
            contentContainerStyle={{ gap: 14, paddingVertical: 4 }}
          >
            {stories.map(group => {
              const flow = data.flows.find(item => item.id === group.id);
              return (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${flow?.title ?? group.title}: ${group.cards.length} curated story cards`}
                  onPress={() => onStory(group)}
                  style={{ width: 84, alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      borderWidth: storyGroupSeen(group, data.profile.storyReads) ? 1 : 2,
                      borderColor: C.line,
                      padding: 4,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 32,
                        overflow: 'hidden',
                        backgroundColor: C.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {group.cards[0]?.imageUrl ? (
                        <Image
                          source={{ uri: group.cards[0].imageUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : flow ? (
                        <FlowIllustration flow={flow} />
                      ) : (
                        <Text style={{ color: C.text, fontSize: 22 }}>{group.initials}</Text>
                      )}
                    </View>
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}
                  >
                    {flow?.title ?? group.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
