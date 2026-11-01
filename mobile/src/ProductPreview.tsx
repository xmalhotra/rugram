import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { Product } from '../../shared/mobile';
import {
  affiliateSeller,
  sortedPurchaseOptions,
  purchaseDestination,
  sellerPriceLabel,
} from '../../shared/purchases';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { ReasonLine } from './design/states';
import { pickReason } from '../../shared/reasons';
export function ProductPreview({
  product,
  onPick,
  onLink,
  hero = false,
  cardWidth,
  showReason = true,
  borderless = false,
}: {
  product: Product;
  onPick: (product: Product) => void;
  onLink: (url: string) => void;
  hero?: boolean;
  cardWidth?: number;
  showReason?: boolean;
  borderless?: boolean;
}) {
  const { colors: C } = useTheme();
  const [failed, setFailed] = useState(false);
  const option = sortedPurchaseOptions(product.purchaseOptions ?? []).find(
    option => option.availability !== 'out-of-stock',
  );
  return (
    <View
      style={{
        width: cardWidth ?? (hero ? 168 : '100%'),
        padding: 12,
        borderRadius: 22,
        borderWidth: borderless ? 0 : 1,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: 10,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product.title}`}
        onPress={() => onPick(product)}
        style={{
          flexDirection: hero ? 'column' : 'row',
          gap: 12,
          alignItems: hero ? 'stretch' : 'center',
        }}
      >
        <View
          style={{
            width: hero ? '100%' : 76,
            height: cardWidth ? Math.min(cardWidth * 0.8, 300) : hero ? 130 : 76,
            borderRadius: 16,
            backgroundColor: C.photoMat,
            padding: 8,
            justifyContent: 'center',
          }}
        >
          {failed || !product.imageUrl ? (
            <Text style={{ color: C.photoInk, fontSize: 12, textAlign: 'center' }}>
              Photo unavailable
            </Text>
          ) : (
            <Image
              source={{ uri: product.imageUrl }}
              onError={() => setFailed(true)}
              accessibilityLabel={product.title}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </View>
        <View style={{ flex: hero ? undefined : 1, minWidth: 0, gap: 5 }}>
          <Text
            numberOfLines={2}
            style={{ color: C.text, fontSize: 17, lineHeight: 23, fontWeight: '600' }}
          >
            {product.title}
          </Text>
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
            {product.packLabel ?? product.variantLabel}
          </Text>
        </View>
        {!hero && <Text style={{ color: C.muted, fontSize: 24 }}>›</Text>}
      </Pressable>
      {showReason && <ReasonLine>{pickReason(product)}</ReasonLine>}
      {option && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${option.sellerName}, ${sellerPriceLabel(option)}, opens seller`}
          onPress={() => onLink(purchaseDestination(option))}
          style={{
            minHeight: 48,
            borderTopWidth: 1,
            borderColor: C.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11, flex: 1 }}>
            {option.sellerName}
          </Text>
          <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>
            {sellerPriceLabel(option)} ↗
          </Text>
        </Pressable>
      )}
      {option && affiliateSeller(option) && (
        <Text style={{ color: C.muted, fontSize: 10 }}>
          Affiliate link · we may earn a commission
        </Text>
      )}
    </View>
  );
}
