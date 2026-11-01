import { formatDate } from '../../shared/format';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { MobilePayload, Product } from '../../shared/mobile';
import { alternativePicks, comparisonRows } from '../../shared/pick-comparison';
import { Badge, Button, Card } from './design/components';
import { useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
export function PickInsight({
  product,
  data,
  onAlternative,
  onLink,
}: {
  product: Product;
  data: MobilePayload;
  onAlternative: (product: Product) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const text = { color: C.muted, fontSize: 15, lineHeight: 23 } as const;
  const title = { color: C.text, fontSize: 22, fontWeight: '600' } as const;
  const alternatives = alternativePicks(product, [
    ...data.products,
    ...data.flowResources.products,
  ]);
  const columns = [product, ...alternatives.slice(0, 2)];
  const rows = comparisonRows(columns);
  const references = product.recommendations ?? [];
  return (
    <View style={{ gap: 16 }}>
      {product.imageUrl && (
        <View style={{ borderRadius: 20, backgroundColor: C.photoMat, padding: 12 }}>
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={product.title}
            style={{ height: 180, width: '100%' }}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={{ gap: 5 }}>
        <Text style={title}>{product.title}</Text>
        {product.variantLabel && <Text style={text}>{product.variantLabel}</Text>}
        {product.packLabel && <Badge>{product.packLabel}</Badge>}
      </View>
      {product.demo && <Badge>Simulated listing · not verified buying advice</Badge>}
      <Card>
        <Text style={{ ...title, fontSize: 17 }}>Why we picked it</Text>
        <Text style={{ ...text, color: C.text }}>
          {product.assessment?.whyChosen ?? product.summary}
        </Text>
      </Card>
      <Disclosure title="Is it right for me?">
        <Text style={text}>{product.summary}</Text>
        {product.assessment && (
          <>
            <Text style={text}>Fits: {product.assessment.bestFor}</Text>
            <Text style={text}>Skip it: {product.assessment.notFor}</Text>
            {product.assessment.tradeoffs.map(point => (
              <Text key={point} style={text}>
                • {point}
              </Text>
            ))}
          </>
        )}
      </Disclosure>
      <Disclosure title="Specifications & label">
        {product.specifications?.length ? (
          product.specifications.map((spec, index) => (
            <View
              key={`${spec.label}-${index}`}
              style={{
                gap: 3,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
              }}
            >
              <Text style={{ ...text, color: C.text, fontWeight: '600' }}>{spec.label}</Text>
              <Text style={text}>{spec.value}</Text>
            </View>
          ))
        ) : (
          <Text style={text}>Specifications haven’t been verified yet.</Text>
        )}
        <Text style={{ ...text, fontSize: 12 }}>
          Manufacturer information, not independent batch testing. Confirm the current pack label.
        </Text>
        {[...new Set((product.specifications ?? []).map(spec => spec.sourceUrl))].map(url => (
          <Button key={url} title="View original label ↗" secondary onPress={() => onLink(url)} />
        ))}
      </Disclosure>
      {alternatives.length > 0 && (
        <Disclosure title={`Compare ${alternatives.length} alternatives`}>
          {alternatives.map(alternative => (
            <Pressable
              key={alternative.id}
              accessibilityRole="button"
              accessibilityLabel={`View alternative ${alternative.title}`}
              onPress={() => onAlternative(alternative)}
              style={{
                minHeight: 64,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
                gap: 5,
              }}
            >
              <Text style={{ ...title, fontSize: 18 }}>{alternative.title} →</Text>
              <Text style={text}>{alternative.assessment?.whyChosen ?? alternative.summary}</Text>
              <Text style={{ ...text, fontSize: 13 }}>{alternative.packLabel}</Text>
            </Pressable>
          ))}
          <Disclosure title="Side-by-side details">
            {rows.map(row => (
              <View key={row.label} style={{ gap: 6, paddingVertical: 8 }}>
                <Text style={{ ...text, color: C.text, fontWeight: '600' }}>{row.label}</Text>
                {columns.map((column, index) => (
                  <Text key={column.id} style={text}>
                    {column.title}: {row.values[index]}
                  </Text>
                ))}
              </View>
            ))}
          </Disclosure>
        </Disclosure>
      )}
      {references.length > 0 && (
        <Disclosure title={`Who recommends it? · ${references.length}`}>
          {references.map((reference, index) => (
            <Card key={`${reference.profileUrl}-${index}`}>
              <Text style={title}>{reference.name}</Text>
              <Badge>
                {reference.claim} · {reference.verified ? 'Source checked' : 'Unverified'}
              </Badge>
              <Text style={text}>{reference.context}</Text>
              <Text style={text}>{reference.disclosure}</Text>
              <Button
                title="See original reference ↗"
                secondary
                onPress={() => onLink(reference.sourceUrl)}
              />
              <Button
                title="Creator profile ↗"
                secondary
                onPress={() => onLink(reference.profileUrl)}
              />
            </Card>
          ))}
        </Disclosure>
      )}
      {product.assessment && (
        <Disclosure title="How we chose it">
          <Text style={text}>{product.assessment.criteria.join(' · ')}</Text>
          <Text style={text}>
            Editorial selection, not a universal quality ranking. Checked{' '}
            {formatDate(new Date(product.assessment.checkedAt))}.
          </Text>
          {product.assessment.sourceUrls.map(url => (
            <Button key={url} title="Source ↗" secondary onPress={() => onLink(url)} />
          ))}
        </Disclosure>
      )}
    </View>
  );
}
