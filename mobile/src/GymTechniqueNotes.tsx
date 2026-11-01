import React from 'react';
import { View } from 'react-native';
import { gymTechnique } from '../../shared/gym-techniques';
import { Button } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
    <View style={{ gap: 18 }}>
      {[
        ['When this may help', card.when],
        ['The cue to practise', card.cue],
        ['Know the limit', card.caution],
      ].map(([title, body]) => (
        <View key={title} style={{ gap: 6 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: C.muted, fontSize: 15, lineHeight: 23 }}>{body}</Text>
        </View>
      ))}
      <Text style={{ color: C.muted, fontSize: 13 }}>Equipment: {card.equipment}</Text>
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
