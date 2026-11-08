import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { FlowLeaderboard } from '../../shared/flow-leaderboard';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          Most requested
        </Text>
        <Text style={{ color: C.muted, fontSize: 14 }}>Flows people are asking us to build next</Text>
      </View>
      <View style={{ borderRadius: 14, backgroundColor: C.card, paddingHorizontal: 12 }}>
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
                gap: 12,
                paddingVertical: 10,
                borderTopWidth: index ? 0.5 : 0,
                borderColor: C.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  width: 24,
                  textAlign: 'center',
                  color: flow.rank <= 3 ? C.lime : C.muted,
                  fontSize: 17,
                  fontWeight: '700',
                }}
              >
                {flow.rank}
              </Text>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                  {flow.title}
                </Text>
                {/* How close this flow is to the top one. */}
                <View style={{ height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(6, (flow.count / top) * 100)}%`, height: 4, backgroundColor: C.lime }} />
                </View>
                <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
                  {`${flow.level} · ${people}${flow.requested ? ' · You asked' : ''}`}
                </Text>
              </View>
              {flow.thisWeek ? (
                <Text style={{ color: C.lime, fontSize: 13, fontWeight: '600' }}>{`+${flow.thisWeek} this week`}</Text>
              ) : null}
              <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
            </Pressable>
          );
        })}
      </View>
      {board.flows.length > collapsed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={all ? 'Show the top five' : `Show all ${board.flows.length}`}
          onPress={() => setAll(value => !value)}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>
            {all ? 'Show fewer' : `Show all ${board.flows.length}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
