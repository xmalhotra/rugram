import type { Product } from './mobile';
import { formatInr } from './format';

export type BuyingRow = { label: string; values: string[] };

const blob = (product: Product) =>
  [
    product.title,
    product.variantLabel,
    product.summary,
    product.packLabel,
    ...(product.specifications ?? []).map(spec => `${spec.label} ${spec.value}`),
  ]
    .filter(Boolean)
    .join(' ');

function labelled(product: Product, labels: string[]) {
  return product.specifications?.find(spec =>
    labels.some(label => spec.label.toLowerCase() === label.toLowerCase()),
  )?.value;
}

function packGrams(product: Product) {
  const match = blob(product).match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return /kg/i.test(match[2]) ? amount * 1000 : amount;
}

function processLine(product: Product) {
  const text = blob(product);
  if (/creapure/i.test(text))
    return 'Creapure, a named monohydrate process. Same compound as other monohydrate; the premium is that process.';
  if (/ksm-?66/i.test(text))
    return 'KSM-66, a root-only ashwagandha extract. The name is the process.';
  if (/sensoril/i.test(text))
    return 'Sensoril, a root-and-leaf extract with its own withanolide spec.';
  if (/shoden/i.test(text))
    return 'Shoden, a high-withanolide extract. A smaller capsule can still be that process.';
  if (/micronis/i.test(text))
    return 'Micronised monohydrate. Smaller grains, so it mixes. Not a different creatine.';
  if (/glycinate|bisglycinate/i.test(text))
    return 'Magnesium glycinate. You pay for that salt. Then read elemental magnesium, not the capsule weight.';
  if (/magnesium/i.test(text) && /citrate/i.test(text))
    return 'Magnesium citrate. The salt is the process. Read the elemental amount.';
  if (/magnesium/i.test(text) && /oxide/i.test(text))
    return 'Magnesium oxide. Small human comparisons found lower absorption than several other forms. That is not a factory verdict.';
  const form = labelled(product, ['Listed form', 'Listed ingredient type', 'Form', 'Protein source']);
  return form
    ? `${form}. How it was made is not stated on this listing.`
    : 'Process not stated on this listing.';
}

function getting(product: Product) {
  return (
    labelled(product, ['Listed form', 'Listed ingredient type', 'Form', 'Protein source']) ??
    product.variantLabel ??
    product.summary
  );
}

function paying(product: Product) {
  const pack = product.packLabel ? ` · ${product.packLabel}` : '';
  return `${formatInr(product.price)}${pack}`;
}

function moneyBuys(product: Product) {
  const grams = packGrams(product);
  if (!grams)
    return 'Pack price only. The useful amount is not listed, so a cheaper pack can cost more.';
  return `${formatInr((product.price / grams) * 100)} per 100 g of pack`;
}

function trust(product: Product) {
  const text = blob(product);
  if (/creapure|ksm-?66|sensoril|shoden/i.test(text))
    return 'Trust the process name printed on the pack. A current batch certificate is not filed here.';
  if (/informed-sport|nsf certified|usp verified/i.test(text))
    return 'A certificate is named on the listing. Open that certificate. A brand story is not the test.';
  return 'A familiar brand is what most people trust. A brand story is not a test. No batch certificate is recorded here.';
}

/** What buyers can actually check: the thing in the pack, its price, the process, and the missing proof. */
export function buyingComparison(products: Product[]): BuyingRow[] {
  return [
    { label: 'What you are getting', values: products.map(getting) },
    { label: 'What you pay', values: products.map(paying) },
    { label: 'What that money buys', values: products.map(moneyBuys) },
    { label: 'The process', values: products.map(processLine) },
    { label: 'Why trust it', values: products.map(trust) },
  ];
}

export function newcomerDecision(product: Product) {
  const group = product.comparisonGroup ?? '';
  if (group === 'creatine-monohydrate' || /creatine monohydrate/i.test(blob(product)))
    return 'If you are new, buy unflavoured creatine monohydrate. Pay more only when the label names the process, such as Creapure, or a certificate you can open. Skip other creatine forms.';
  if (group === 'magnesium-labels' || /magnesium/i.test(blob(product)))
    return 'If you are new, read the form and the elemental magnesium. Glycinate or citrate is the salt. Skip a bottle that hides both.';
  if (/ashwagandha/i.test(blob(product)) || /ashwagandha/i.test(group))
    return 'If you are new, buy a named root extract such as KSM-66 at that extract’s stated dose. A higher withanolide percent, without the process, is not the same product.';
  return 'If you are new, match the form and the amount you can check. Pay more only for a process or a certificate named on the label.';
}
