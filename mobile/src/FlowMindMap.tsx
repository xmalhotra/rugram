import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export type FlowMindNode = {
  id: string;
  title: string;
  detail: string;
  onPress: () => void;
  onLongPress?: () => void;
  art: React.ReactNode;
  action?: React.ReactNode;
  extra?: React.ReactNode;
  weight?: 'daily' | 'regular' | 'light';
  stale?: boolean;
  streak?: boolean;
};

export type FlowMindBranchView = {
  id: string;
  title: string;
  nodes: FlowMindNode[];
};

/** Vertical mind map. A category heads each branch, and each flow opens on tap. */
export function FlowMindMap({ branches }: { branches: readonly FlowMindBranchView[] }) {
  const { colors: C } = useTheme();
  return (
    <View accessibilityLabel="Your flows by category" style={{ gap: 4 }}>
      {branches.map((branch, index) => (
        <View key={branch.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: C.lime,
                backgroundColor: C.bg,
              }}
            />
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 20, fontWeight: '600' }}>
              {branch.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 18, alignItems: 'center' }}>
              {index < branches.length - 1 || branch.nodes.length > 0 ? (
                <View style={{ width: 2, flex: 1, backgroundColor: C.line }} />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 10, paddingTop: 4, paddingBottom: 16 }}>
              {branch.nodes.map(node => {
                const tile =
                  node.weight === 'daily' ? 64 : node.weight === 'light' ? 40 : node.weight === 'regular' ? 48 : 56;
                return (
                <View key={node.id} style={{ gap: 6, opacity: node.stale ? 0.45 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 16, height: 2, backgroundColor: C.line }} />
                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 76,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        padding: 10,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: C.line,
                        backgroundColor: C.card,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${node.title}`}
                        onPress={node.onPress}
                        onLongPress={node.onLongPress}
                        style={({ pressed }) => ({
                          flex: 1,
                          minWidth: 0,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View
                          accessible={false}
                          style={{
                            width: tile,
                            height: tile,
                            borderRadius: 12,
                            borderWidth: node.streak ? 2 : 0,
                            borderColor: C.lime,
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: C.bg,
                          }}
                        >
                          {node.art}
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <Text
                            numberOfLines={2}
                            style={{ color: C.text, fontSize: 16, lineHeight: 21, fontWeight: '600' }}
                          >
                            {node.title}
                          </Text>
                          <Text numberOfLines={2} style={{ color: C.muted, fontSize: 12 }}>
                            {node.stale ? 'Not opened lately' : node.detail}
                          </Text>
                          {node.streak ? (
                            <Text style={{ color: C.lime, fontSize: 11, fontWeight: '600' }}>3-day streak</Text>
                          ) : null}
                        </View>
                      </Pressable>
                      {node.action}
                    </View>
                  </View>
                  {node.extra}
                </View>
                );
              })}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
