import { useId } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { bodyMapFigures, bodyMapViewBox } from '../../shared/body-map-paths';
import type { AreaPicture } from '../../shared/body-flow';
import { jointMarkers, type Joint } from '../../shared/joint-map';
import { muscleAreas, type MuscleArea } from '../../shared/muscle-map';
import { Text } from './design/Text';
import { hit, space, stroke, useTheme, type Colors } from './design/theme';

const view = bodyMapViewBox.split(/[\s,]+/).map(Number);
const viewWidth = view[2] ?? 270;
const viewHeight = view[3] ?? 420;

function titleOf(area: MuscleArea) {
  return muscleAreas.find(item => item.id === area)?.title ?? area;
}

function phrase(areas: MuscleArea[]) {
  const names = areas.map(area => titleOf(area).toLowerCase());
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

export function bodyMapLabel(main: MuscleArea[], helpers: MuscleArea[]) {
  const work = phrase(main);
  const help = phrase(helpers);
  if (!work) return 'Body map';
  if (!help) return `Works ${work}.`;
  return `Works ${work}. Helped by ${help}.`;
}

/** One front figure and one back figure, coloured from muscle areas. */
export function BodyMap({
  main,
  helpers,
  width,
}: {
  main: MuscleArea[];
  helpers: MuscleArea[];
  width: number;
}) {
  const { colors: C } = useTheme();
  const clipBase = useId().replace(/:/g, '');
  const height = (width * viewHeight) / viewWidth;
  const mainSet = new Set(main);
  const helperSet = new Set(helpers);
  const fillFor = (area: MuscleArea) => {
    if (mainSet.has(area)) return { fill: C.lime, fillOpacity: 1 };
    if (helperSet.has(area)) return { fill: C.lime, fillOpacity: 0.4 };
    return { fill: C.muted, fillOpacity: 0.28 };
  };
  return (
    <Svg
      width={width}
      height={height}
      viewBox={bodyMapViewBox}
      accessible
      accessibilityLabel={bodyMapLabel(main, helpers)}
    >
      {(Object.keys(bodyMapFigures) as (keyof typeof bodyMapFigures)[]).map(side => {
        const figure = bodyMapFigures[side];
        const clipId = `${clipBase}-${side}`;
        return (
          <G key={side}>
            <Defs>
              <ClipPath id={clipId}>
                <Path d={figure.outline} />
              </ClipPath>
            </Defs>
            <Path d={figure.outline} fill={C.muted} fillOpacity={0.1} />
            <G clipPath={`url(#${clipId})`}>
              {figure.regions.map(region => (
                <Path key={`${side}-${region.area}`} d={region.d} {...fillFor(region.area)} />
              ))}
            </G>
          </G>
        );
      })}
    </Svg>
  );
}

/** Untouched, then four steps of one hue towards the target band and past it. */
export const bodyShadeNames = ['Not yet', 'Started', 'Building', 'On target', 'Beyond'];

/**
 * Step 0 stays grey so an area nobody has trained cannot be mistaken for a pale lime one:
 * the untouched areas are the whole point of the map.
 */
export function bodyShadeFill(shade: number, C: Colors) {
  if (shade >= 4) return { fill: C.lime, fillOpacity: 1 };
  if (shade === 3) return { fill: C.lime, fillOpacity: 0.72 };
  if (shade === 2) return { fill: C.lime, fillOpacity: 0.46 };
  if (shade === 1) return { fill: C.lime, fillOpacity: 0.24 };
  return { fill: C.muted, fillOpacity: 0.22 };
}

/** Worked deepens in three steps of the brand colour. Missed is the other colour. Quiet stays grey. */
export function pictureFill(state: AreaPicture['state'], step: number, C: Colors) {
  if (state === 'missed') return { fill: C.missed, fillOpacity: 1 };
  if (state === 'worked') {
    if (step >= 3) return { fill: C.lime, fillOpacity: 1 };
    if (step === 2) return { fill: C.lime, fillOpacity: 0.68 };
    return { fill: C.lime, fillOpacity: 0.4 };
  }
  return { fill: C.muted, fillOpacity: 0.22 };
}

function spokenArea(title: string, state: AreaPicture['state']) {
  if (state === 'missed') return `${title}, missed`;
  if (state === 'worked') return `${title}, worked`;
  return `${title}, not worked`;
}

function PictureLegend() {
  const { colors: C } = useTheme();
  const items = [
    { name: 'Worked', ...pictureFill('worked', 3, C) },
    { name: 'Missed', ...pictureFill('missed', 0, C) },
  ];
  return (
    <View
      accessible
      accessibilityLabel="Legend: Worked, Missed."
      importantForAccessibility="yes"
      style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md }}
    >
      {items.map(item => (
        <View key={item.name} importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: stroke.line, borderColor: C.line, overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: item.fill, opacity: item.fillOpacity }} />
          </View>
          <Text variant="footnote" style={{ color: C.muted }}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The Body flow figure: front and back, one colour for worked areas and a second for missed.
 * `outline` draws the predicted figure as a faint mark on areas that are still quiet, so work can fill it in.
 * `width` sizes it. The legend is optional so other screens can leave it off.
 */
export function BodyPicture({
  areas,
  width,
  showLegend = false,
  selected = null,
  onPressArea,
  outline = [],
}: {
  areas: readonly { area: MuscleArea; state: AreaPicture['state']; step: AreaPicture['step'] }[];
  width: number;
  showLegend?: boolean;
  selected?: MuscleArea | null;
  onPressArea?: (area: MuscleArea) => void;
  /** Areas the followed plan would work. Quiet ones stay a faint outline. */
  outline?: readonly MuscleArea[];
}) {
  const { colors: C } = useTheme();
  const clipBase = useId().replace(/:/g, '');
  const height = (width * viewHeight) / viewWidth;
  const byArea = new Map(areas.map(item => [item.area, item]));
  const outlineSet = new Set(outline);
  const announced = new Set<MuscleArea>();
  return (
    <View style={{ alignItems: 'center', gap: space.ms }}>
      <Svg width={width} height={height} viewBox={bodyMapViewBox} accessible={false}>
        {(Object.keys(bodyMapFigures) as (keyof typeof bodyMapFigures)[]).map(side => {
          const figure = bodyMapFigures[side];
          const clipId = `${clipBase}-${side}`;
          return (
            <G key={side}>
              <Defs>
                <ClipPath id={clipId}>
                  <Path d={figure.outline} />
                </ClipPath>
              </Defs>
              <Path d={figure.outline} fill={C.muted} fillOpacity={0.1} stroke={C.line} strokeWidth={0.75} />
              <G clipPath={`url(#${clipId})`}>
                {figure.regions.map(region => {
                  const row = byArea.get(region.area);
                  const state = row?.state ?? 'quiet';
                  const speak = !announced.has(region.area);
                  if (speak) announced.add(region.area);
                  const open = selected === region.area;
                  const ghost = outlineSet.has(region.area) && state === 'quiet';
                  const paint = pictureFill(state, row?.step ?? 0, C);
                  return (
                    <Path
                      key={`${side}-${region.area}`}
                      d={region.d}
                      fill={ghost ? C.lime : paint.fill}
                      fillOpacity={ghost ? 0.14 : paint.fillOpacity}
                      stroke={ghost ? C.lime : open ? C.text : 'none'}
                      strokeOpacity={ghost ? 0.75 : 1}
                      strokeWidth={ghost ? 2.2 : open ? 1.5 : 0}
                      accessible={speak}
                      accessibilityLabel={speak ? (ghost ? `${titleOf(region.area)}, on the plan` : spokenArea(titleOf(region.area), state)) : undefined}
                      onPress={onPressArea ? () => onPressArea(region.area) : undefined}
                    />
                  );
                })}
              </G>
            </G>
          );
        })}
      </Svg>
      {showLegend ? <PictureLegend /> : null}
    </View>
  );
}

/**
 * The same two figures, with every area filled by its own shade instead of main-or-helper.
 * Areas are tappable, and the list beside the map reaches the ones too small to hit.
 */
export function BodyShadeMap({
  shades,
  width,
  selected,
  onPressArea,
  label,
}: {
  shades: Partial<Record<MuscleArea, number>>;
  width: number;
  selected?: MuscleArea | null;
  onPressArea?: (area: MuscleArea) => void;
  label: string;
}) {
  const { colors: C } = useTheme();
  const clipBase = useId().replace(/:/g, '');
  const height = (width * viewHeight) / viewWidth;
  return (
    <Svg width={width} height={height} viewBox={bodyMapViewBox} accessible accessibilityLabel={label}>
      {(Object.keys(bodyMapFigures) as (keyof typeof bodyMapFigures)[]).map(side => {
        const figure = bodyMapFigures[side];
        const clipId = `${clipBase}-${side}`;
        return (
          <G key={side}>
            <Defs>
              <ClipPath id={clipId}>
                <Path d={figure.outline} />
              </ClipPath>
            </Defs>
            <Path d={figure.outline} fill={C.muted} fillOpacity={0.1} stroke={C.line} strokeWidth={0.75} />
            <G clipPath={`url(#${clipId})`}>
              {figure.regions.map(region => (
                <Path
                  key={`${side}-${region.area}`}
                  d={region.d}
                  {...bodyShadeFill(shades[region.area] ?? 0, C)}
                  stroke={selected === region.area ? C.text : 'none'}
                  strokeWidth={selected === region.area ? 1.5 : 0}
                  onPress={onPressArea ? () => onPressArea(region.area) : undefined}
                />
              ))}
            </G>
          </G>
        );
      })}
    </Svg>
  );
}

const markerRadius = 9;

/**
 * The same two figures, every muscle left neutral, with a pressable dot on each joint.
 * Spine is three dots down the back. The list under the map reaches every joint too.
 */
export function BodyJointMap({
  shades,
  width,
  selected,
  onPressJoint,
  labelFor,
}: {
  shades: Partial<Record<Joint, number>>;
  width: number;
  selected?: Joint | null;
  onPressJoint?: (joint: Joint) => void;
  labelFor: (joint: Joint) => string;
}) {
  const { colors: C } = useTheme();
  const clipBase = useId().replace(/:/g, '');
  const height = (width * viewHeight) / viewWidth;
  const scale = width / viewWidth;
  const markers = (['front', 'back'] as const).flatMap(side => jointMarkers[side].map((marker, index) => ({ ...marker, key: `${side}-${index}` })));
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={bodyMapViewBox} pointerEvents="none">
        {(Object.keys(bodyMapFigures) as (keyof typeof bodyMapFigures)[]).map(side => {
          const figure = bodyMapFigures[side];
          const clipId = `${clipBase}-${side}`;
          return (
            <G key={side}>
              <Defs>
                <ClipPath id={clipId}>
                  <Path d={figure.outline} />
                </ClipPath>
              </Defs>
              <Path d={figure.outline} fill={C.muted} fillOpacity={0.1} stroke={C.line} strokeWidth={0.75} />
              <G clipPath={`url(#${clipId})`}>
                {figure.regions.map(region => (
                  <Path key={`${side}-${region.area}`} d={region.d} {...bodyShadeFill(0, C)} />
                ))}
              </G>
            </G>
          );
        })}
        {markers.map(marker => {
          const fill = bodyShadeFill(shades[marker.joint] ?? 0, C);
          const open = selected === marker.joint;
          return (
            <Circle
              key={marker.key}
              cx={marker.x}
              cy={marker.y}
              r={markerRadius}
              fill={fill.fill}
              fillOpacity={fill.fillOpacity}
              stroke={open ? C.text : C.line}
              strokeWidth={open ? 1.75 : 1}
            />
          );
        })}
      </Svg>
      {markers.map(marker => (
        <Pressable
          key={marker.key}
          accessibilityRole="button"
          accessibilityLabel={labelFor(marker.joint)}
          accessibilityState={{ selected: selected === marker.joint }}
          onPress={onPressJoint ? () => onPressJoint(marker.joint) : undefined}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute',
            left: marker.x * scale - hit / 2,
            top: marker.y * scale - hit / 2,
            width: hit,
            height: hit,
          }}
        />
      ))}
    </View>
  );
}
