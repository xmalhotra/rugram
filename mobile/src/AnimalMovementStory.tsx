import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { animalMovementContext } from '../../shared/animal-movement-context';
import { Button, Sheet } from './design/components';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { hit, opacity, radius, space, stroke, useTheme } from './design/theme';

export function AnimalMovementStory({ onLink }: { onLink: (url: string) => void }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.md, paddingVertical: space.ms }}>
      <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
        {animalMovementContext.title}
      </Text>
      <Text variant="callout" style={{ color: C.muted }}>
        {animalMovementContext.summary}
      </Text>
      {animalMovementContext.connections.map(connection => (
        <View
          key={connection.name}
          style={{
            padding: space.md,
            gap: space.sm,
            backgroundColor: C.card,
            borderWidth: stroke.line,
            borderColor: C.line,
            borderRadius: radius.card,
          }}
        >
          <Text variant="caption" style={{ color: C.muted }}>{connection.label}</Text>
          <Text accessibilityRole="header" variant="section" style={{ color: C.text }}>
            {connection.name}
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>{connection.body}</Text>
          <Button
            title={`${connection.source.title} ↗`}
            secondary
            onPress={() => onLink(connection.source.url)}
          />
        </View>
      ))}
      <Text variant="footnote" style={{ color: C.muted }}>
        {animalMovementContext.boundary}
      </Text>
    </View>
  );
}

/** Compact context entry; the illustrations remain the main content of the flow. */
export function AnimalStoryEntry({
  onLink,
  inline = false,
}: {
  onLink: (url: string) => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { colors: C } = useTheme();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Read the Animal movements backstory and verified sources"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: hit,
          paddingHorizontal: space.ms,
          borderRadius: radius.small,
          borderWidth: stroke.line,
          borderColor: C.line,
          backgroundColor: C.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          marginBottom: inline ? 0 : space.sm,
          flex: inline ? 1 : undefined,
          opacity: pressed ? opacity.pressed : 1,
        })}
      >
        <Text numberOfLines={1} variant="caption" style={{ flex: 1, color: C.muted }}>
          Backstory · Vidyut Jammwal & Da Rulk
        </Text>
        <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.text} size={space.lg} />
      </Pressable>
      {open && (
        <Sheet
          title="Animal movements · Backstory"
          navigation="back"
          onClose={() => setOpen(false)}
        >
          <AnimalMovementStory onLink={onLink} />
        </Sheet>
      )}
    </>
  );
}
