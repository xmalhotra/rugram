import React from 'react';
import { View } from 'react-native';
import type { Product } from '../../shared/mobile';
import { supplementOrderNote } from '../../shared/supplement-picks';
import { buyingComparison, newcomerDecision } from '../../shared/pick-buying';
import { Button, Sheet } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';

export function SupplementPickInformation({
  product,
  onClose,
  onPick,
  onLink,
}: {
  product: Product;
  onClose: () => void;
  onPick: (product: Product) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const copy = { color: C.muted } as const;
  const assessment = product.assessment;
  return (
    <Sheet title={`${product.title} · Information`} onClose={onClose} presentation="modal">
      <View style={{ gap: space.md, paddingVertical: space.ms }}>
        <Text variant="headline" style={{ color: C.text }}>
          {product.variantLabel}
        </Text>
        <Text variant="subhead" style={copy}>{assessment?.whyChosen ?? product.summary}</Text>
        <Text variant="subhead" style={copy}>{supplementOrderNote}</Text>
        <Text variant="headline" style={{ color: C.text }}>What you pay for</Text>
        {buyingComparison([product]).map(row => (
          <View key={row.label} style={{ gap: space.xs }}>
            <Text variant="caption" style={{ color: C.lime }}>{row.label}</Text>
            <Text variant="subhead" style={copy}>{row.values[0]}</Text>
          </View>
        ))}
        <Text variant="subhead" style={copy}>{newcomerDecision(product)}</Text>
        {product.specifications?.map(spec => (
          <View key={spec.label} style={{ gap: space.xs }}>
            <Text style={{ color: C.text, fontWeight: '600' }}>{spec.label}</Text>
            <Text variant="subhead" style={copy}>{spec.value}</Text>
          </View>
        ))}
        {assessment && (
          <>
            <Text variant="headline" style={{ color: C.text }}>Before choosing</Text>
            <Text variant="subhead" style={copy}>{assessment.notFor}</Text>
            {assessment.tradeoffs.map(item => (
              <Text key={item} variant="subhead" style={copy}>
                {item}
              </Text>
            ))}
            <Text variant="subhead" style={copy}>Compared on: {assessment.criteria.join(' · ')}</Text>
          </>
        )}
        {product.safetyNote && <Text variant="subhead" style={copy}>{product.safetyNote}</Text>}
        <Text variant="subhead" style={copy}>
          Listing checked {product.checkedAt.slice(0, 10)}. Confirm current stock, pack and checkout
          price with the seller.
        </Text>
        {[...new Set(assessment?.sourceUrls ?? [product.url])].map(url => (
          <Button key={url} title="View source listing ↗" secondary onPress={() => onLink(url)} />
        ))}
        <Button
          title="Open full pick"
          secondary
          onPress={() => {
            onClose();
            onPick(product);
          }}
        />
      </View>
    </Sheet>
  );
}
