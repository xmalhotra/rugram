import { Image, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { supplementIcons } from './picks-icons';
import { Text } from './design/Text';
import { Button, SectionHeader } from './design/components';
import type { HabitFlow, MobilePayload, Product } from '../../shared/mobile';
import { defaultSupplementDiscovery, topicProducts } from '../../shared/supplement-discovery';
import { supplementPickCategories } from '../../shared/supplement-picks';
import { opacity, radius, space, useTheme } from './design/theme';
import { browseProducts } from '../../shared/pick-catalog';
import { rankProducts } from '../../shared/pick-ranking';
import { comparisonRows } from '../../shared/pick-comparison';
import { sellerPriceLabel, sortedPurchaseOptions } from '../../shared/purchases';
import { flowsForTopic } from '../../shared/flow-picks';
import { againstTypicalLabel, pricePer100g, valueEntries } from '../../shared/supplement-value';
import { liveFlowIds } from './catalog-live';
import { usePaneState } from './pane-state';
import { SupplementProductDeck } from './SupplementProductDeck';

const headerHeight = 88;
const rowHeight = 56;

export function SupplementDiscovery({
  data,
  onBack,
  onPick,
  onLink,
  onFlow,
}: {
  data: MobilePayload;
  /** Omitted where Supplements is its own Picks tab, so there is no parent to go back to. */
  onBack?: () => void;
  onPick: (product: Product) => void;
  onLink: (url: string) => void;
  /** Opens the training guide linked from this topic. */
  onFlow?: (flow: HabitFlow) => void;
}) {
  const { colors: C } = useTheme();
  // Account scope so a flow sheet on any tab can open this topic.
  const [topicId, setTopic] = usePaneState<string | null>('supplementTopic', null, 'account');
  const categories = supplementPickCategories(
    data.library?.settings.supplementDiscovery ?? defaultSupplementDiscovery,
  );
  const topic = categories.find(item => item.id === topicId);
  // Editors' order still counts, alongside evidence, freshness and value.
  const products = topic
    ? rankProducts(topicProducts(topic, browseProducts(data), 5), {
        editorialOrder: topic.productIds,
      }).map(entry => entry.product)
    : [];
  const copy = { color: C.muted } as const;
  const select = (id: string) => {
    setTopic(id);
  };
  const pick = topPick(products);
  const related = topic
    ? flowsForTopic(topic.id, data.flows, topic.flowIds).filter(flow => liveFlowIds.has(flow.id))
    : [];
  const tradeoffs = pick?.assessment?.tradeoffs.filter(item => item.trim()) ?? [];
  const foodFirst = topic?.foodFirst.trim() ?? '';
  return (
    <View style={{ gap: space.md }}>
      {/* No goal heading or info button: the goal tiles speak for themselves. */}
      {(topic || onBack) && (
        <Button
          variant="text"
          title={`← ${topic ? topic.title : 'All categories'}`}
          accessibilityLabel={`Back to ${topic ? 'Supplement categories' : 'All categories'}`}
          onPress={() => {
            if (topic) setTopic(null);
            else onBack?.();
          }}
        />
      )}
      {!topic ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.ms }}>
          {categories.map(item => {
            const icon = supplementIcons[item.id];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => select(item.id)}
                style={({ pressed }) => ({ width: '31.5%', gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
              >
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: radius.control,
                    overflow: 'hidden',
                    backgroundColor: C.card,
                  }}
                >
                  {icon ? (
                    <Image
                      source={icon}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={2}
                  variant="footnote"
                  style={{ color: C.text, textAlign: 'center' }}
                >
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          {/* Inside a goal, no category row: the back link names where you are. */}
          {pick ? (
            <View style={{ gap: space.ms }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Top pick, ${pick.title}`}
                onPress={() => onPick(pick)}
                style={({ pressed }) => ({
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: C.line,
                  backgroundColor: C.card,
                  padding: space.md,
                  gap: space.ms,
                  opacity: pressed ? opacity.pressed : 1,
                })}
              >
                {pick.imageUrl ? (
                  <Image
                    source={{ uri: pick.imageUrl }}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                    style={{ height: 88, width: 88, borderRadius: radius.small, backgroundColor: C.photoMat }}
                  />
                ) : null}
                <Text variant="headline" style={{ color: C.text }}>{pick.title}</Text>
                {pick.assessment?.whyChosen ? (
                  <View style={{ gap: space.xs }}>
                    <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                      Why we recommend it
                    </Text>
                    <Text variant="subhead" style={copy}>{pick.assessment.whyChosen}</Text>
                  </View>
                ) : null}
                {pick.assessment?.bestFor && pick.assessment.bestFor !== pick.assessment.whyChosen ? (
                  <Text variant="subhead" style={copy}>{pick.assessment.bestFor}</Text>
                ) : null}
              </Pressable>
            </View>
          ) : null}
          <ValueForMoney products={products} pickId={pick?.id} onPick={onPick} />
          <SupplementComparison products={products} onPick={onPick} />
          {tradeoffs.length || foodFirst ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader title="Before you buy" />
              {tradeoffs.map(item => (
                <Text key={item} variant="subhead" style={copy}>
                  • {item}
                </Text>
              ))}
              {foodFirst ? <Text variant="subhead" style={copy}>{foodFirst}</Text> : null}
            </View>
          ) : null}
          {onFlow && related.length ? (
            <View style={{ gap: space.sm }}>
              <SectionHeader title="From your flow" />
              {related.map(flow => (
                <Button
                  key={flow.id}
                  variant="text"
                  title={`Read the ${flow.title} flow →`}
                  accessibilityLabel={`Read the ${flow.title} flow`}
                  onPress={() => onFlow(flow)}
                />
              ))}
            </View>
          ) : null}
          {products.length ? (
            <SupplementProductDeck
              key={topic.id}
              products={products}
              onPick={onPick}
              onLink={onLink}
            />
          ) : (
            <View
              style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: space.ms }}
            >
              <Text variant="subhead" style={copy}>No products listed yet</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Rank 1 on the shortlist, otherwise the first product in the already ranked list. */
function topPick(products: Product[]) {
  return products.find(product => product.assessment?.shortlist?.rank === 1) ?? products[0];
}

function listedPrice(product: Product) {
  const option = sortedPurchaseOptions(product.purchaseOptions ?? [])[0];
  return option ? sellerPriceLabel(option) : null;
}

/** What each product costs for the same amount, so the price tag isn't the only number. */
function ValueForMoney({
  products,
  pickId,
  onPick,
}: {
  products: Product[];
  pickId?: string;
  onPick: (product: Product) => void;
}) {
  const { colors: C } = useTheme();
  const entries = valueEntries(products);
  if (!entries.length) return null;
  const highest = entries[entries.length - 1].per100g;
  return (
    <View style={{ gap: space.ms }}>
      <SectionHeader title="Value for money" detail="Listed price per 100 g, cheapest first" />
      {entries.map(entry => {
        const product = products.find(item => item.id === entry.id)!;
        const top = entry.id === pickId;
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`${entry.title}, ₹${Math.round(entry.per100g)} per 100 grams, ${againstTypicalLabel(entry.againstTypical)}`}
            onPress={() => onPick(product)}
            style={({ pressed }) => ({ gap: space.xs, opacity: pressed ? opacity.pressed : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <Text
                numberOfLines={1}
                variant="subhead"
                style={{ flex: 1, color: top ? C.lime : C.text, fontWeight: top ? '600' : '400' }}
              >
                {entry.title}
              </Text>
              <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                ₹{Math.round(entry.per100g)}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${Math.max(6, (entry.per100g / highest) * 100)}%`,
                  backgroundColor: top ? C.lime : C.muted,
                }}
              />
            </View>
            <Text variant="caption" style={{ color: C.muted }}>{againstTypicalLabel(entry.againstTypical)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SupplementComparison({
  products,
  onPick,
}: {
  products: Product[];
  onPick: (product: Product) => void;
}) {
  const { colors: C } = useTheme();
  const prices = products.map(listedPrice);
  const rows = [
    ...(prices.some(Boolean)
      ? [{ label: 'Price', values: prices.map(price => price ?? 'Not recorded') }]
      : []),
    ...(products.some(product => pricePer100g(product))
      ? [
          {
            label: 'Price per 100 g',
            values: products.map(product => {
              const value = pricePer100g(product);
              return value ? `₹${Math.round(value)}` : 'Not recorded';
            }),
          },
        ]
      : []),
    ...comparisonRows(products),
  ];
  if (!rows.length) return null;
  const rowStyle = (height: number): ViewStyle => ({
    height,
    padding: space.sm,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  });
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title="Compare" />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 128 }}>
          <View style={rowStyle(headerHeight)}>
            <Text variant="footnote" style={{ color: C.text, fontWeight: '600' }}>Product</Text>
          </View>
          {rows.map(row => (
            <View key={row.label} style={rowStyle(rowHeight)}>
              <Text variant="footnote" style={{ color: C.text }} numberOfLines={2}>
                {row.label}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            {products.map((product, index) => (
              <View
                key={product.id}
                style={{
                  width: 112,
                  borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderLeftColor: C.line,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${product.title}`}
                  onPress={() => onPick(product)}
                  style={rowStyle(headerHeight)}
                >
                  <Text
                    variant="footnote"
                    style={{ color: C.text, fontWeight: '600' }}
                    numberOfLines={3}
                  >
                    {product.title}
                  </Text>
                </Pressable>
                {rows.map(row => (
                  <View key={row.label} style={rowStyle(rowHeight)}>
                    <Text variant="footnote" style={{ color: C.text }} numberOfLines={3}>
                      {row.values[index]}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
