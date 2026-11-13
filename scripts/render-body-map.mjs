import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { bodyMapFigures, bodyMapViewBox } from '../shared/body-map-paths.ts';
import { muscleAreas } from '../shared/muscle-map.ts';

const target = process.argv[2];
if (!target) {
  console.error('Usage: npx tsx scripts/render-body-map.mjs <output.svg or directory>');
  process.exit(1);
}

const palette = [
  '#E8A0BF',
  '#C27BA0',
  '#6FA8DC',
  '#3D85C8',
  '#1C4587',
  '#E06666',
  '#CC0000',
  '#674EA7',
  '#8E7CC3',
  '#B4A7D6',
  '#F6B26B',
  '#E69138',
  '#F9CB9C',
  '#93C47D',
  '#6AA84F',
  '#38761D',
  '#76A5AF',
  '#A64D79',
  '#D5A6BD',
  '#C45C8A',
  '#FFE599',
  '#F1C232',
  '#BF9000',
  '#B6D7A8',
];

const colourOf = new Map(muscleAreas.map((area, index) => [area.id, palette[index % palette.length]]));

function figureSvg(fillFor) {
  const sides = ['front', 'back'];
  const bodies = sides
    .map(side => {
      const figure = bodyMapFigures[side];
      const regions = figure.regions
        .map(region => {
          const paint = fillFor(region.area);
          return `<path d="${region.d}" fill="${paint.fill}" fill-opacity="${paint.opacity}"/>`;
        })
        .join('');
      return `<g>
        <clipPath id="${side}"><path d="${figure.outline}"/></clipPath>
        <path d="${figure.outline}" fill="#D1D1D6" stroke="#636366" stroke-width="2"/>
        <g clip-path="url(#${side})">${regions}</g>
      </g>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bodyMapViewBox}" width="540" height="892">
  <rect width="100%" height="100%" fill="#F2F2F7"/>
  ${bodies}
</svg>
`;
}

const allRegions = figureSvg(area => ({ fill: colourOf.get(area) ?? '#CCCCCC', opacity: 1 }));
const bench = figureSvg(area => {
  if (area === 'chest') return { fill: '#287B4B', opacity: 1 };
  if (area === 'front-delts' || area === 'triceps') return { fill: '#287B4B', opacity: 0.4 };
  return { fill: '#FFFFFF', opacity: 1 };
});

const resolved = resolve(target);
const svgPath = extname(resolved) === '.svg';
const allPath = svgPath ? resolved : `${resolved.replace(/\/$/, '')}/body-map.svg`;
const highlightPath = svgPath
  ? resolved.replace(/\.svg$/, '-highlight.svg')
  : `${resolved.replace(/\/$/, '')}/body-map-highlight.svg`;
mkdirSync(dirname(allPath), { recursive: true });
mkdirSync(dirname(highlightPath), { recursive: true });
writeFileSync(allPath, allRegions);
writeFileSync(highlightPath, bench);
console.log(allPath);
console.log(highlightPath);
