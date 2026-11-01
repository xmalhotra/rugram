import React from 'react';
import { Image } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import { visualFlowCards } from '../../shared/visual-flows';
import { animalMovementFlowId } from '../../shared/animal-movements';
import { FitnessThumbnail } from './FitnessThumbnail';
import { domainStill } from './morning-stills';
import {
  fitnessCollectionIds,
  fitnessCollectionChildren,
  fitnessMedia,
} from '../../shared/fitness-guides';
export function FlowIllustration({ flow, cover = false }: { flow: HabitFlow; cover?: boolean }) {
  const still = domainStill(flow.id);
  if (still)
    return (
      <Image
        source={still}
        accessible={false}
        resizeMode="cover"
        fadeDuration={0}
        style={{ width: '100%', height: cover ? '100%' : 112 }}
      />
    );
  if (flow.id === animalMovementFlowId) return <FitnessThumbnail id="workout-animal-bear" cover={cover} />;
  if (fitnessMedia[flow.id] || fitnessCollectionIds.includes(flow.id))
    return (
      <FitnessThumbnail
        id={
          fitnessMedia[flow.id]
            ? flow.id
            : ([...(flow.relatedFlowIds ?? []), ...(fitnessCollectionChildren[flow.id] ?? [])].find(
                id => fitnessMedia[id],
              ) ?? '')
        }
        cover={cover}
      />
    );
  return (
    <FitnessThumbnail
      id={flow.id}
      media={flow.visualCard?.media ?? visualFlowCards(flow)[0].visualCard!.media}
      cover={cover}
    />
  );
}
