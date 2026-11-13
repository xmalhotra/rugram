import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { catalogTile } from '../../shared/flow-catalog';
import { radius, useTheme } from './design/theme';
import { exerciseIcons } from './exercise-icons';
import { catalogFlowIcons } from '../../shared/catalog-flow-icons';

/** Each tile's single picture: an exercise icon that shows what the tile is about. */
const iconForTile: Record<string, string> = {
  'gym-back': 'wide-grip-lat-pulldown',
  'gym-biceps': 'barbell-curl',
  'gym-chest': 'barbell-bench-press',
  'gym-triceps': 'rope-pushdown',
  'gym-shoulders': 'seated-dumbbell-shoulder-press',
  'gym-legs': 'leg-press',
  'gym-core': 'cable-crunch',
  'gym-arms': 'hammer-curl',
  'gym-supersets': 'mid-width-lat-pulldown',
  'gym-full': 'barbell-back-squat',
  'gym-splits': 'hack-squat',
  'cal-upper': 'push-up',
  'cal-pull': 'pull-up',
  'cal-push': 'push-up',
  'cal-legs': 'sissy-squat',
  'cal-core': 'hanging-leg-raise',
  'cal-skills': 'chest-dip',
  'cal-full': 'mountain-climber',
  'cf-benchmark': 'barbell-overhead-press',
  'cf-amrap': 'kettlebell-swing',
  'cf-emom': 'goblet-squat',
  'cf-fortime': 'front-squat',
  'cf-hero': 'farmer-carry',
  'home-none': 'forearm-plank',
  'home-dumbbells': 'seated-dumbbell-curl',
  'home-bands': 'band-pushdown',
  'home-short': 'step-up',
  'run-5k': 'tile-run-5k',
  'run-10k': 'tile-run-10k',
  'run-half': 'tile-run-half',
  'run-marathon': 'tile-run-marathon',
  'run-ultra': 'tile-run-ultra',
  'run-trail': 'tile-run-trail',
  'end-sprint': 'tile-end-sprint',
  'end-olympic': 'tile-end-olympic',
  'end-half-iron': 'tile-end-half-iron',
  'end-iron': 'tile-end-iron',
  'end-duathlon': 'tile-end-duathlon',
  'end-hyrox': 'tile-end-hyrox',
};

const iconForSection: Record<string, string> = {
  'all-exercises': 'mid-width-cable-row',
  gym: 'wide-grip-lat-pulldown',
  calisthenics: 'pull-up',
  crossfit: 'kettlebell-swing',
  home: 'push-up',
  running: 'tile-run-10k',
  endurance: 'tile-end-hyrox',
};

/** Stands in for a tile until it has a matching photo, so no tile shows the wrong picture. */
function SectionIcon({ sectionId, color, size }: { sectionId?: string; color: string; size: number }) {
  const line = { stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {sectionId === 'running' || sectionId === 'endurance' ? (
        <>
          <Circle cx={15} cy={5} r={2} {...line} />
          <Path d="M6 12l4-3 4 1 2 4 3 1M12 11l-2 5-4 1M13 15l2 6" {...line} />
        </>
      ) : sectionId === 'calisthenics' ? (
        <>
          <Path d="M3 4h18" {...line} />
          <Circle cx={12} cy={9} r={2} {...line} />
          <Path d="M7 4l3 8h4l3-8M10 12v9M14 12v9" {...line} />
        </>
      ) : sectionId === 'crossfit' ? (
        <Path d="M13 2L5 14h6l-1 8 9-13h-6z" {...line} />
      ) : sectionId === 'home' ? (
        <Path d="M3 11l9-8 9 8M6 9v11h12V9M10 20v-6h4v6" {...line} />
      ) : (
        <Path d="M2 12h2M20 12h2M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10" {...line} />
      )}
    </Svg>
  );
}

/** A tile's picture: a checked photo when there is one, otherwise its section's icon. */
export function CatalogCover({
  tileId,
  flowId,
  aspectRatio = 1,
  iconSize = 34,
  square,
}: {
  tileId: string;
  /** A flow's own picture, so flows in one tile don't all look the same. Falls back to the tile's. */
  flowId?: string;
  aspectRatio?: number;
  iconSize?: number;
  /** No rounded corners, for a picture that runs edge to edge. */
  square?: boolean;
}) {
  const { colors: C } = useTheme();
  const own = flowId ? exerciseIcons[catalogFlowIcons[flowId] ?? ''] : undefined;
  const photo = own ?? exerciseIcons[catalogTile(tileId)?.iconKey ?? iconForTile[tileId] ?? ''];
  return (
    <View
      style={{
        width: '100%',
        aspectRatio,
        borderRadius: square ? 0 : radius.control,
        overflow: 'hidden',
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <Image
          source={photo}
          accessible={false}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <SectionIcon sectionId={catalogTile(tileId)?.sectionId} color={C.muted} size={iconSize} />
      )}
    </View>
  );
}

/** A section's single square picture. */
export function CatalogSectionCover({ sectionId }: { sectionId: string }) {
  const { colors: C } = useTheme();
  const photo = exerciseIcons[iconForSection[sectionId]];
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 1,
        borderRadius: radius.control,
        overflow: 'hidden',
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <Image
          source={photo}
          accessible={false}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <SectionIcon sectionId={sectionId} color={C.muted} size={34} />
      )}
    </View>
  );
}
