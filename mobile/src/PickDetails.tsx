import { formatInr, formatEventTime } from '../../shared/format';
import { PickInsight } from './PickInsight';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './design/Text';
import { productCategoryLabel, type MobilePayload, type Product } from '../../shared/mobile';
import {
  offerState,
  purchaseDestination,
  purchaseHost,
  sortedPurchaseOptions,
  storeLabel,
  type PurchaseOption,
} from '../../shared/purchases';
import { Badge, Button, Card, SectionHeader, Sheet } from './design/components';
import { alternativePicks } from '../../shared/pick-comparison';
import { browseProducts } from '../../shared/pick-catalog';
import { decisionAlternative, decisionLine, decisionPrice } from '../../shared/pick-decision';
import { PickDecisionComparison } from './PickDecisionComparison';
import { EquipmentThumbnail } from './EquipmentThumbnail';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, space, useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
import { FlowHeartAction } from './FlowHeartAction';
import { ReportIssue } from './ReportIssue';
import { SellerLink, SellerLinks } from './SellerLinks';
const money = formatInr;
export function PickDetails(
  props: React.ComponentProps<typeof PickReferenceDetails> & { onShare?: () => void },
) {
  const { product, data, onAlternative, onLink } = props;
  const { colors: C } = useTheme();
  const [details, setDetails] = useState(false);
  const library = browseProducts(data);
  const alternatives = alternativePicks(product, library).slice(0, 2);
  const comparison = decisionAlternative(product, library);
  const assessment = product.assessment;
  const eyebrow = (product.subcategory ?? product.category).trim();
  const fit = decisionLine(assessment?.bestFor ?? product.summary);
  const why = assessment?.whyChosen.trim() ?? '';
  const specs = (product.specifications ?? [])
    .filter(spec => spec.label.trim() && spec.value.trim())
    .slice(0, 4);
  const caveats = [...(assessment?.tradeoffs ?? [])]
    .map(line => line?.trim())
    .filter((line): line is string => Boolean(line));
  const sellers = sortedPurchaseOptions(
    (product.purchaseOptions ?? []).filter(
      option => purchaseHost(option.url) && purchaseHost(purchaseDestination(option)),
    ),
  );
  const best = sellers.find(option => option.availability !== 'out-of-stock');
  const published = product.status === 'published';
  const saved = data.profile.savedProductIds.includes(product.id);
  const muted = { color: C.muted } as const;
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: space.xl, paddingBottom: space.xl }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: C.photoMat,
          }}
        >
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              accessibilityLabel={product.title}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          ) : null}
        </View>
        <View style={{ gap: space.ms }}>
          {eyebrow ? (
            <Text
              variant="caption"
              style={{
                color: C.lime,
                fontWeight: '600',
                letterSpacing: 2,
              }}
            >
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
            {product.title}
          </Text>
          {fit ? <Text variant="subhead" style={muted}>{fit}</Text> : null}
        </View>
        <View style={{ gap: space.ms }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
            <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
              {best ? (
                <>
                  <Text variant="headline" style={{ color: C.text }}>
                    {formatInr(best.price)}
                  </Text>
                  <Text variant="subhead" style={{ color: C.muted }}>{storeLabel(best.url)}</Text>
                </>
              ) : null}
            </View>
            <FlowHeartAction
              added={saved}
              busy={props.busy || !published}
              onToggle={props.onSave}
              label={saved ? 'Remove from saved' : 'Save this Pick'}
            />
          </View>
          {best && published && !product.demo ? (
            <Button
              title={`Buy on ${storeLabel(best.url)} ↗`}
              disabled={props.busy}
              onPress={() => onLink(purchaseDestination(best))}
            />
          ) : null}
        </View>
        {why ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Why we recommend it" />
            <Text variant="subhead" style={muted}>{why}</Text>
          </View>
        ) : null}
        {specs.length > 0 ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Key specs" />
            <View>
              {specs.map(spec => (
                <View
                  key={spec.label}
                  style={{
                    flexDirection: 'row',
                    gap: space.ms,
                    paddingVertical: space.ms,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: C.line,
                  }}
                >
                  <Text variant="subhead" style={{ flex: 1, color: C.muted }}>{spec.label}</Text>
                  <Text variant="subhead" style={{ flex: 1, color: C.text, textAlign: 'right' }}>
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {caveats.length > 0 ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Before you buy" />
            {caveats.map((line, index) => (
              <Text key={`${index}:${line}`} variant="subhead" style={muted}>
                • {line}
              </Text>
            ))}
          </View>
        ) : null}
        {comparison || alternatives.length > 0 ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Compare" />
            {comparison ? (
              <PickDecisionComparison
                product={product}
                other={comparison}
                onAlternative={onAlternative}
                onLink={onLink}
              />
            ) : (
              alternatives.map(other => (
                <Pressable
                  key={other.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View alternative ${other.title}`}
                  onPress={() => onAlternative(other)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.ms,
                    minHeight: hit,
                    opacity: pressed ? opacity.pressed : 1,
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.small,
                      overflow: 'hidden',
                      backgroundColor: C.photoMat,
                    }}
                  >
                    {other.imageUrl ? (
                      <Image
                        source={{ uri: other.imageUrl }}
                        accessible={false}
                        resizeMode="contain"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                    <Text numberOfLines={2} variant="callout" style={{ color: C.text, fontWeight: '600' }}>
                      {other.title}
                    </Text>
                    <Text variant="footnote" style={{ color: C.muted }}>{formatInr(decisionPrice(other))}</Text>
                  </View>
                  <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} />
                </Pressable>
              ))
            )}
          </View>
        ) : null}
        {published && !product.demo && sellers.length > 1 ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Where to buy" />
            <SellerLinks product={product} onLink={onLink} />
          </View>
        ) : null}
        {product.safetyNote ? (
          <View style={{ gap: space.ms }}>
            <SectionHeader title="Notes" />
            <View style={{ backgroundColor: C.card, borderRadius: radius.control, padding: space.md }}>
              <Text variant="subhead" style={muted}>{product.safetyNote}</Text>
            </View>
          </View>
        ) : null}
        {props.canReturn ? (
          <Button title="← Back to your flow" secondary onPress={props.onReturn} />
        ) : null}
        <View style={{ alignItems: 'center', gap: space.ms }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`All details for ${product.title}`}
            onPress={() => setDetails(true)}
            style={{ minHeight: hit, justifyContent: 'center' }}
          >
            <Text variant="subhead" style={{ color: C.muted, textAlign: 'center' }}>All details</Text>
          </Pressable>
          {published && props.onShare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={props.onShare}
              style={{ minHeight: hit, justifyContent: 'center' }}
            >
              <Text variant="subhead" style={{ color: C.muted, textAlign: 'center' }}>Share</Text>
            </Pressable>
          ) : null}
          {published ? (
            <View style={{ alignSelf: 'stretch' }}>
              <ReportIssue key={`pick:${product.id}`} kind="pick" itemId={product.id} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      {details && (
        <Sheet title="Product details" onClose={() => setDetails(false)}>
          <PickReferenceDetails {...props} />
        </Sheet>
      )}
    </View>
  );
}
function PickReferenceDetails({
  product,
  data,
  busy,
  canReturn,
  onReturn,
  onLink,
  onVouch,
  onSave,
  onAlternative,
}: {
  onAlternative: (product: Product) => void;
  product: Product;
  data: MobilePayload;
  busy: boolean;
  canReturn: boolean;
  onReturn: () => void;
  onLink: (url: string) => void;
  onVouch: () => void;
  onSave: () => void;
}) {
  const { colors: C } = useTheme();
  const text = { color: C.muted } as const;
  const heading = { color: C.text } as const;
  const options = sortedPurchaseOptions(
    (product.purchaseOptions ?? []).filter(option => purchaseHost(option.url)),
  );
  function listing(option: PurchaseOption, index: number) {
    const status = offerState(option.offer);
    const amazon = storeLabel(option.url) === 'Amazon';
    return (
      <Card key={`${option.url}:${index}`}>
        {!product.demo && product.status === 'published' && (
          <SellerLink option={option} onLink={onLink} />
        )}
        <Badge>
          {product.demo ? 'Demo only · no purchase link' : `Sold by ${option.sellerName}`}
        </Badge>
        {!amazon && (
          <Disclosure title="Delivery & offer details">
            <Text variant="callout" style={text}>
              {option.shippingFee === null
                ? 'Delivery charge unknown'
                : option.shippingFee === 0
                  ? 'Delivery listed as free'
                  : `${money(option.shippingFee)} listed delivery charge`}
            </Text>
            {option.shippingFee !== null && (
              <Badge>
                Item + listed delivery: {money(option.price + option.shippingFee)} · other checkout
                fees may apply
              </Badge>
            )}
            <Text variant="callout" style={text}>{option.deliveryNote}</Text>
            {option.offer ? (
              <>
                <Badge>
                  {status === 'expired'
                    ? 'EXPIRED OFFER · DO NOT COUNT AS SAVINGS'
                    : status === 'expiry-unknown'
                      ? 'OFFER EXPIRY UNKNOWN · CHECK WITH SELLER'
                      : 'LISTED OFFER · CHECK ELIGIBILITY'}
                </Badge>
                <Text variant="callout" style={text}>{option.offer.label}</Text>
                <Text variant="callout" style={text}>{option.offer.terms}</Text>
                {option.offer.code && status !== 'expired' && (
                  <Badge>Code: {option.offer.code}</Badge>
                )}
                {option.offer.expiresAt && (
                  <Badge>Expiry: {formatEventTime(new Date(option.offer.expiresAt))}</Badge>
                )}
                <Badge>Not deducted from the item price above.</Badge>
              </>
            ) : (
              <Badge>No offer recorded. This does not mean the seller has no offers.</Badge>
            )}
          </Disclosure>
        )}
      </Card>
    );
  }
  return (
    <>
      {canReturn && <Button title="← Back to your flow" secondary onPress={onReturn} />}
      <Badge>
        {product.tier} · {productCategoryLabel(product, data.library?.settings.productCategories)}
      </Badge>
      {product.equipmentType && <EquipmentThumbnail kind={product.equipmentType} />}
      <PickInsight
        key={product.id}
        product={product}
        data={data}
        onAlternative={onAlternative}
        onLink={onLink}
      />
      <Text variant="heading" style={heading}>Where to get it</Text>
      {options.length > 0 ? (
        options.map(listing)
      ) : (
        <Card>
          <Badge>
            {product.demo
              ? 'Demo listing · not a real offer'
              : 'Seller prices haven’t been added yet.'}
          </Badge>
          {!product.demo && purchaseHost(product.url) && (
            <Button title="View product source ↗" secondary onPress={() => onLink(product.url)} />
          )}
        </Card>
      )}
      {product.safetyNote && <Text variant="callout" style={text}>{product.safetyNote}</Text>}
      {product.endorsements.length > 0 && (
        <Disclosure title={`Creator sources · ${product.endorsements.length}`}>
          {product.endorsements.map(endorsement => (
            <Card key={endorsement.creatorId}>
              <Text variant="heading" style={heading}>{endorsement.creatorName}</Text>
              <Text variant="callout" style={text}>{endorsement.disclosure}</Text>
              <Button
                title="See original source ↗"
                secondary
                onPress={() => onLink(endorsement.sourceUrl)}
              />
            </Card>
          ))}
        </Disclosure>
      )}
      {data.user.role === 'creator' && (
        <Button title="Vouch with a source" secondary onPress={onVouch} />
      )}
      <Button
        title={
          data.profile.savedProductIds.includes(product.id) ? 'Remove from saved' : 'Save this Pick'
        }
        disabled={busy || product.status !== 'published'}
        onPress={onSave}
      />
    </>
  );
}
