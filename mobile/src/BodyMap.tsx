import { useId } from 'react';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { bodyMapFigures, bodyMapViewBox } from '../../shared/body-map-paths';
import { muscleAreas, type MuscleArea } from '../../shared/muscle-map';
import { useTheme } from './design/theme';

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
