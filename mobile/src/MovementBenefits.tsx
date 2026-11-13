import React from 'react';
import { View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { movementBenefits } from '../../shared/movement-benefits';
import { SectionHeader, Sheet } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
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
      <View style={{ gap: space.xl, paddingVertical: space.ms }}>
        <SectionHeader title={flow.title} />
        {benefits ? (
          benefits.items.map(item => (
            <View key={item.title} style={{ gap: space.sm }}>
              <Text variant="headline" style={{ color: C.text }}>{item.title}</Text>
              <Text variant="callout" style={{ color: C.muted }}>
                {item.description}
              </Text>
            </View>
          ))
        ) : (
          <Text variant="callout" style={{ color: C.muted }}>
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
