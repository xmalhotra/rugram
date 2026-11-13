import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { SectionHeader, Sheet } from './design/components';
import { Disclosure } from './Disclosure';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';

export function VisualFlowInformation({
  card,
  onClose,
  children,
}: {
  card: HabitFlow;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  return (
    <Sheet title="Benefits" navigation="back" onClose={onClose}>
      <View style={{ gap: space.lg, paddingVertical: space.ms }}>
        <SectionHeader title={card.title} />
        {card.visualCard?.benefits.map(benefit => (
          <View key={benefit.title} style={{ gap: space.sm }}>
            <Text variant="headline" style={{ color: C.text }}>{benefit.title}</Text>
            <Text variant="callout" style={{ color: C.muted }}>
              {benefit.description}
            </Text>
          </View>
        ))}
        <Disclosure title="Guide & sources">{children}</Disclosure>
      </View>
    </Sheet>
  );
}
