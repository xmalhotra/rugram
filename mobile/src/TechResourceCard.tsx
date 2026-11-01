import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { TechResource } from '../../shared/tech-resources';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
      contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '600' }}>
          {resource.title}
        </Text>
        <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>{resource.summary}</Text>
      </View>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          paddingHorizontal: 16,
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
                paddingVertical: 14,
                justifyContent: 'center',
                gap: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '500' }}>{link.title}</Text>
              <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{link.detail}</Text>
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
