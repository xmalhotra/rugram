import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { TechResource } from '../../shared/tech-resources';
import { Text } from './design/Text';
import { opacity, radius, space, useTheme } from './design/theme';
import { FlowHomeAction } from './FlowHomeAction';

/** A tech card is a set of sources. It has no generated person and no pose frames. */
export function TechResourceCard({
  resource,
  added,
  busy,
  onAdd,
  onHome,
  onRemove,
  onLink,
}: {
  resource: TechResource;
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onHome: () => void;
  onRemove: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: space.sm }}>
        <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
          {resource.title}
        </Text>
        <Text variant="callout" style={{ color: C.muted }}>{resource.summary}</Text>
      </View>
      <View
        style={{
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          paddingHorizontal: space.md,
        }}
      >
        {resource.links.map((link, index) => (
          <View key={link.url}>
            {index > 0 && <View style={{ height: 1, backgroundColor: C.line }} />}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${link.title}`}
              onPress={() => onLink(link.url)}
              style={({ pressed }) => ({
                minHeight: 72,
                paddingVertical: space.md,
                justifyContent: 'center',
                gap: space.xs,
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <Text variant="callout" style={{ color: C.text }}>{link.title}</Text>
              <Text variant="subhead" style={{ color: C.muted }}>{link.detail}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <FlowHomeAction
        added={added}
        busy={busy}
        onAdd={onAdd}
        onHome={onHome}
        onRemove={onRemove}
      />
    </ScrollView>
  );
}
