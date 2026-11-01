import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { curatedFlowProducts } from '../shared/curated-flow-resources';
import { curatedSupplementProducts } from '../shared/curated-supplement-products';
import { supplementShortlists } from '../shared/supplement-shortlists';
import { defaultSupplementDiscovery, topicProducts } from '../shared/supplement-discovery';
import { supplementPickCategories, supplementProductPosition } from '../shared/supplement-picks';
import { browseProducts } from '../shared/pick-catalog';
import { productSchema } from '../src/lib/product-validation';

test('four primary supplement categories resolve five real, photographed and source-linked picks each', () => {
  const catalogue = browseProducts({
    products: curatedFlowProducts,
    flowResources: { products: [], events: [] },
  });
  const categories = supplementPickCategories(defaultSupplementDiscovery);
  assert.equal(curatedSupplementProducts.length, 16);
  for (const shortlist of supplementShortlists) {
    const topic = categories.find(topic => topic.id === shortlist.id)!;
    const products = topicProducts(topic, catalogue, 5);
    assert.deepEqual(
      products.map(product => product.id),
      shortlist.productIds,
    );
    assert.deepEqual(
      products.map((product, index) => supplementProductPosition(product, index).number),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      products.map((product, index) => supplementProductPosition(product, index).medal),
      ['Gold', 'Silver', 'Bronze', undefined, undefined],
    );
    for (const product of products) {
      assert.ok(productSchema.safeParse(product).success, product.id);
      assert.ok(product.imageUrl?.startsWith('https://'));
      assert.ok(product.purchaseOptions?.[0].url.startsWith('https://'));
      if (curatedSupplementProducts.some(item => item.id === product.id))
        assert.ok(product.purchaseOptions?.[0].url.includes('variant='));
      assert.ok(!product.demo);
      assert.ok(product.assessment?.sourceUrls.length);
      assert.equal(product.assessment?.shortlist?.comparedWith.length, 4);
      assert.ok(
        product.assessment!.shortlist!.comparedWith.every(name => !name.startsWith('pick-')),
      );
    }
  }
});

test('collagen means oral nutrition only and plant protein listings are not labelled as whey', () => {
  const collagen = curatedSupplementProducts.filter(product =>
    product.id.startsWith('pick-collagen-'),
  );
  assert.equal(collagen.length, 5);
  for (const product of collagen) {
    assert.match(product.safetyNote!, /not an injectable or research peptide/);
    assert.match(product.safetyNote!, /allergens/);
    assert.doesNotMatch(product.variantLabel!, /injectable|BPC-157|TB-500/i);
  }
  for (const product of curatedSupplementProducts.filter(product =>
    product.id.startsWith('pick-plant-'),
  )) {
    assert.doesNotMatch(product.variantLabel!, /whey/i);
  }
  assert.match(collagen.find(product => product.id === 'pick-collagen-gnc')!.imageUrl!, /200gms/);
});

test('legacy default lists expand, while deliberate editorial lists and empty lists stay intact', () => {
  for (const id of ['protein', 'creatine', 'peptides', 'plant-protein']) {
    const original = supplementPickCategories(defaultSupplementDiscovery).find(
      topic => topic.id === id,
    )!;
    const empty = { ...original, productIds: [] };
    const custom = { ...original, productIds: ['custom-product'] };
    for (const topic of [empty, custom]) {
      const library = { ...defaultSupplementDiscovery, topics: [topic] };
      assert.deepEqual(
        supplementPickCategories(library).find(item => item.id === id)!.productIds,
        topic.productIds,
      );
    }
  }
});

test('moderated products disappear without promoting remaining shortlist medals', () => {
  const topic = supplementPickCategories(defaultSupplementDiscovery).find(
    topic => topic.id === 'peptides',
  )!;
  const products = topicProducts(
    topic,
    curatedFlowProducts.filter(product => product.id !== topic.productIds[0]),
    5,
  );
  assert.equal(products.length, 4);
  assert.deepEqual(supplementProductPosition(products[0], 0), {
    number: 2,
    medal: 'Silver',
    ranked: true,
  });
});

test('API resolves all supplement category resources rather than relying on the first feed page', () => {
  const bootstrap = readFileSync('src/lib/mobile/bootstrap.ts', 'utf8');
  assert.match(bootstrap, /supplementPickCategories\(\s*library.settings.supplementDiscovery/);
  assert.match(bootstrap, /id=ANY\(\$\{supplementIds\}/);
  const info = readFileSync('mobile/src/SupplementPickInformation.tsx', 'utf8');
  assert.match(info, /assessment\.tradeoffs/);
  assert.match(info, /product\.safetyNote/);
  assert.match(info, /assessment\?\.sourceUrls/);
});
