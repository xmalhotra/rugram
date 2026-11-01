import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { fitnessMedia, type FitnessMedia } from '../../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../../shared/fitness-media-layout';
import type { Demonstrator } from '../../shared/movement-viewer';
import { usePaneState } from './pane-state';
import { fitnessAtlases } from './fitness-media';
import { cindyFrame } from './cindy-frames';
import { poseFrame } from './pose-frames';

export function FitnessThumbnail({
  id,
  media: providedMedia,
  cover = false,
}: {
  id: string;
  media?: FitnessMedia;
  cover?: boolean;
}) {
  const [gender] = usePaneState<Demonstrator>('movementDemonstrator', 'male', 'account');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const media = providedMedia ?? fitnessMedia[id];
  if (!media) return null;
  const posed =
    media.atlas === 'cindy' ? cindyFrame(gender, media.row, 0) : poseFrame(id, gender, 0);
  const crop = fitnessCrop(media, gender, 0.4);
  const atlas = fitnessAtlasLayouts[media.atlas][gender];
  const frameHeight = cover ? height : 112;
  const scale =
    width > 0 && frameHeight > 0
      ? cover
        ? Math.max(width / crop.width, frameHeight / crop.height)
        : Math.min(width / crop.width, frameHeight / crop.height)
      : 0;
  const imageWidth = crop.width * scale;
  const imageHeight = crop.height * scale;
  return (
    <View
      accessible={false}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
        setHeight(event.nativeEvent.layout.height);
      }}
      style={{
        width: '100%',
        height: cover ? '100%' : 112,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: (width - imageWidth) / 2,
          top: (frameHeight - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
          overflow: 'hidden',
          borderRadius: cover ? 0 : 10,
        }}
      >
        <Image
          source={posed ?? fitnessAtlases[media.atlas][gender]}
          resizeMode={posed ? 'cover' : 'stretch'}
          fadeDuration={0}
          style={
            posed
              ? { width: '100%', height: '100%' }
              : {
                  position: 'absolute',
                  width: atlas.width * scale,
                  height: atlas.height * scale,
                  left: -crop.x * scale,
                  top: -crop.y * scale,
                }
          }
        />
      </View>
    </View>
  );
}
