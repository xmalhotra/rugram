import { movementFrame, type Demonstrator } from './movement-viewer';
import type { FitnessMedia } from './fitness-guides';

/** Measured source-sheet geometry, not assumed equal/square cells. Rendering contains
 * each crop in the same square viewport; these previews are not technique approvals. */
export const fitnessAtlasLayouts = {
  'nutrition-carbs': {
    male: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 275, 555, 834, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 289, 567, 846, 1130, 1402]),
    },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 278, 558, 836, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 315, 589, 857, 1136, 1402]),
    },
  },
  'nutrition-protein': {
    male: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 278, 559, 838, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 317, 604, 877, 1154, 1402]),
    },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 278, 560, 839, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 303, 578, 858, 1132, 1402]),
    },
  },
  'nutrition-drinks': {
    male: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 279, 559, 841, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 283, 563, 843, 1125, 1402]),
    },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 279, 558, 838, 1122],
      columnEdges: Array.from({ length: 4 }, () => [0, 315, 586, 849, 1121, 1402]),
    },
  },
  'flow-gym-support': {
    male: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 231, 521, 799, 1122],
      columnEdges: [
        [0, 282, 562, 840, 1122, 1402],
        [0, 282, 562, 840, 1122, 1402],
        [0, 282, 563, 840, 1122, 1402],
        [0, 282, 563, 840, 1122, 1402],
      ],
    },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 258, 540, 816, 1122],
      columnEdges: [
        [0, 278, 560, 842, 1123, 1402],
        [0, 277, 560, 841, 1123, 1402],
        [0, 277, 560, 841, 1123, 1402],
        [0, 277, 560, 840, 1123, 1402],
      ],
    },
  },
  'flow-gym-focus': {
    male: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 257, 526, 782, 1122],
      columnEdges: [
        [0, 280, 561, 842, 1123, 1402],
        [0, 279, 561, 842, 1123, 1402],
        [0, 279, 561, 842, 1123, 1402],
        [0, 279, 561, 842, 1123, 1402],
      ],
    },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 268, 535, 770, 1122],
      columnEdges: [
        [0, 297, 569, 834, 1105, 1402],
        [0, 297, 568, 834, 1105, 1402],
        [0, 297, 568, 834, 1105, 1402],
        [0, 297, 568, 834, 1105, 1402],
      ],
    },
  },
  'flow-animal-extra': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 280, 560, 826, 1122] },
    female: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 841, 1122] },
  },
  'flow-animal': {
    male: {
      width: 1254,
      height: 1254,
      columns: 5,
      rows: [0, 207, 418, 628, 848, 1254],
      columnEdges: Array.from({ length: 5 }, () => [0, 251, 500, 752, 1002, 1254]),
    },
    female: {
      width: 1254,
      height: 1254,
      columns: 5,
      rows: [0, 229, 447, 673, 898, 1254],
      // Count and measure each row independently; the inchworm really has six poses.
      columnEdges: [
        [0, 252, 502, 752, 1002, 1254],
        [0, 252, 502, 753, 1003, 1254],
        [0, 252, 502, 752, 1002, 1254],
        [0, 252, 502, 752, 1004, 1254],
        [0, 173, 366, 627, 862, 1082, 1254],
      ],
    },
  },
  'flow-sleep': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 282, 558, 839, 1122] },
    female: { width: 1402, height: 1122, columns: 5, rows: [0, 283, 563, 839, 1122] },
  },
  'flow-meals': {
    male: { width: 1145, height: 1374, columns: 5, rows: [0, 229, 458, 675, 887, 1108, 1374] },
    female: { width: 1145, height: 1374, columns: 5, rows: [0, 229, 458, 688, 917, 1143, 1374] },
  },
  'flow-daily': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 277, 542, 811, 1122] },
    female: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 819, 1122] },
  },
  'flow-fitness': {
    male: {
      width: 1060,
      height: 1484,
      columns: 5,
      rows: [0, 190, 378, 557, 756, 938, 1171, 1484],
      columnEdges: Array.from({ length: 7 }, () => [0, 212, 422, 633, 847, 1060]),
    },
    female: {
      width: 1060,
      height: 1484,
      columns: 5,
      rows: [0, 182, 360, 526, 754, 938, 1185, 1484],
      columnEdges: Array.from({ length: 7 }, () => [0, 219, 429, 639, 847, 1060]),
    },
  },
  'flow-supports': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 841, 1122] },
    female: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 841, 1122] },
  },
  'coding-setups': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 560, 823, 1122] },
    female: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 841, 1122] },
  },
  'coding-audio': {
    male: { width: 1619, height: 972, columns: 5, rows: [0, 324, 648, 972] },
    female: { width: 1619, height: 971, columns: 5, rows: [0, 322, 647, 971] },
  },
  'coding-habits': {
    male: { width: 1402, height: 1122, columns: 5, rows: [0, 281, 561, 839, 1122] },
    female: {
      width: 1402,
      height: 1122,
      columns: 5,
      rows: [0, 269, 529, 785, 1122],
      columnEdges: [
        [0, 310, 562, 841, 1118, 1402],
        [0, 310, 562, 841, 1118, 1402],
        [0, 280, 562, 841, 1118, 1402],
        [0, 280, 562, 841, 1118, 1402],
      ],
    },
  },
  supplements: {
    male: {
      width: 992,
      height: 1586,
      columns: 5,
      rows: [0, 188, 376, 564, 756, 950, 1146, 1341, 1586],
    },
    female: {
      width: 992,
      height: 1586,
      columns: 5,
      rows: [0, 197, 396, 595, 794, 992, 1191, 1389, 1586],
    },
  },
  morning: {
    male: {
      width: 992,
      height: 1586,
      columns: 5,
      rows: [0, 198, 396, 594, 793, 991, 1189, 1387, 1586],
    },
    female: {
      width: 992,
      height: 1586,
      columns: 5,
      rows: [0, 198, 396, 594, 793, 991, 1189, 1387, 1586],
    },
  },
  cindy: {
    male: {
      width: 7168,
      height: 3072,
      columns: 7,
      rows: [0, 1024, 2048, 3072],
      columnEdges: Array.from({ length: 3 }, () => [0, 1024, 2048, 3072, 4096, 5120, 6144, 7168]),
    },
    female: {
      width: 7168,
      height: 3072,
      columns: 7,
      rows: [0, 1024, 2048, 3072],
      columnEdges: Array.from({ length: 3 }, () => [0, 1024, 2048, 3072, 4096, 5120, 6144, 7168]),
    },
  },
  running: {
    male: { width: 1374, height: 1145, columns: 6, rows: [0, 217, 439, 660, 880, 1145] },
    female: { width: 1374, height: 1145, columns: 6, rows: [0, 210, 417, 624, 829, 1145] },
  },
  hyrox: {
    male: {
      width: 1086,
      height: 1448,
      columns: 6,
      rows: [0, 193, 365, 541, 717, 881, 1058, 1232, 1448],
    },
    female: {
      width: 1086,
      height: 1448,
      columns: 6,
      rows: [0, 200, 355, 516, 689, 849, 1014, 1200, 1448],
    },
  },
};
/** Rows may contain different numbers of poses within the same sheet. */
export function fitnessFrameCount(media: FitnessMedia, gender: Demonstrator) {
  const layout = fitnessAtlasLayouts[media.atlas][gender];
  const row = Math.max(0, Math.min(layout.rows.length - 2, media.row));
  return ('columnEdges' in layout ? layout.columnEdges[row]?.length - 1 : 0) || layout.columns;
}
export function fitnessCrop(media: FitnessMedia, gender: Demonstrator, progress: number) {
  const layout = fitnessAtlasLayouts[media.atlas][gender];
  const cellWidth = layout.width / layout.columns;
  const row = Math.max(0, Math.min(layout.rows.length - 2, media.row));
  const frame = movementFrame(progress, fitnessFrameCount(media, gender));
  // Keep the full source panel. The square display contains it without stretching.
  const edges = 'columnEdges' in layout ? layout.columnEdges[row] : undefined;
  const left = edges?.[frame] ?? frame * cellWidth;
  const right = edges?.[frame + 1] ?? (frame + 1) * cellWidth;
  const inset = media.atlas.startsWith('flow-gym-') || media.atlas.startsWith('nutrition-') ? 5 : 2;
  return {
    x: left + inset,
    y: layout.rows[row] + inset,
    width: right - left - inset * 2,
    height: layout.rows[row + 1] - layout.rows[row] - inset * 2,
  };
}
