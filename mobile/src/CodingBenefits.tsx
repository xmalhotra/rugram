import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { codingCard } from '../../shared/coding-flows';
import { Button, SectionHeader, Sheet } from './design/components';
import { Text } from './design/Text';
import { space, stroke, useTheme } from './design/theme';

export function CodingBenefits({
  flow,
  onClose,
  onLink,
}: {
  flow: HabitFlow;
  onClose: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const card = codingCard(flow.id);
  if (!card) return null;
  return (
    <Sheet title="Benefits" navigation="back" onClose={onClose}>
      <View style={{ gap: space.lg, paddingVertical: space.ms }}>
        <SectionHeader title={card.title} />
        {card.benefits.map(benefit => (
          <View key={benefit.title} style={{ gap: space.sm }}>
            <Text variant="headline" style={{ color: C.text }}>{benefit.title}</Text>
            <Text variant="callout" style={{ color: C.muted }}>
              {benefit.description}
            </Text>
          </View>
        ))}
        {card.action && (
          <Button title={`${card.action.title} ↗`} onPress={() => onLink(card.action!.url)} />
        )}
        <View style={{ gap: space.ms, borderTopWidth: stroke.line, borderTopColor: C.line, paddingTop: space.md }}>
          <Text variant="footnote" style={{ color: C.muted }}>{card.sourceNote}</Text>
          {card.sources.map(source => (
            <Button
              key={source.url}
              title={`${source.title} ↗`}
              secondary
              onPress={() => onLink(source.url)}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}
