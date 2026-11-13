import type { Product } from './mobile';
import { pickShortlist } from './pick-comparison';

export type RankContext = {
  /** Products an editor featured in settings. */
  featuredIds?: readonly string[];
  /** An editor's explicit order (e.g. a supplement topic's list); earlier ranks higher. */
  editorialOrder?: readonly string[];
  now?: number;
};
export type RankedProduct = { product: Product; score: number; reasons: string[] };

const day = 86400000;
function median(values: number[]) {
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Scores a product against others in its category. Editorial judgement leads (shortlist rank,
 * explicit order, featured), then evidence (sourced assessment, creator endorsements), then
 * freshness and value for money. Demo and catalogue-only items sink. Never reorders on price alone.
 */
export function productScore(product: Product, peers: Product[], context: RankContext = {}): RankedProduct {
  const now = context.now ?? Date.now();
  let score = 0;
  const reasons: string[] = [];
  const shortlist = pickShortlist(product);
  if (shortlist) {
    score += Math.max(10, 60 - 10 * (shortlist.rank - 1));
    reasons.push(`Editor's #${shortlist.rank} for ${shortlist.group}`);
  }
  const position = context.editorialOrder?.indexOf(product.id) ?? -1;
  if (position >= 0) score += Math.max(0, 30 - 5 * position);
  if (context.featuredIds?.includes(product.id)) {
    score += 15;
    reasons.push('Featured');
  }
  const assessment = product.assessment;
  if (assessment?.whyChosen.trim() && assessment.sourceUrls.length) {
    score += 15 + Math.min(10, 2 * assessment.criteria.length);
    reasons.push('Reviewed with sources');
  }
  const endorsements = product.endorsements?.length ?? 0;
  if (endorsements) {
    score += Math.min(18, 6 * endorsements);
    reasons.push(`Recommended by ${endorsements} creator${endorsements === 1 ? '' : 's'}`);
  }
  const age = (now - Date.parse(product.checkedAt)) / day;
  if (Number.isFinite(age)) {
    if (age <= 90) {
      score += 8;
      reasons.push('Recently checked');
    } else if (age > 365) score -= 15;
  }
  const typical = median(peers.filter(peer => peer.category === product.category).map(peer => peer.price));
  if (typical && product.price > 0) {
    const ratio = product.price / typical;
    score += ratio <= 1 ? 10 * (1 - ratio) : -10 * Math.min(1, ratio - 1);
    if (ratio <= 0.8) reasons.push('Good value for its category');
  }
  if (product.purchaseOptions?.length) score += 4;
  if (product.demo || product.catalogueOnly) score -= 40;
  return { product, score: Math.round(score * 10) / 10, reasons };
}

/** Best first; ties fall back to the lower price, then the title. */
export function rankProducts(products: Product[], context: RankContext = {}): RankedProduct[] {
  return products
    .map(product => productScore(product, products, context))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.price - b.product.price ||
        a.product.title.localeCompare(b.product.title),
    );
}
