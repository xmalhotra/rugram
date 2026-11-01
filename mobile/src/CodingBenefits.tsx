import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { codingCard } from '../../shared/coding-flows';
import { Button, Sheet } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
      <View style={{ gap: 20, paddingVertical: 12 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '600' }}>
          {card.title}
        </Text>
        {card.benefits.map(benefit => (
          <View key={benefit.title} style={{ gap: 6 }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{benefit.title}</Text>
            <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
              {benefit.description}
            </Text>
          </View>
        ))}
        {card.action && (
          <Button title={`${card.action.title} ↗`} onPress={() => onLink(card.action!.url)} />
        )}
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16 }}>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>{card.sourceNote}</Text>
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
