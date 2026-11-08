import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { curatedFlowProducts } from '../shared/curated-flow-resources';
import { curatedEverydayProducts } from '../shared/curated-everyday-products';
import { productSchema } from '../src/lib/product-validation';
import { pickCategories, techCategories, budgetProducts } from '../shared/mobile';
import { defaultSupplementDiscovery, topicProducts } from '../shared/supplement-discovery';
import { browseProducts } from '../shared/pick-catalog';
import { alternativePicks } from '../shared/pick-comparison';
test('every Picks category has real, published, photographed products with valid purchase records', () => {
  assert.equal(
    new Set(curatedFlowProducts.map(product => product.id)).size,
    curatedFlowProducts.length,
  );
  for (const category of pickCategories) {
    const products = budgetProducts(curatedFlowProducts, category, 'All', Infinity);
    assert.ok(products.length > 0, category);
    for (const product of products) {
      assert.equal(product.demo === true, false);
      assert.ok(product.imageUrl?.startsWith('https://'));
      assert.equal(productSchema.safeParse(product).success, true, product.id);
      assert.ok(product.purchaseOptions?.length);
    }
  }
  for (const category of techCategories)
    assert.ok(
      curatedEverydayProducts.some(product => product.subcategory === category),
      category,
    );
});
test('each supplement topic resolves actual products rather than an empty promise', () => {
  for (const topic of defaultSupplementDiscovery.topics) {
    const products = topicProducts(topic, curatedFlowProducts);
    assert.ok(products.length > 0, topic.id);
    assert.ok(products.every(product => product.imageUrl));
  }
});
test('browse merges linked products and feed records once, honours moderation and hides demos', () => {
  const [first, second] = curatedEverydayProducts;
  assert.deepEqual(
    browseProducts({
      products: [first, { ...second, status: 'archived' }, { ...first, id: 'demo', demo: true }],
      flowResources: { products: [first, second], events: [] },
    }).map(product => product.id),
    [first.id],
  );
});
test('different supplements do not become alternatives solely because they share a category', () => {
  for (const id of ['pick-magnesium-wellbeing', 'pick-fastup-gel-lemon']) {
    const product = curatedEverydayProducts.find(product => product.id === id)!;
    assert.deepEqual(alternativePicks(product, curatedFlowProducts), []);
    assert.equal(productSchema.parse(product).comparisonGroup, product.comparisonGroup);
  }
  const creatine = curatedEverydayProducts.find(product => product.id === 'pick-creatine-nakpro')!;
  const alternatives = alternativePicks(creatine, curatedFlowProducts);
  assert.equal(alternatives.length, 4);
  assert.ok(alternatives.every(product => product.comparisonGroup === 'creatine-monohydrate'));
});
test('users see supplement products directly without an educational slide gate', () => {
  const source = readFileSync('mobile/src/SupplementDiscovery.tsx', 'utf8');
  assert.match(source, /<SupplementProductDeck/);
  assert.doesNotMatch(source, /SupplementJourney|guideFinished/);
});
