import React, { useState } from 'react';
import { usePaneState } from './pane-state';
import { CommercialDisclosure } from './OutboundLink';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from './design/Text';
import {
  budgetProducts,
  pickCategories,
  type HabitFlow,
  type MobilePayload,
  type Product,
} from '../../shared/mobile';
import type { CreditCard } from '../../shared/credit-cards';
import { sellerPriceLabel, sortedPurchaseOptions } from '../../shared/purchases';
import { Button } from './design/components';
import { useTheme } from './design/theme';
import { CreditCardPicks } from './CreditCardPicks';
import { SavedPicks } from './SavedPicks';
import { browseProducts, defaultFeaturedProductIds } from '../../shared/pick-catalog';
import { savedPicks } from '../../shared/saved-picks';
type PicksBrowserProps = {
  data: MobilePayload;
  busy: boolean;
  onCardChange: (input: unknown) => Promise<boolean>;
  onPick: (product: Product) => void;
  onCard: (card: CreditCard) => void;
  onFlow: (flow: HabitFlow) => void;
  onGuide: (guide: 'magnesium' | 'equipment') => void;
  onLink: (url: string) => void;
};
export function PicksBrowser(props: PicksBrowserProps) {
  const [saved, setSaved] = usePaneState('savedPicks', false);
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text style={{ color: C.text, fontSize: 25, fontWeight: '600' }}>
          {saved ? 'Saved picks' : 'Picks'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Back to Picks' : 'Open saved picks'}
          onPress={() => setSaved(value => !value)}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={{ color: C.lime, fontSize: 14 }}>
            {saved ? '← Picks' : 'Saved · ' + savedPicks(props.data).count}
          </Text>
        </Pressable>
      </View>
      {saved ? <SavedPicks data={props.data} onPick={props.onPick} /> : <PicksExplore {...props} />}
      <CommercialDisclosure />
    </View>
  );
}
function pickDetail(product: Product) {
  const option = sortedPurchaseOptions(product.purchaseOptions ?? []).find(
    item => item.availability !== 'out-of-stock',
  );
  return [product.packLabel ?? product.variantLabel, option ? sellerPriceLabel(option) : '']
    .filter(Boolean)
    .join(' · ');
}

function PickRow({ product, onPick }: { product: Product; onPick: (product: Product) => void }) {
  const { colors: C } = useTheme();
  const [failed, setFailed] = useState(false);
  const detail = pickDetail(product);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${product.title}`}
      onPress={() => onPick(product)}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: C.photoMat,
        }}
      >
        {!failed && product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            onError={() => setFailed(true)}
            resizeMode="contain"
            accessibilityLabel={product.title}
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
          {product.title}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function PickTile({ product, onPick }: { product: Product; onPick: (product: Product) => void }) {
  const { colors: C } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${product.title}`}
      onPress={() => onPick(product)}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: C.photoMat,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {!failed && product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          onError={() => setFailed(true)}
          resizeMode="cover"
          accessibilityLabel={product.title}
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 8,
          paddingVertical: 7,
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <Text numberOfLines={2} style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
          {product.title}
        </Text>
      </View>
    </Pressable>
  );
}

function PicksExplore({
  data,
  busy,
  onCardChange,
  onPick,
  onCard,
  onGuide,
  onLink,
}: PicksBrowserProps) {
  const { colors: C } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = Math.max(240, screenWidth - 80);
  const categories =
    data.library?.settings.productCategories ??
    pickCategories.map(id => ({ id, title: id, subcategories: [] }));
  const catalogue = browseProducts(data);
  const featured = (data.library?.settings.featuredProductIds ?? defaultFeaturedProductIds).flatMap(
    id => catalogue.filter(product => product.id === id),
  );
  const sections = [
    { id: 'featured', title: 'Featured', products: featured },
    ...categories.map(item => ({
      id: item.id,
      title: item.id === 'Tech' && item.title === 'Tech' ? 'Electronics' : item.title,
      products: budgetProducts(catalogue, item.id, 'All', Infinity),
    })),
  ].filter(section => section.products.length > 0 || section.id === 'Equipment');
  const grid = [
    ...featured,
    ...catalogue.filter(product => !featured.some(item => item.id === product.id)),
  ].slice(0, 9);
  const gridRows: Product[][] = [];
  for (let index = 0; index < grid.length; index += 3) gridRows.push(grid.slice(index, index + 3));
  return (
    <View style={{ gap: 28, backgroundColor: C.bg }}>
      {gridRows.length > 0 && (
        <View accessibilityLabel="Pick grid" style={{ gap: 8 }}>
          {gridRows.map(row => (
            <View key={row.map(product => product.id).join('-')} style={{ flexDirection: 'row', gap: 8 }}>
              {row.map(product => (
                <PickTile key={product.id} product={product} onPick={onPick} />
              ))}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }, (_, index) => (
                  <View key={`pad-${index}`} style={{ flex: 1 }} />
                ))}
            </View>
          ))}
        </View>
      )}
      {sections.map(section => {
        const pages: Product[][] = [];
        for (let index = 0; index < section.products.length; index += 5)
          pages.push(section.products.slice(index, index + 5));
        return (
          <View key={section.id} accessibilityLabel={`${section.title} picks`} style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
              {section.title}
            </Text>
            {pages.length > 0 && (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                disableIntervalMomentum
                snapToInterval={pageWidth + 12}
                accessibilityLabel="Pick list"
                contentContainerStyle={{ gap: 12 }}
              >
                {pages.map(page => (
                  <View key={page.map(product => product.id).join('-')} style={{ width: pageWidth, gap: 14 }}>
                    {page.map(product => (
                      <PickRow key={product.id} product={product} onPick={onPick} />
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
            {section.id === 'Equipment' && (
              <Button
                title="Find the right support →"
                secondary
                onPress={() => onGuide('equipment')}
              />
            )}
            {!section.products.length && (
              <Text style={{ color: C.muted, fontSize: 15 }}>No products available yet.</Text>
            )}
          </View>
        );
      })}
      <CreditCardPicks
        data={data}
        busy={busy}
        onOpen={onCard}
        onChange={onCardChange}
        onLink={onLink}
      />
    </View>
  );
}
