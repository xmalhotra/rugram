import React from 'react';
import { View } from 'react-native';
import { nutritionIdea, nutritionCollectionForId } from '../../shared/nutrition-ideas';
import { Text } from './design/Text';
import { Button } from './design/components';
import { useTheme } from './design/theme';

export function NutritionIdeaNotes({
  cardId,
  sourceFlowId,
  onLink,
}: {
  cardId: string;
  sourceFlowId?: string;
  onLink: (url: string) => void;
}) {
  const item = nutritionIdea(cardId);
  const context = sourceFlowId ? nutritionCollectionForId(sourceFlowId) : undefined;
  const { colors: C } = useTheme();
  if (!item) return null;
  return (
    <View style={{ gap: 16 }}>
      {context && <Text style={{ color: C.muted, lineHeight: 22 }}>{context.description}</Text>}
      {[
        ['When it may fit', item.when],
        ['Check suitability', item.caution],
      ].map(([title, body]) => (
        <View key={title} style={{ gap: 6 }}>
          <Text style={{ color: C.text, fontWeight: '600', fontSize: 17 }}>{title}</Text>
          <Text style={{ color: C.muted, lineHeight: 23, fontSize: 15 }}>{body}</Text>
        </View>
      ))}
      <Text style={{ color: C.muted, fontSize: 13 }}>
        {item.diet} · one option, not a requirement
      </Text>
      {item.sources.map(source => (
        <Button
          key={source.url}
          secondary
          title={`${source.title} ↗`}
          onPress={() => onLink(source.url)}
        />
      ))}
    </View>
  );
}
