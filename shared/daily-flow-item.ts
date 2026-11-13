/**
 * An item Qram can write into a Daily flow. The amount is the dose a position
 * stand states. A row with no source cannot be written in.
 */
import { z } from 'zod';
import { routineCheckpoints, type RoutineCheckpoint } from './routines';

export const helpAreas = ['Strength', 'Muscle size', 'Recovery', 'Sleep', 'Hard efforts'] as const;
export type HelpArea = (typeof helpAreas)[number];

export const dailyFlowItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.string().min(1),
  timing: z.string().min(1),
  checkpoint: z.enum(routineCheckpoints),
  helps: z
    .array(
      z.object({
        purposeId: z.string().min(1),
        areas: z.array(z.enum(helpAreas)).min(1),
      }),
    )
    .min(1),
  source: z.object({
    title: z.string().min(1),
    url: z.string().url(),
  }),
  pickCategory: z.string().min(1).optional(),
});

export type DailyFlowItem = z.infer<typeof dailyFlowItemSchema>;

/** True only when the row has a linked source and the rest of the fields. */
export function itemCanBeWritten(value: unknown) {
  return dailyFlowItemSchema.safeParse(value).success;
}

export function parseDailyFlowItems(value: unknown): DailyFlowItem[] {
  const parsed = z.array(dailyFlowItemSchema).safeParse(value);
  if (!parsed.success) throw new Error('A daily flow item is missing a source or a required field.');
  return parsed.data;
}

export function helpsLine(item: DailyFlowItem, purposeId: string | undefined) {
  const row = purposeId ? item.helps.find(help => help.purposeId === purposeId) : undefined;
  if (!row) return '';
  return `Helps: ${row.areas.join(' · ')}`;
}

export function itemForCheck(items: readonly DailyFlowItem[], id: string, name: string) {
  const clean = name.trim().toLowerCase();
  return items.find(item => item.id === id || item.name.toLowerCase() === clean);
}

export type { RoutineCheckpoint };
