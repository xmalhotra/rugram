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
import { Badge, Button, Card, Sheet } from './design/components';
import { alternativePicks } from '../../shared/pick-comparison';
import { browseProducts } from '../../shared/pick-catalog';
import { decisionAlternative, decisionLine, decisionPrice } from '../../shared/pick-decision';
import { PickDecisionComparison } from './PickDecisionComparison';
import { EquipmentThumbnail } from './EquipmentThumbnail';
import { useTheme } from './design/theme';
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
  const sectionTitle = { color: C.text, fontSize: 18, fontWeight: '700' } as const;
  const muted = { color: C.muted, fontSize: 15, lineHeight: 22 } as const;
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 28, paddingBottom: 28 }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: 20,
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
        <View style={{ gap: 10 }}>
          {eyebrow ? (
            <Text
              style={{
                color: C.lime,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 2,
              }}
            >
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={{ color: C.text, fontSize: 24, fontWeight: '700', lineHeight: 30 }}
          >
            {product.title}
          </Text>
          {fit ? <Text style={muted}>{fit}</Text> : null}
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {best ? (
                <>
                  <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
                    {formatInr(best.price)}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 14 }}>{storeLabel(best.url)}</Text>
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
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Why we recommend it
            </Text>
            <Text style={muted}>{why}</Text>
          </View>
        ) : null}
        {specs.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Key specs
            </Text>
            <View>
              {specs.map(spec => (
                <View
                  key={spec.label}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: C.line,
                  }}
                >
                  <Text style={{ flex: 1, color: C.muted, fontSize: 15 }}>{spec.label}</Text>
                  <Text style={{ flex: 1, color: C.text, fontSize: 15, textAlign: 'right' }}>
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {caveats.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Before you buy
            </Text>
            {caveats.map((line, index) => (
              <Text key={`${index}:${line}`} style={muted}>
                • {line}
              </Text>
            ))}
          </View>
        ) : null}
        {comparison || alternatives.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Compare
            </Text>
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
                    gap: 12,
                    minHeight: 48,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
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
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={2} style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                      {other.title}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 13 }}>{formatInr(decisionPrice(other))}</Text>
                  </View>
                  <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
        {published && !product.demo && sellers.length > 1 ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Where to buy
            </Text>
            <SellerLinks product={product} onLink={onLink} />
          </View>
        ) : null}
        {product.safetyNote ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Notes
            </Text>
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16 }}>
              <Text style={muted}>{product.safetyNote}</Text>
            </View>
          </View>
        ) : null}
        {props.canReturn ? (
          <Button title="← Back to your flow" secondary onPress={props.onReturn} />
        ) : null}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`All details for ${product.title}`}
            onPress={() => setDetails(true)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>All details</Text>
          </Pressable>
          {published && props.onShare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={props.onShare}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>Share</Text>
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
  const text = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const heading = { color: C.text, fontSize: 22, fontWeight: '600', lineHeight: 29 } as const;
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
            <Text style={text}>
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
            <Text style={text}>{option.deliveryNote}</Text>
            {option.offer ? (
              <>
                <Badge>
                  {status === 'expired'
                    ? 'EXPIRED OFFER · DO NOT COUNT AS SAVINGS'
                    : status === 'expiry-unknown'
                      ? 'OFFER EXPIRY UNKNOWN · CHECK WITH SELLER'
                      : 'LISTED OFFER · CHECK ELIGIBILITY'}
                </Badge>
                <Text style={text}>{option.offer.label}</Text>
                <Text style={text}>{option.offer.terms}</Text>
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
      <Text style={heading}>Where to get it</Text>
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
      {product.safetyNote && <Text style={text}>{product.safetyNote}</Text>}
      {product.endorsements.length > 0 && (
        <Disclosure title={`Creator sources · ${product.endorsements.length}`}>
          {product.endorsements.map(endorsement => (
            <Card key={endorsement.creatorId}>
              <Text style={heading}>{endorsement.creatorName}</Text>
              <Text style={text}>{endorsement.disclosure}</Text>
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
