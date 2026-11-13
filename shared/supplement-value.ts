import type { Product } from './mobile';

/** Grams in a recorded pack label ("250 g", "1 kg", "907 g · 2 lb"); null for counts like "25 servings". */
export function packGrams(product: Pick<Product, 'packLabel'>) {
  const match = /(\d+(?:\.\d+)?)\s*(kg|g)\b/i.exec(product.packLabel ?? '');
  if (!match) return null;
  return Number(match[1]) * (match[2].toLowerCase() === 'kg' ? 1000 : 1);
}

/** Listed price per 100 g, the only like-for-like value measure every powder pack gives us. */
export function pricePer100g(product: Pick<Product, 'packLabel' | 'price'>) {
  const grams = packGrams(product);
  return grams && product.price > 0 ? (product.price / grams) * 100 : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export type ValueEntry = {
  id: string;
  title: string;
  per100g: number;
  /** Percent against the group's middle price: negative is cheaper. */
  againstTypical: number;
};

/** Cheapest first. Products with no gram pack are left out rather than guessed. */
export function valueEntries(products: readonly Product[]): ValueEntry[] {
  const priced = products.flatMap(product => {
    const per100g = pricePer100g(product);
    return per100g ? [{ product, per100g }] : [];
  });
  if (priced.length < 2) return [];
  const typical = median(priced.map(item => item.per100g));
  return priced
    .map(({ product, per100g }) => ({
      id: product.id,
      title: product.title,
      per100g,
      againstTypical: Math.round((per100g / typical - 1) * 100),
    }))
    .sort((a, b) => a.per100g - b.per100g);
}

export function againstTypicalLabel(percent: number) {
  if (percent === 0) return 'Typical price';
  return `${Math.abs(percent)}% ${percent < 0 ? 'below' : 'above'} typical`;
}
