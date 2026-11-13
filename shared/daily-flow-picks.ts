/**
 * The pick list for one Daily flow item. Order uses only facts on the product
 * row. A missing fact is said out loud. Nothing in the score is a payment.
 */
import { supplementShortlists } from './supplement-shortlists';

export const pickCriterionLabels = [
  'Tested by a third party',
  'Dose per serving',
  'Price per dose',
  'Sold in India',
] as const;

export const pickPlacement = 'Nothing is paid.';

export type PickCandidate = {
  id: string;
  title: string;
  price: number;
  url: string;
  specifications?: readonly { label: string; value: string }[];
  assessment?: { criteria?: readonly string[]; tradeoffs?: readonly string[] };
};

export type RankedPick = {
  product: PickCandidate;
  score: number;
  /** Shortlist place, used only when the four checks tie. */
  rank: number;
  reasons: string[];
};

export type PickList = {
  criteria: readonly string[];
  paid: false;
  placement: string;
  picks: RankedPick[];
};

function indiaHost(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host.endsWith('.in') || host.startsWith('in.');
  } catch {
    return false;
  }
}

function notes(product: PickCandidate) {
  return [
    ...(product.specifications ?? []).map(row => `${row.label} ${row.value}`),
    ...(product.assessment?.criteria ?? []),
    ...(product.assessment?.tradeoffs ?? []),
  ].join('\n');
}

function checks(product: PickCandidate) {
  const text = notes(product);
  const thirdParty = /third-party|informed-sport|informed sport|\bnsf\b|\bbscg\b/i.test(text);
  const dose = (product.specifications ?? []).some(
    row => /per serving|serving size|dose per/i.test(row.label) && /\d/.test(row.value),
  );
  // Pack price is not a price per dose. That line stays blank until a serving dose is on the row.
  const pricePerDose = false;
  return { thirdParty, dose, pricePerDose, india: indiaHost(product.url) };
}

function reasonsFor(product: PickCandidate, fact: ReturnType<typeof checks>) {
  const pack =
    product.price > 0 ? `Pack price on the listing: ₹${product.price.toLocaleString('en-IN')}.` : '';
  return [
    fact.thirdParty
      ? 'Tested by a third party: recorded on this listing.'
      : 'Tested by a third party: not recorded on this listing.',
    fact.dose
      ? 'Dose per serving: recorded on this listing.'
      : 'Dose per serving: not recorded on this listing.',
    fact.pricePerDose
      ? 'Price per dose: recorded on this listing.'
      : `Price per dose: not recorded. ${pack}`.trim(),
    fact.india
      ? 'Sold in India: the shop address is an India site.'
      : 'Sold in India: not recorded on this listing.',
    pickPlacement,
  ];
}

/** Ranked brands for this item's category. Unknown products are left out. */
export function picksForItem(
  item: { pickCategory?: string },
  products: readonly PickCandidate[],
): RankedPick[] {
  if (!item.pickCategory) return [];
  const shortlist = supplementShortlists.find(group => group.id === item.pickCategory);
  if (!shortlist) return [];
  const byId = new Map(products.map(product => [product.id, product]));
  const rows = shortlist.productIds.flatMap((id, index) => {
    const product = byId.get(id);
    if (!product) return [];
    const fact = checks(product);
    const score = Number(fact.thirdParty) + Number(fact.dose) + Number(fact.pricePerDose) + Number(fact.india);
    return [{ product, score, rank: index + 1, reasons: reasonsFor(product, fact) }];
  });
  rows.sort(
    (a, b) => b.score - a.score || a.rank - b.rank || a.product.title.localeCompare(b.product.title),
  );
  return rows;
}

export function pickList(item: { pickCategory?: string }, products: readonly PickCandidate[]): PickList {
  return {
    criteria: pickCriterionLabels,
    paid: false,
    placement: pickPlacement,
    picks: picksForItem(item, products),
  };
}

/** The brand the member already saved or bought, when it is on this item's list. */
export function pickOnItem(
  item: { pickCategory?: string },
  products: readonly PickCandidate[],
  savedIds: readonly string[],
  boughtIds: readonly string[] = [],
): { id: string; title: string; how: 'saved' | 'bought' } | null {
  const picks = picksForItem(item, products);
  const bought = picks.find(row => boughtIds.includes(row.product.id));
  if (bought) return { id: bought.product.id, title: bought.product.title, how: 'bought' };
  const saved = picks.find(row => savedIds.includes(row.product.id));
  if (saved) return { id: saved.product.id, title: saved.product.title, how: 'saved' };
  return null;
}
