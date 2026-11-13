/**
 * Items a written Daily flow may contain. Doses are the ranges the linked
 * position stands state. See docs/daily-flow-items.md.
 */
import { parseDailyFlowItems, type DailyFlowItem } from './daily-flow-item';

const rows = [
  {
    id: 'creatine',
    name: 'Creatine',
    amount: '5 g',
    timing: 'Once a day',
    checkpoint: 'Morning',
    helps: [
      { purposeId: 'gain-muscle', areas: ['Strength', 'Muscle size'] },
      { purposeId: 'get-stronger', areas: ['Strength', 'Muscle size'] },
      { purposeId: 'hyrox', areas: ['Strength'] },
    ],
    source: {
      title: 'ISSN position stand: creatine supplementation in exercise, sport, and medicine (Kreider and others, 2017)',
      url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z',
    },
    pickCategory: 'creatine',
  },
  {
    id: 'protein',
    name: 'Protein',
    amount: '20–40 g',
    timing: 'With a meal',
    checkpoint: 'Lunch',
    helps: [
      { purposeId: 'gain-muscle', areas: ['Muscle size', 'Strength'] },
      { purposeId: 'get-stronger', areas: ['Muscle size', 'Strength'] },
      { purposeId: 'visible-abs', areas: ['Muscle size'] },
    ],
    source: {
      title: 'ISSN position stand: protein and exercise (Jäger and others, 2017)',
      url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
    },
    pickCategory: 'protein',
  },
  {
    id: 'beta-alanine',
    name: 'Beta-alanine',
    amount: '4–6 g, split through the day',
    timing: 'Smaller doses across the day',
    checkpoint: 'Morning',
    helps: [{ purposeId: 'hyrox', areas: ['Hard efforts'] }],
    source: {
      title: 'ISSN position stand: beta-alanine (Trexler and others, 2015)',
      url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-015-0090-y',
    },
  },
] as const;

export const dailyFlowItems: DailyFlowItem[] = parseDailyFlowItems(rows);

export function dailyFlowItemById(id: string) {
  return dailyFlowItems.find(item => item.id === id);
}
