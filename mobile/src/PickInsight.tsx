import { formatDate } from '../../shared/format';
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { MobilePayload, Product } from '../../shared/mobile';
import { alternativePicks, comparisonRows } from '../../shared/pick-comparison';
import { Badge, Button, Card } from './design/components';
import { radius, space, useTheme } from './design/theme';
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
  const text = { color: C.muted } as const;
  const title = { color: C.text } as const;
  const alternatives = alternativePicks(product, [
    ...data.products,
    ...data.flowResources.products,
  ]);
  const columns = [product, ...alternatives.slice(0, 2)];
  const rows = comparisonRows(columns);
  const references = product.recommendations ?? [];
  return (
    <View style={{ gap: space.md }}>
      {product.imageUrl && (
        <View style={{ borderRadius: radius.card, backgroundColor: C.photoMat, padding: space.ms }}>
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={product.title}
            style={{ height: 180, width: '100%' }}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={{ gap: space.xs }}>
        <Text variant="heading" style={title}>{product.title}</Text>
        {product.variantLabel && <Text variant="subhead" style={text}>{product.variantLabel}</Text>}
        {product.packLabel && <Badge>{product.packLabel}</Badge>}
      </View>
      {product.demo && <Badge>Simulated listing · not verified buying advice</Badge>}
      <Card>
        <Text variant="headline" style={title}>Why we picked it</Text>
        <Text variant="subhead" style={{ ...text, color: C.text }}>
          {product.assessment?.whyChosen ?? product.summary}
        </Text>
      </Card>
      <Disclosure title="Is it right for me?">
        <Text variant="subhead" style={text}>{product.summary}</Text>
        {product.assessment && (
          <>
            <Text variant="subhead" style={text}>Fits: {product.assessment.bestFor}</Text>
            <Text variant="subhead" style={text}>Skip it: {product.assessment.notFor}</Text>
            {product.assessment.tradeoffs.map(point => (
              <Text key={point} variant="subhead" style={text}>
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
                gap: space.xs,
                paddingVertical: space.ms,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
              }}
            >
              <Text variant="subhead" style={{ ...text, color: C.text, fontWeight: '600' }}>{spec.label}</Text>
              <Text variant="subhead" style={text}>{spec.value}</Text>
            </View>
          ))
        ) : (
          <Text variant="subhead" style={text}>Specifications haven’t been verified yet.</Text>
        )}
        <Text variant="caption" style={text}>
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
                paddingVertical: space.ms,
                borderBottomWidth: 1,
                borderBottomColor: C.line,
                gap: space.xs,
              }}
            >
              <Text variant="headline" style={title}>{alternative.title} →</Text>
              <Text variant="subhead" style={text}>{alternative.assessment?.whyChosen ?? alternative.summary}</Text>
              <Text variant="footnote" style={text}>{alternative.packLabel}</Text>
            </Pressable>
          ))}
          <Disclosure title="Side-by-side details">
            {rows.map(row => (
              <View key={row.label} style={{ gap: space.sm, paddingVertical: space.sm }}>
                <Text variant="subhead" style={{ ...text, color: C.text, fontWeight: '600' }}>{row.label}</Text>
                {columns.map((column, index) => (
                  <Text key={column.id} variant="subhead" style={text}>
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
              <Text variant="heading" style={title}>{reference.name}</Text>
              <Badge>
                {reference.claim} · {reference.verified ? 'Source checked' : 'Unverified'}
              </Badge>
              <Text variant="subhead" style={text}>{reference.context}</Text>
              <Text variant="subhead" style={text}>{reference.disclosure}</Text>
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
          <Text variant="subhead" style={text}>{product.assessment.criteria.join(' · ')}</Text>
          <Text variant="subhead" style={text}>
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
