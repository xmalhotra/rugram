import React from 'react';
import { View } from 'react-native';
import { gymTechnique } from '../../shared/gym-techniques';
import { Button } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';

export function GymTechniqueNotes({
  cardId,
  onLink,
}: {
  cardId: string;
  onLink: (url: string) => void;
}) {
  const card = gymTechnique(cardId);
  const { colors: C } = useTheme();
  if (!card) return null;
  return (
    <View style={{ gap: space.md }}>
      {[
        ['When this may help', card.when],
        ['The cue to practise', card.cue],
        ['Know the limit', card.caution],
      ].map(([title, body]) => (
        <View key={title} style={{ gap: space.sm }}>
          <Text variant="headline" style={{ color: C.text }}>{title}</Text>
          <Text variant="subhead" style={{ color: C.muted }}>{body}</Text>
        </View>
      ))}
      <Text variant="footnote" style={{ color: C.muted }}>Equipment: {card.equipment}</Text>
      {card.sources.map(source => (
        <Button
          key={source.url}
          title={`${source.title} ↗`}
          secondary
          onPress={() => onLink(source.url)}
        />
      ))}
    </View>
  );
}
