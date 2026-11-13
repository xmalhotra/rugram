import React from 'react';
import { Pressable, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { FlowIllustration } from './FlowIllustration';
import { Text } from './design/Text';
import { Glyph } from './design/Glyph';
import { opacity, radius, space, stroke, useTheme } from './design/theme';
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
  layout?: 'card' | 'row' | 'tile';
}) {
  const { colors: C } = useTheme();
  const metric =
    flow.sessionGuide?.format ??
    (flow.workout ? `${flow.workout.blocks.length} movements` : `${flow.steps.length} steps`);
  const dim = (pressed: boolean) => (busy ? opacity.disabled : pressed ? opacity.pressed : 1);
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
          gap: space.ms,
          opacity: dim(pressed),
        })}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.small,
            overflow: 'hidden',
            backgroundColor: C.card,
          }}
        >
          <FlowIllustration flow={flow} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
          <Text numberOfLines={1} variant="callout" style={{ color: C.text, fontWeight: '600' }}>
            {flow.title}
          </Text>
          <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
            {metric}
            {added ? ' · Saved' : ''}
          </Text>
        </View>
      </Pressable>
    );
  if (layout === 'tile')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${flow.title}${added ? ', in your Home' : ''}`}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 156,
          opacity: dim(pressed),
        })}
      >
        <View style={{ width: 156, height: 156, borderRadius: radius.small, overflow: 'hidden' }}>
          <FlowIllustration flow={flow} cover />
          {added && (
            <View style={{ position: 'absolute', right: space.xs, top: space.xs }}>
              <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.lime} size={space.ms} />
            </View>
          )}
        </View>
        <Text
          numberOfLines={2}
          variant="subhead"
          style={{ color: C.text, fontWeight: '600', marginTop: space.sm }}
        >
          {flow.title}
        </Text>
        <Text numberOfLines={2} variant="footnote" style={{ color: C.muted }}>
          {metric}
          {added ? ' · Saved' : ''}
        </Text>
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
        padding: space.ms,
        borderRadius: radius.card,
        borderWidth: stroke.line,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: space.sm,
        opacity: dim(pressed),
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
          <View style={{ position: 'absolute', right: space.xs, top: space.xs }}>
            <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.lime} size={space.ms} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={2}
        variant="subhead"
        style={{ color: C.text, fontWeight: '600', minHeight: 42 }}
      >
        {flow.title}
      </Text>
      <Text numberOfLines={1} variant="caption" style={{ color: C.muted }}>
        {flow.sessionGuide?.format ??
          (flow.workout ? `${flow.workout.blocks.length} movements` : `${flow.steps.length} steps`)}
      </Text>
      {flow.sessionGuide?.attribution && (
        <Text numberOfLines={2} variant="caption" style={{ color: C.muted }}>
          {flow.sessionGuide.attribution.label}
        </Text>
      )}
    </Pressable>
  );
}
