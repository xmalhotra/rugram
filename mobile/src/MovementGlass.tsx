import React, { memo, useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { movementGlass } from '../../shared/movement-glass';

/** Light on the phone's own left or right edge. The host must cover the screen, not the card. */
export const MovementGlass = memo(function MovementGlass({ lean }: { lean: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const finish = movementGlass(lean);
  const side = finish.right > 0 ? 'right' : finish.left > 0 ? 'left' : null;
  const amount = side === 'right' ? finish.right : side === 'left' ? finish.left : 0;
  const [box, setBox] = useState({ width: 0, height: 0 });
  const band = 14 + amount * 22;
  const edge = side === 'right' ? box.width : 0;
  const inward = side === 'right' ? box.width - band : band;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setBox(current =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {side && amount > 0 && box.width > 0 && box.height > 0 && (
        <Svg width={box.width} height={box.height}>
          <Defs>
            <LinearGradient
              id={`${id}-edge`}
              gradientUnits="userSpaceOnUse"
              x1={edge}
              y1="0"
              x2={inward}
              y2="0"
            >
              <Stop offset="0" stopColor="#54F5AA" stopOpacity={0.2 + amount * 0.75} />
              <Stop offset="1" stopColor="#54F5AA" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect
            x={side === 'right' ? box.width - band : 0}
            y={0}
            width={band}
            height={box.height}
            fill={`url(#${id}-edge)`}
          />
        </Svg>
      )}
    </View>
  );
});
