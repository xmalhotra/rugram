import React from 'react';
import type { HabitFlow } from '../../shared/mobile';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { AnimalMovementDeck } from './AnimalMovementDeck';
import { VisualFlowInformation } from './VisualFlowInformation';
import { Text } from './design/Text';
import { Button } from './design/components';

/** Compatibility entry point: all guides use the same cards-with-frames renderer. */
export function WorkoutGuideDetails({
  flow,
  library = [],
  ...actions
}: {
  flow: HabitFlow;
  library?: HabitFlow[];
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onHome: () => void;
  onRemove: () => void;
  onLink: (url: string) => void;
}) {
  const resolved = resolveVisualFlow(flow, library);
  return (
    <AnimalMovementDeck
      key={flow.id}
      flow={resolved.flow}
      library={resolved.cards}
      {...actions}
      renderInformation={(card, onClose) => (
        <VisualFlowInformation card={card} onClose={onClose}>
          <Text>{flow.guidance ?? flow.description}</Text>
          {flow.sessionGuide?.cards.map(item => (
            <Text key={item.id}>
              {item.title}: {item.body}
            </Text>
          ))}
          {flow.sources?.map(source => (
            <Button
              key={source.url}
              secondary
              title={source.title}
              onPress={() => actions.onLink(source.url)}
            />
          ))}
        </VisualFlowInformation>
      )}
    />
  );
}
