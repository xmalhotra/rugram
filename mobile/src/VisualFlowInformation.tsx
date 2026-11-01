import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { Sheet } from './design/components';
import { Disclosure } from './Disclosure';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
      <View style={{ gap: 20, paddingVertical: 12 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '600' }}>
          {card.title}
        </Text>
        {card.visualCard?.benefits.map(benefit => (
          <View key={benefit.title} style={{ gap: 6 }}>
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 17 }}>{benefit.title}</Text>
            <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
              {benefit.description}
            </Text>
          </View>
        ))}
        <Disclosure title="Guide & sources">{children}</Disclosure>
      </View>
    </Sheet>
  );
}
