import React from 'react';
import { Pressable, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { FlowIllustration } from './FlowIllustration';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
export function FlowPreview({
  flow,
  added,
  busy = false,
  onPress,
  fill = false,
  layout = 'card',
}: {
  flow: HabitFlow;
  added: boolean;
  busy?: boolean;
  onPress: () => void;
  fill?: boolean;
  layout?: 'card' | 'row';
}) {
  const { colors: C } = useTheme();
  const metric =
    flow.sessionGuide?.format ??
    (flow.workout ? `${flow.workout.blocks.length} movements` : `${flow.steps.length} steps`);
  if (layout === 'row')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${flow.title}${added ? ', in your Home' : ''}`}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: busy ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: C.card,
          }}
        >
          <FlowIllustration flow={flow} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
            {flow.title}
          </Text>
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
            {metric}
            {added ? ' · Saved' : ''}
          </Text>
        </View>
      </Pressable>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${flow.title}${added ? ', in your Home' : ''}`}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        width: fill ? '100%' : 168,
        minHeight: 188,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: 8,
        opacity: busy ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          height: 112,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FlowIllustration flow={flow} />
        {added && (
          <Text style={{ position: 'absolute', right: 4, top: 4, color: C.lime, fontSize: 12 }}>
            ✓
          </Text>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{ color: C.text, fontSize: 15, lineHeight: 21, fontWeight: '600', minHeight: 42 }}
      >
        {flow.title}
      </Text>
      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
        {flow.sessionGuide?.format ??
          (flow.workout ? `${flow.workout.blocks.length} movements` : `${flow.steps.length} steps`)}
      </Text>
      {flow.sessionGuide?.attribution && (
        <Text numberOfLines={2} style={{ color: C.muted, fontSize: 11, lineHeight: 16 }}>
          {flow.sessionGuide.attribution.label}
        </Text>
      )}
    </Pressable>
  );
}
