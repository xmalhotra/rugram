import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { movementBenefits } from '../../shared/movement-benefits';
import { Sheet } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { isAnimalMovement } from '../../shared/animal-movement-context';
import { AnimalMovementStory } from './AnimalMovementStory';
import { Disclosure } from './Disclosure';

export function MovementBenefits({
  flow,
  onClose,
  onLink,
}: {
  flow: HabitFlow;
  onClose: () => void;
  onLink?: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const benefits = movementBenefits(flow.id);
  return (
    <Sheet title="Benefits" navigation="back" onClose={onClose}>
      <View style={{ gap: 22, paddingVertical: 12 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '600' }}>
          {flow.title}
        </Text>
        {benefits ? (
          benefits.items.map(item => (
            <View key={item.title} style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{item.title}</Text>
              <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
                {item.description}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: C.muted, fontSize: 16 }}>
            Benefits haven’t been added for this movement yet.
          </Text>
        )}
        {isAnimalMovement(flow.id) && onLink && (
          <Disclosure title="Backstory & sources">
            <AnimalMovementStory onLink={onLink} />
          </Disclosure>
        )}
      </View>
    </Sheet>
  );
}
