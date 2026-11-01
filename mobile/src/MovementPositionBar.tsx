import React from 'react';
import { View } from 'react-native';
import Slider, { type MarkerProps } from '@react-native-community/slider';
import { movementFrame } from '../../shared/movement-viewer';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export type MovementPositionState = { progress: number; phase: number };
export type MovementPositionUpdate = (
  id: string,
  field: keyof MovementPositionState,
  value: number,
) => void;

function MovementFrameMarker({ stepMarked }: MarkerProps) {
  const { colors: C } = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width: stepMarked ? 9 : 5,
        height: stepMarked ? 9 : 5,
        borderRadius: 5,
        backgroundColor: stepMarked ? C.lime : C.muted,
      }}
    />
  );
}

/** One stationary position row shared by a deck; standalone viewers can also use it. */
export function MovementPositionBar({
  progress,
  phase,
  frameCount,
  frameTerm,
  controlMode,
  onProgress,
  onScrub,
  disabled = false,
  accessibilityLabel,
}: MovementPositionState & {
  frameCount: number;
  frameTerm: 'Frame' | 'Pose';
  controlMode: 'tilt' | 'slider';
  onProgress: (value: number) => void;
  onScrub?: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors: C } = useTheme();
  const displayedPhase = Math.min(frameCount - 1, Math.max(0, phase));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 44 }}>
      <Text
        style={{ color: C.muted, fontSize: 13 }}
        accessibilityLabel={`${frameTerm} ${displayedPhase + 1} of ${frameCount}`}
      >
        {frameTerm} {displayedPhase + 1} / {frameCount}
      </Text>
      <View style={{ flex: 1, height: 44, justifyContent: 'center' }}>
        {controlMode === 'slider' && (
          <Slider
            minimumValue={1}
            maximumValue={frameCount}
            step={1}
            value={movementFrame(progress, frameCount) + 1}
            onValueChange={value => onProgress((value - 1) / (frameCount - 1))}
            onSlidingStart={() => onScrub?.(true)}
            onSlidingComplete={() => onScrub?.(false)}
            disabled={disabled}
            tapToSeek
            StepMarker={MovementFrameMarker}
            minimumTrackTintColor={C.lime}
            maximumTrackTintColor={C.line}
            thumbTintColor={C.lime}
            accessibilityLabel={
              accessibilityLabel ?? (frameTerm === 'Frame' ? 'Workflow frame' : 'Movement phase')
            }
            accessibilityValue={{
              min: 1,
              max: frameCount,
              now: displayedPhase + 1,
              text: `${frameTerm} ${displayedPhase + 1} of ${frameCount}`,
            }}
            style={{ height: 44, width: '100%' }}
          />
        )}
        {controlMode === 'tilt' && (
          <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden>
            {Array.from({ length: frameCount }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: index === displayedPhase ? C.lime : C.line,
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
