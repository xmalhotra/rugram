import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export type FlowMindNode = {
  id: string;
  title: string;
  detail: string;
  onPress: () => void;
  art: React.ReactNode;
  action?: React.ReactNode;
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
              {branch.nodes.map(node => (
                <View key={node.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 16, height: 2, backgroundColor: C.line }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${node.title}`}
                    onPress={node.onPress}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      minHeight: 76,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: C.line,
                      backgroundColor: C.card,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      accessible={false}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
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
                      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
                        {node.detail}
                      </Text>
                    </View>
                    {node.action}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
