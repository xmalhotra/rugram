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
import { Glyph } from './design/Glyph';
import { hit, radius, space, useTheme } from './design/theme';
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
        padding: space.ms,
        borderRadius: radius.card,
        borderWidth: borderless ? 0 : 1,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: space.ms,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product.title}`}
        onPress={() => onPick(product)}
        style={{
          flexDirection: hero ? 'column' : 'row',
          gap: space.ms,
          alignItems: hero ? 'stretch' : 'center',
        }}
      >
        <View
          style={{
            width: hero ? '100%' : 76,
            height: cardWidth ? Math.min(cardWidth * 0.8, 300) : hero ? 130 : 76,
            borderRadius: radius.control,
            backgroundColor: C.photoMat,
            padding: space.sm,
            justifyContent: 'center',
          }}
        >
          {failed || !product.imageUrl ? (
            <Text variant="caption" style={{ color: C.photoInk, textAlign: 'center' }}>
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
        <View style={{ flex: hero ? undefined : 1, minWidth: 0, gap: space.xs }}>
          <Text numberOfLines={2} variant="headline" style={{ color: C.text }}>
            {product.title}
          </Text>
          <Text numberOfLines={1} variant="caption" style={{ color: C.muted }}>
            {product.packLabel ?? product.variantLabel}
          </Text>
        </View>
        {!hero && (
          <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.xl} />
        )}
      </Pressable>
      {showReason && <ReasonLine>{pickReason(product)}</ReasonLine>}
      {option && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${option.sellerName}, ${sellerPriceLabel(option)}, opens seller`}
          onPress={() => onLink(purchaseDestination(option))}
          style={{
            minHeight: hit,
            borderTopWidth: 1,
            borderColor: C.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
          }}
        >
          <Text numberOfLines={1} variant="caption" style={{ color: C.muted, flex: 1 }}>
            {option.sellerName}
          </Text>
          <Text variant="subhead" style={{ color: C.lime, fontWeight: '600' }}>
            {sellerPriceLabel(option)} ↗
          </Text>
        </Pressable>
      )}
      {option && affiliateSeller(option) && (
        <Text variant="caption" style={{ color: C.muted }}>
          Affiliate link · we may earn a commission
        </Text>
      )}
    </View>
  );
}
