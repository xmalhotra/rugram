import React from 'react';
import { View } from 'react-native';
import type { Product } from '../../shared/mobile';
import { supplementOrderNote } from '../../shared/supplement-picks';
import { buyingComparison, newcomerDecision } from '../../shared/pick-buying';
import { Button, Sheet } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
  const copy = { color: C.muted, fontSize: 15, lineHeight: 22 } as const;
  const assessment = product.assessment;
  return (
    <Sheet title={`${product.title} · Information`} onClose={onClose} presentation="modal">
      <View style={{ gap: 16, paddingVertical: 12 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>
          {product.variantLabel}
        </Text>
        <Text style={copy}>{assessment?.whyChosen ?? product.summary}</Text>
        <Text style={copy}>{supplementOrderNote}</Text>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>What you pay for</Text>
        {buyingComparison([product]).map(row => (
          <View key={row.label} style={{ gap: 4 }}>
            <Text style={{ color: C.lime, fontSize: 12 }}>{row.label}</Text>
            <Text style={copy}>{row.values[0]}</Text>
          </View>
        ))}
        <Text style={copy}>{newcomerDecision(product)}</Text>
        {product.specifications?.map(spec => (
          <View key={spec.label} style={{ gap: 4 }}>
            <Text style={{ color: C.text, fontWeight: '600' }}>{spec.label}</Text>
            <Text style={copy}>{spec.value}</Text>
          </View>
        ))}
        {assessment && (
          <>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>Before choosing</Text>
            <Text style={copy}>{assessment.notFor}</Text>
            {assessment.tradeoffs.map(item => (
              <Text key={item} style={copy}>
                {item}
              </Text>
            ))}
            <Text style={copy}>Compared on: {assessment.criteria.join(' · ')}</Text>
          </>
        )}
        {product.safetyNote && <Text style={copy}>{product.safetyNote}</Text>}
        <Text style={copy}>
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
