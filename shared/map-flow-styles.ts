/**
 * How a Map flow trains, in plain words. Adding a style is a new object here.
 * Spacing rules are data. `styleProblems` in shared/map-flow.ts checks a pattern
 * against them. Sources are linked in docs/map-flow.md.
 */
import { z } from 'zod';

export const styleSourceSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().url(),
  })
  .strict();

export type StyleSource = z.infer<typeof styleSourceSchema>;

const acsm2009: StyleSource = {
  title: 'ACSM position stand: progression models in resistance training for healthy adults (2009)',
  url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/',
};

const wilson2012: StyleSource = {
  title: 'Wilson and others: concurrent training, a meta-analysis (2012)',
  url: 'https://pubmed.ncbi.nlm.nih.gov/22002517/',
};

const robineau2016: StyleSource = {
  title: 'Robineau and others: recovery between strength and aerobic work (2016)',
  url: 'https://pubmed.ncbi.nlm.nih.gov/25546450/',
};

const nscaSupersets: StyleSource = {
  title: 'NSCA Personal Training Quarterly: rest intervals, supersets and drop sets (2023)',
  url: 'https://www.nsca.com/contentassets/fb8a7be6eb174934bb8844703c4de4cc/ptq-10.1.3-how-to-manipulate-rest-intervals-to-maixmize-strength-training-effectiveness.pdf',
};

const bufferEfforts = ['rest', 'easy', 'upper'] as const;

const ruleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rest-or-easy'), source: styleSourceSchema }).strict(),
  z.object({ kind: z.literal('same-region-gap'), source: styleSourceSchema }).strict(),
  z.object({ kind: z.literal('training-gap'), source: styleSourceSchema }).strict(),
  z.object({ kind: z.literal('paired-sets'), source: styleSourceSchema }).strict(),
  z.object({ kind: z.literal('straight-sets'), source: styleSourceSchema }).strict(),
  z
    .object({
      kind: z.literal('heavy-lower-apart-from-hard-run'),
      buffer: z.array(z.enum(bufferEfforts)).min(1),
      hardRunFlowIds: z.array(z.string().min(1)).min(1),
      source: styleSourceSchema,
      /** A second source for the buffer between the two kinds of work. */
      bufferSource: styleSourceSchema,
    })
    .strict(),
]);

export type SpacingRule = z.infer<typeof ruleSchema>;

const styleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string().min(1),
    rules: z.array(ruleSchema),
  })
  .strict();

export type MapFlowStyle = z.infer<typeof styleSchema>;

const stylesData = [
  {
    id: 'body-part',
    name: 'Single body-part days',
    summary: 'Each training day works one part of the body, with a rest day in the pattern.',
    rules: [
      { kind: 'rest-or-easy', source: acsm2009 },
      { kind: 'same-region-gap', source: acsm2009 },
    ],
  },
  {
    id: 'full-body',
    name: 'Full body',
    summary: 'A training day works the whole body, and the next day is rest or easy.',
    rules: [
      { kind: 'rest-or-easy', source: acsm2009 },
      { kind: 'training-gap', source: acsm2009 },
    ],
  },
  {
    id: 'straight-sets',
    name: 'Straight sets',
    summary: 'One exercise is finished before the next starts, with a rest day in the pattern.',
    rules: [
      { kind: 'rest-or-easy', source: acsm2009 },
      { kind: 'straight-sets', source: acsm2009 },
    ],
  },
  {
    id: 'supersets',
    name: 'Supersets',
    summary: 'Exercises are paired back to back, with a rest day in the pattern.',
    rules: [
      { kind: 'rest-or-easy', source: acsm2009 },
      { kind: 'paired-sets', source: nscaSupersets },
    ],
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    summary: 'Lifting and running share the pattern. Heavy lower-body work sits apart from a hard run.',
    rules: [
      { kind: 'rest-or-easy', source: acsm2009 },
      {
        kind: 'heavy-lower-apart-from-hard-run',
        buffer: ['rest', 'easy', 'upper'],
        hardRunFlowIds: ['running'],
        source: wilson2012,
        bufferSource: robineau2016,
      },
    ],
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics',
    summary: 'Practice on the floor, with a rest day in the pattern.',
    rules: [{ kind: 'rest-or-easy', source: acsm2009 }],
  },
  {
    id: 'member',
    name: 'Your mix',
    summary: 'The Daily flows already on the calendar, kept as they are.',
    rules: [],
  },
] as const;

export const mapFlowStyles: MapFlowStyle[] = stylesData.map(style => styleSchema.parse(style));

export function mapFlowStyleById(id: string) {
  return mapFlowStyles.find(style => style.id === id);
}
