import React from 'react';
import { View } from 'react-native';
import { nutritionIdea, nutritionCollectionForId } from '../../shared/nutrition-ideas';
import { Text } from './design/Text';
import { Button } from './design/components';
import { space, useTheme } from './design/theme';

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
    <View style={{ gap: space.md }}>
      {context && <Text variant="callout" style={{ color: C.muted }}>{context.description}</Text>}
      {[
        ['When it may fit', item.when],
        ['Check suitability', item.caution],
      ].map(([title, body]) => (
        <View key={title} style={{ gap: space.sm }}>
          <Text variant="headline" style={{ color: C.text }}>{title}</Text>
          <Text variant="subhead" style={{ color: C.muted }}>{body}</Text>
        </View>
      ))}
      <Text variant="footnote" style={{ color: C.muted }}>
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
