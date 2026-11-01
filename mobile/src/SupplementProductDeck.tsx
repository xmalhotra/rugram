import React, { useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import type { Product } from '../../shared/mobile';
import { supplementProductPosition } from '../../shared/supplement-picks';
import { ProductPreview } from './ProductPreview';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { SupplementPickInformation } from './SupplementPickInformation';

export function SupplementProductDeck({
  products,
  onPick,
  onLink,
}: {
  products: Product[];
  onPick: (product: Product) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [information, setInformation] = useState<Product | null>(null);
  const list = useRef<FlatList<Product>>(null);
  const metals = ['#d6b963', '#bac3d0', '#c6916c'];
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: 14 }}>
      {width > 0 && (
        <FlatList
          key={width}
          ref={list}
          data={products}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Ordered supplement products"
          keyExtractor={product => product.id}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          initialScrollIndex={Math.min(active, products.length - 1)}
          style={{ flexGrow: 0 }}
          onMomentumScrollEnd={event =>
            setActive(
              Math.max(
                0,
                Math.min(
                  products.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / width),
                ),
              ),
            )
          }
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={({ item: product, index }) => {
            const position = supplementProductPosition(product, index);
            const metal = position.medal ? metals[position.number - 1] : undefined;
            return (
              <View style={{ width, paddingHorizontal: 2 }}>
                <View
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: metal ?? C.line,
                    backgroundColor: C.card,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 48,
                      paddingHorizontal: 12,
                      paddingTop: 8,
                    }}
                  >
                    <View
                      accessibilityLabel={`${position.ranked ? 'Editorial shortlist rank' : 'Catalogue position'} ${position.number}${position.medal ? `, ${position.medal}` : ''}`}
                      style={{
                        borderRadius: 12,
                        backgroundColor: C.card,
                        borderColor: metal ?? C.line,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: metal ?? C.text, fontWeight: '700', fontSize: 16 }}>
                        {position.number}
                        {position.medal ? ` · ${position.medal}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Information about ${product.title}`}
                      onPress={() => setInformation(product)}
                      style={{
                        width: 48,
                        height: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: C.muted, fontSize: 27 }}>ⓘ</Text>
                    </Pressable>
                  </View>
                  <ProductPreview
                    product={product}
                    onPick={onPick}
                    onLink={onLink}
                    hero
                    cardWidth={width - 6}
                    showReason={false}
                    borderless
                  />
                </View>
              </View>
            );
          }}
        />
      )}
      {products.length > 0 && (
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Product positions"
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          {products.map((product, index) => (
            <Pressable
              key={product.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active === index }}
              accessibilityLabel={`Product ${index + 1} of ${products.length}`}
              onPress={() => {
                list.current?.scrollToIndex({ index, animated: true });
                setActive(index);
              }}
              style={{
                minHeight: 44,
                minWidth: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: active === index ? C.lime : C.line,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.card,
              }}
            >
              <Text
                style={{
                  color: active === index ? C.lime : C.muted,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                {supplementProductPosition(product, index).number}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {information && (
        <SupplementPickInformation
          product={information}
          onClose={() => setInformation(null)}
          onPick={onPick}
          onLink={onLink}
        />
      )}
    </View>
  );
}
