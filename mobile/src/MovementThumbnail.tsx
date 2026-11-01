import React from 'react';
import { Image, View } from 'react-native';
import { movementCrop } from '../../shared/movement-viewer';
const source = require('../assets/movements/male-v1.jpg'); // eslint-disable-line @typescript-eslint/no-require-imports
export function MovementThumbnail() {
  const crop = movementCrop(0, 0, 'male');
  const scale = 108 / crop.width;
  return (
    <View
      accessible={false}
      style={{ width: 108, height: 80, overflow: 'hidden', borderRadius: 12 }}
    >
      <Image
        source={source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: 1024 * scale,
          height: 1536 * scale,
          left: -crop.x * scale,
          top: -crop.y * scale - 12,
        }}
      />
    </View>
  );
}
