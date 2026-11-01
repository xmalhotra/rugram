import { formatInr, formatEventTime } from '../../shared/format';
import { PickInsight } from './PickInsight';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import { productCategoryLabel, type MobilePayload, type Product } from '../../shared/mobile';
import {
  offerState,
  purchaseHost,
  sortedPurchaseOptions,
  storeLabel,
  type PurchaseOption,
} from '../../shared/purchases';
import { Badge, Button, Card, Sheet } from './design/components';
import { SwipeDeck, DeckPage, DeckImage } from './SwipeDeck';
import { alternativePicks } from '../../shared/pick-comparison';
import { browseProducts } from '../../shared/pick-catalog';
import { decisionAlternative, decisionLine } from '../../shared/pick-decision';
import { PickDecisionComparison } from './PickDecisionComparison';
import { EquipmentThumbnail } from './EquipmentThumbnail';
import { useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
import { SellerLink, SellerLinks } from './SellerLinks';
const money = formatInr;
export function PickDetails(props: React.ComponentProps<typeof PickReferenceDetails>) {
  const { product, data, onAlternative, onLink } = props;
  const { colors: C } = useTheme();
  const [details, setDetails] = useState(false);
  const library = browseProducts(data);
  const alternatives = alternativePicks(product, library);
  const comparison = decisionAlternative(product, library);
  const specs = (product.specifications ?? []).filter(spec => spec.value.length <= 90).slice(0, 2);
  const text = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const pages = [
    <DeckPage
      key="intro"
      eyebrow={product.subcategory ?? product.category}
      title={product.title}
      caption={decisionLine(product.assessment?.bestFor ?? product.summary)}
      visual={<DeckImage uri={product.imageUrl} label={product.title} />}
    />,
    <DeckPage
      key="fit"
      eyebrow="Before you choose"
      title="Why consider it?"
      caption={decisionLine(product.assessment?.whyChosen ?? product.summary)}
    >
      {specs.map(spec => (
        <View
          key={spec.label}
          style={{ padding: 16, borderRadius: 18, backgroundColor: C.card, gap: 5 }}
        >
          <Text style={{ color: C.lime, fontSize: 12 }}>{spec.label}</Text>
          <Text style={{ color: C.text, fontSize: 17, lineHeight: 24 }}>{spec.value}</Text>
        </View>
      ))}
      {product.assessment?.tradeoffs[0] && (
        <View style={{ padding: 16, borderRadius: 18, backgroundColor: C.card, gap: 5 }}>
          <Text style={{ color: C.lime, fontSize: 12 }}>The trade-off</Text>
          <Text style={text}>{decisionLine(product.assessment.tradeoffs[0])}</Text>
        </View>
      )}
      <Button title="Specs, evidence & trade-offs" secondary onPress={() => setDetails(true)} />
    </DeckPage>,
    <DeckPage
      key="choose"
      eyebrow="Your choice"
      title={
        comparison
          ? 'Same budget. Different fit.'
          : alternatives.length
            ? 'See what else fits.'
            : 'Keep it for later.'
      }
    >
      {comparison ? (
        <PickDecisionComparison
          product={product}
          other={comparison}
          onAlternative={onAlternative}
          onLink={onLink}
        />
      ) : (
        <>
          {alternatives.slice(0, 2).map(other => (
            <Pressable
              key={other.id}
              accessibilityRole="button"
              accessibilityLabel={`View alternative ${other.title}`}
              onPress={() => onAlternative(other)}
              style={{ padding: 18, borderRadius: 20, backgroundColor: C.card, minHeight: 60 }}
            >
              <Text style={{ color: C.text, fontSize: 17 }}>{other.title} →</Text>
            </Pressable>
          ))}
          <SellerLinks product={product} onLink={onLink} />
        </>
      )}
      {product.safetyNote && (
        <Button title="Suitability & important notes" secondary onPress={() => setDetails(true)} />
      )}
    </DeckPage>,
  ];
  return (
    <>
      <SwipeDeck
        pages={pages}
        footer={
          <>
            <Button
              title={
                data.profile.savedProductIds.includes(product.id)
                  ? 'Remove from saved'
                  : 'Save this Pick'
              }
              disabled={props.busy || product.status !== 'published'}
              onPress={props.onSave}
            />
            {props.canReturn && (
              <Button title="← Back to your flow" secondary onPress={props.onReturn} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`All details for ${product.title}`}
              onPress={() => setDetails(true)}
              style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={text}>All details</Text>
            </Pressable>
          </>
        }
      />
      {details && (
        <Sheet title="Product details" onClose={() => setDetails(false)}>
          <PickReferenceDetails {...props} />
        </Sheet>
      )}
    </>
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
