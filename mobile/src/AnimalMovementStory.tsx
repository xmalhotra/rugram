import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { animalMovementContext } from '../../shared/animal-movement-context';
import { Button, Sheet } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export function AnimalMovementStory({ onLink }: { onLink: (url: string) => void }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: 18, paddingVertical: 12 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 23, fontWeight: '600' }}>
        {animalMovementContext.title}
      </Text>
      <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
        {animalMovementContext.summary}
      </Text>
      {animalMovementContext.connections.map(connection => (
        <View
          key={connection.name}
          style={{
            padding: 16,
            gap: 8,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 18,
          }}
        >
          <Text style={{ color: C.muted, fontSize: 12 }}>{connection.label}</Text>
          <Text
            accessibilityRole="header"
            style={{ color: C.text, fontSize: 19, fontWeight: '600' }}
          >
            {connection.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>{connection.body}</Text>
          <Button
            title={`${connection.source.title} ↗`}
            secondary
            onPress={() => onLink(connection.source.url)}
          />
        </View>
      ))}
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
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
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: inline ? 0 : 8,
          flex: inline ? 1 : undefined,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 12 }}>
          Backstory · Vidyut Jammwal & Da Rulk
        </Text>
        <Text accessible={false} style={{ color: C.text, fontSize: 18 }}>
          ›
        </Text>
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
