import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { animalIllustrations, type AnimalIllustration } from '../../shared/animal-movements';
import type { WorkoutGuide } from '../../shared/workout-guides';
import { FocusIllustration } from './FocusIllustration';
import { Text } from './design/Text';
import { radius, space, useTheme } from './design/theme';

// Original schematic starting poses, not copied photos or clinical form analysis.
const poses: Record<AnimalIllustration, { head: [number, number]; body: string; limbs: string }> = {
  'animal-bear': {
    head: [79, 33],
    body: 'M70 43 L38 43',
    limbs: 'M69 44 L75 76 M60 44 L58 74 M38 44 L28 61 L37 75 M45 45 L43 61 L51 75',
  },
  'animal-crab': {
    head: [30, 34],
    body: 'M34 44 L60 56',
    limbs: 'M35 45 L22 73 M42 48 L39 74 M60 56 L75 44 L86 73 M59 57 L65 72 L80 75',
  },
  'animal-ape': {
    head: [52, 25],
    body: 'M49 36 L44 54',
    limbs: 'M49 39 L69 50 L77 74 M48 40 L61 54 L61 75 M44 54 L27 53 L21 74 M44 54 L55 63 L47 76',
  },
  'animal-frog': {
    head: [64, 27],
    body: 'M59 38 L42 51',
    limbs:
      'M59 39 L72 53 L79 75 M55 42 L60 60 L66 75 M42 51 L25 49 L33 71 L22 75 M43 52 L54 62 L45 75',
  },
  'animal-inchworm': {
    head: [77, 44],
    body: 'M69 49 L39 45',
    limbs: 'M68 50 L74 75 M62 49 L60 75 M39 45 L25 74 M44 46 L38 75',
  },
  'animal-bird-dog': {
    head: [74, 34],
    body: 'M67 44 L39 44',
    limbs: 'M65 44 L90 43 M62 45 L63 74 M39 44 L15 42 M43 45 L43 72 L29 74',
  },
};

export function WorkoutGuideIllustration({
  illustration,
  compact = false,
}: {
  illustration: WorkoutGuide['cards'][number]['illustration'];
  compact?: boolean;
}) {
  const { colors: C } = useTheme();
  if (!(animalIllustrations as readonly string[]).includes(illustration))
    return <FocusIllustration focusId={illustration} selected />;
  const pose = poses[illustration as AnimalIllustration];
  const size = compact ? 80 : 152;
  return (
    <View style={{ alignItems: 'center', gap: space.sm }}>
      <View
        accessible={false}
        accessibilityElementsHidden
        style={{ borderRadius: radius.card, backgroundColor: C.illustrationBackdrop }}
      >
        <Svg width={size} height={size} viewBox="0 0 104 96">
          <Path d="M10 80 H94" stroke={C.line} strokeWidth={2} />
          <Path
            d={pose.limbs}
            stroke={C.illustrationAccent}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d={pose.body} stroke={C.lime} strokeWidth={7} strokeLinecap="round" />
          <Circle cx={pose.head[0]} cy={pose.head[1]} r={7} fill={C.text} />
        </Svg>
      </View>
      {!compact && (
        <Text variant="caption" style={{ color: C.muted }}>Position sketch · follow the cues</Text>
      )}
    </View>
  );
}
