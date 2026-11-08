import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export type FlowRadialNode = {
  id: string;
  title: string;
  onPress: () => void;
  weight?: 'daily' | 'regular' | 'light';
  stale?: boolean;
  streak?: boolean;
  action?: React.ReactNode;
};
export type FlowRadialBranch = { id: string; title: string; nodes: readonly FlowRadialNode[] };

/** Two steps: category bubbles, then the flows in the one you tap. */
export function FlowRadialMap({ branches }: { branches: readonly FlowRadialBranch[] }) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(320);
  const [selected, setSelected] = useState<string | null>(null);
  const size = Math.min(Math.max(width, 280), 560);
  const center = size / 2;
  const open = branches.find(branch => branch.id === selected) ?? null;
  return (
    <View
      accessibilityLabel="Map of your flows"
      onLayout={event => {
        const next = Math.round(event.nativeEvent.layout.width);
        setWidth(current => (current === next || next <= 0 ? current : next));
      }}
      style={{ gap: 8 }}
    >
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All categories"
          onPress={() => setSelected(null)}
          style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1, minHeight: 32, justifyContent: 'center' })}
        >
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>← All categories</Text>
        </Pressable>
      ) : null}
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        {open ? (
          <CategoryFlows branch={open} size={size} center={center} />
        ) : (
          <CategoryBubbles branches={branches} size={size} center={center} onSelect={setSelected} />
        )}
      </View>
    </View>
  );
}

function CategoryBubbles({
  branches,
  size,
  center,
  onSelect,
}: {
  branches: readonly FlowRadialBranch[];
  size: number;
  center: number;
  onSelect: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const count = Math.max(branches.length, 1);
  const placed = branches.map((branch, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const radius = bubbleRadius(branch.nodes.length);
    return { branch, radius, ...point(center, angle, size * 0.34) };
  });
  return (
    <>
      <Svg width={size} height={size}>
        {placed.map(item => (
          <Line
            key={`line:${item.branch.id}`}
            x1={center}
            y1={center}
            x2={item.x}
            y2={item.y}
            stroke={C.line}
            strokeWidth={1}
          />
        ))}
      </Svg>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: center - 28, top: center - 12, width: 56, alignItems: 'center' }}
      >
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>You</Text>
      </View>
      {placed.map(item => {
        const label = `${item.branch.title} ${item.branch.nodes.length}`;
        return (
          <Pressable
            key={item.branch.id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelect(item.branch.id)}
            style={({ pressed }) => ({
              position: 'absolute',
              left: item.x - item.radius,
              top: item.y - item.radius,
              width: item.radius * 2,
              height: item.radius * 2,
              borderRadius: item.radius,
              backgroundColor: C.card,
              borderWidth: 2,
              borderColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text numberOfLines={2} style={{ color: C.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
}

function CategoryFlows({
  branch,
  size,
  center,
}: {
  branch: FlowRadialBranch;
  size: number;
  center: number;
}) {
  const { colors: C } = useTheme();
  const count = Math.max(branch.nodes.length, 1);
  const placed = branch.nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const radius = node.weight === 'daily' ? 16 : node.weight === 'light' ? 9 : 12;
    return { node, radius, ...point(center, angle, size * 0.36) };
  });
  const hub = bubbleRadius(branch.nodes.length);
  return (
    <>
      <Svg width={size} height={size}>
        {placed.map(item => (
          <Line
            key={`line:${item.node.id}`}
            x1={center}
            y1={center}
            x2={item.x}
            y2={item.y}
            stroke={C.line}
            strokeWidth={1}
          />
        ))}
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: center - hub,
          top: center - hub,
          width: hub * 2,
          height: hub * 2,
          borderRadius: hub,
          backgroundColor: C.card,
          borderWidth: 2,
          borderColor: C.lime,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
        }}
      >
        <Text numberOfLines={2} style={{ color: C.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
          {branch.title} {branch.nodes.length}
        </Text>
      </View>
      {placed.map(item => {
        const ring = item.node.streak ? 2 : 0;
        const box = Math.max(72, item.radius * 2 + ring * 2 + (item.node.streak ? 4 : 0));
        return (
          <View
            key={item.node.id}
            style={{
              position: 'absolute',
              left: item.x - box / 2,
              top: item.y - box / 2,
              width: box,
              alignItems: 'center',
              opacity: item.node.stale ? 0.45 : 1,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                item.node.stale
                  ? `Open ${item.node.title}, Not opened lately`
                  : item.node.streak
                    ? `Open ${item.node.title}, 3-day streak`
                    : `Open ${item.node.title}`
              }
              onPress={item.node.onPress}
              style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{
                  width: item.radius * 2 + ring * 2,
                  height: item.radius * 2 + ring * 2,
                  borderRadius: item.radius + ring,
                  borderWidth: ring,
                  borderColor: C.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: item.radius * 2,
                    height: item.radius * 2,
                    borderRadius: item.radius,
                    backgroundColor: C.lime,
                  }}
                />
              </View>
              <Text numberOfLines={2} style={{ color: C.muted, fontSize: 10, textAlign: 'center', width: 72 }}>
                {item.node.title}
              </Text>
              {item.node.streak ? (
                <Text style={{ color: C.lime, fontSize: 10, textAlign: 'center' }}>3-day streak</Text>
              ) : null}
            </Pressable>
            {item.node.action}
          </View>
        );
      })}
    </>
  );
}

function bubbleRadius(count: number) {
  return Math.min(54, 26 + count * 4);
}

function point(center: number, angle: number, radius: number) {
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
}
