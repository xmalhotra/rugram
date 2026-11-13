import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FlowLeaderboard } from '../../shared/flow-leaderboard';
import { Text } from './design/Text';
import { Button, SectionHeader } from './design/components';
import { Glyph } from './design/Glyph';
import { opacity, radius, space, useTheme } from './design/theme';
import { flowLeaderboard } from './flow-interest';

const collapsed = 5;

/**
 * The flows people are asking us to build, most requested first, with this week's pull.
 * Hidden until someone has asked for something. `refreshKey` changes when the viewer requests or un-requests.
 */
export function RequestedFlows({ refreshKey, onOpen }: { refreshKey: string; onOpen: (catalogFlowId: string) => void }) {
  const { colors: C } = useTheme();
  const [board, setBoard] = useState<FlowLeaderboard | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let live = true;
    void flowLeaderboard()
      .then(result => {
        if (live) setBoard(result);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [refreshKey]);
  if (!board?.flows.length) return null;
  const top = board.flows[0].count;
  const shown = all ? board.flows : board.flows.slice(0, collapsed);
  return (
    <View style={{ gap: space.ms }}>
      <SectionHeader title="Most requested" detail="Flows people are asking us to build next" />
      <View style={{ borderRadius: radius.control, backgroundColor: C.card, paddingHorizontal: space.ms }}>
        {shown.map((flow, index) => {
          const people = `${flow.count} request${flow.count === 1 ? '' : 's'}`;
          return (
            <Pressable
              key={flow.catalogFlowId}
              accessibilityRole="button"
              accessibilityLabel={`Number ${flow.rank}, ${flow.title}, ${flow.level}. ${people}${flow.thisWeek ? `, ${flow.thisWeek} this week` : ''}${flow.requested ? '. You asked for this' : ''}.`}
              onPress={() => onOpen(flow.catalogFlowId)}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.ms,
                paddingVertical: space.ms,
                borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                borderColor: C.line,
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <Text
                variant="headline"
                style={{
                  width: 24,
                  textAlign: 'center',
                  color: flow.rank <= 3 ? C.lime : C.muted,
                }}
              >
                {flow.rank}
              </Text>
              <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                <Text numberOfLines={1} variant="callout" style={{ color: C.text, fontWeight: '600' }}>
                  {flow.title}
                </Text>
                {/* How close this flow is to the top one. */}
                <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: C.line, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(6, (flow.count / top) * 100)}%`, height: 4, backgroundColor: C.lime }} />
                </View>
                <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
                  {`${flow.level} · ${people}${flow.requested ? ' · You asked' : ''}`}
                </Text>
              </View>
              {flow.thisWeek ? (
                <Text variant="footnote" style={{ color: C.lime, fontWeight: '600' }}>{`+${flow.thisWeek} this week`}</Text>
              ) : null}
              <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.lg} />
            </Pressable>
          );
        })}
      </View>
      {board.flows.length > collapsed ? (
        <Button
          variant="text"
          size="regular"
          title={all ? 'Show fewer' : `Show all ${board.flows.length}`}
          accessibilityLabel={all ? 'Show the top five' : `Show all ${board.flows.length}`}
          onPress={() => setAll(value => !value)}
        />
      ) : null}
    </View>
  );
}
