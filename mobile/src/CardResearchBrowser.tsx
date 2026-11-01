import { formatInr, formatDate } from '../../shared/format';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { CreditCard, CardWallet } from '../../shared/credit-cards';
import {
  cardOfferState,
  filterCardListings,
  type CardListing,
  type CardOffer,
  type CardResearch,
} from '../../shared/card-research';
import { Text } from './design/Text';
import { Badge, Button, Choice, Field, Sheet } from './design/components';
import { useTheme } from './design/theme';
import { SwipeDeck, DeckPage } from './SwipeDeck';
import { Disclosure } from './Disclosure';

export function CardResearchBrowser({
  research,
  cards,
  wallet,
  onOpen,
  onMyCards,
  onLink,
}: {
  research: CardResearch;
  cards: CreditCard[];
  wallet: CardWallet;
  onOpen: (card: CreditCard) => void;
  onMyCards: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [view, setView] = useState('Cards');
  const [issuer, setIssuer] = useState('All');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [legacy, setLegacy] = useState(false);
  const [platform, setPlatform] = useState('All');
  const [listing, setListing] = useState<CardListing | null>(null);
  const items = filterCardListings(research.listings, issuer, query, legacy);
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/credit|cards?|bank/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .sort()
      .join('');
  function open(item: CardListing) {
    const reviewed = cards.find(
      card => item.reviewedCardId === card.id || normalize(card.name) === normalize(item.title),
    );
    if (reviewed) onOpen(reviewed);
    else setListing(item);
  }
  const text = { color: C.muted, fontSize: 14, lineHeight: 21 } as const;
  function offerRow(offer: CardOffer) {
    const state = cardOfferState(offer);
    return (
      <View
        key={offer.id}
        style={{ padding: 18, borderWidth: 1, borderColor: C.line, borderRadius: 20, gap: 8 }}
      >
        <Text style={{ color: C.text, fontSize: 18, lineHeight: 25, fontWeight: '600' }}>
          {offer.title}
        </Text>
        <Badge>
          {state === 'expired'
            ? 'Expired · reference only'
            : state === 'needs-review'
              ? 'Terms review pending'
              : state === 'upcoming'
                ? 'Upcoming'
                : 'Within published dates · check eligibility'}
        </Badge>
        <Text style={text}>
          {offer.paymentRoute === 'voucher'
            ? 'Via voucher purchase'
            : offer.paymentRoute === 'emi'
              ? 'EMI only'
              : offer.paymentRoute === 'upi'
                ? 'UPI route'
                : offer.paymentRoute === 'portal'
                  ? 'Via bank portal'
                  : 'Direct payment'}{' '}
          ·{' '}
          {offer.benefitType === 'points'
            ? 'Reward points, not cash'
            : offer.ratePercent !== null
              ? `${offer.ratePercent}% ${offer.benefitType}`
              : offer.maxSaving !== null
                ? `Up to ${formatInr(offer.maxSaving)}`
                : 'Value subject to terms'}
        </Text>
        <Disclosure title="Eligibility & limits">
          <Text style={text}>Eligible: {offer.eligibleCards.join(', ')}</Text>
          {offer.excludedCards.length > 0 && (
            <Text style={text}>Excluded: {offer.excludedCards.join(', ')}</Text>
          )}
          <Text style={text}>
            Minimum: {offer.minSpend === null ? 'unverified' : `₹${offer.minSpend}`} · cap:{' '}
            {offer.maxSaving === null ? 'unverified' : `₹${offer.maxSaving}`}
          </Text>
          <Text style={text}>{offer.frequency}</Text>
          <Text style={text}>{offer.conditions}</Text>
          <Text style={text}>
            Expiry: {offer.endsAt ? formatDate(new Date(offer.endsAt)) : 'unverified'} · stacking:{' '}
            {offer.stacking}
          </Text>
          <Badge>Checked {formatDate(new Date(offer.checkedAt))}</Badge>
        </Disclosure>
        <Button title="Read offer source ↗" secondary onPress={() => onLink(offer.sourceUrl)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      <Button title={`My Cards · ${Object.keys(wallet).length}`} secondary onPress={onMyCards} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {['Cards', 'Platform offers', 'Coverage'].map(title => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected: view === title }}
            onPress={() => setView(title)}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 14,
              backgroundColor: view === title ? C.lime : C.card,
            }}
          >
            <Text
              style={{
                color: view === title ? C.onAccent : C.text,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {view === 'Cards' && (
        <>
          <Text style={text}>
            Source-listed directory · not yet an exhaustive list of cards open for new applications.
          </Text>
          <Field
            label="Search cards or issuer"
            value={query}
            onChange={value => {
              setQuery(value);
              setLimit(20);
            }}
          />
          <Choice
            label="Issuer"
            value={research.issuers.find(item => item.id === issuer)?.title ?? 'All'}
            options={['All', ...research.issuers.map(item => item.title)]}
            onChange={title => {
              setIssuer(research.issuers.find(item => item.title === title)?.id ?? 'All');
              setLimit(20);
            }}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Include paused, legacy and discontinued cards"
            accessibilityState={{ checked: legacy }}
            onPress={() => {
              setLegacy(value => !value);
              setLimit(20);
            }}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 14 }}>
              {legacy ? '☑' : '☐'} Include paused, legacy & discontinued
            </Text>
          </Pressable>
          <Badge>{items.length} listings · fees remain unknown until verified</Badge>
          {items.slice(0, limit).map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => open(item)}
              style={{
                padding: 17,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.line,
                backgroundColor: C.card,
                gap: 6,
                minHeight: 88,
              }}
            >
              <Badge>{item.issuer}</Badge>
              <Text style={{ color: C.text, fontSize: 17, lineHeight: 24, fontWeight: '600' }}>
                {item.title} →
              </Text>
              <Text style={text}>
                {item.availability === 'open'
                  ? 'Issuer marked open · check eligibility'
                  : item.availability === 'invitation-only'
                    ? 'Invitation-only · verify with issuer'
                    : item.availability === 'listed-unverified'
                      ? 'New applications unverified'
                      : item.availability}
              </Text>
            </Pressable>
          ))}
          {items.length > limit && (
            <Button title="Show 20 more" secondary onPress={() => setLimit(value => value + 20)} />
          )}
          {items.length === 0 && (
            <Text style={text}>
              No reviewed directory names here yet. Check Coverage for the issuer source; this does
              not mean the issuer has no cards.
            </Text>
          )}
          <Disclosure title={`Previously reviewed cards · ${cards.length}`}>
            {cards.map(card => (
              <Button
                key={card.id}
                title={`${card.name} →`}
                secondary
                onPress={() => onOpen(card)}
              />
            ))}
          </Disclosure>
        </>
      )}
      {view === 'Platform offers' && (
        <>
          <Choice
            label="Platform"
            value={research.platforms.find(item => item.id === platform)?.title ?? 'All'}
            options={['All', ...research.platforms.map(item => item.title)]}
            onChange={title =>
              setPlatform(research.platforms.find(item => item.title === title)?.id ?? 'All')
            }
          />
          <Text style={text}>
            Research leads, not guaranteed savings. Expired offers are labelled; incomplete terms
            are not used for recommendations.
          </Text>
          {research.offers
            .filter(offer => platform === 'All' || offer.platformId === platform)
            .map(offerRow)}
          {platform !== 'All' && !research.offers.some(offer => offer.platformId === platform) && (
            <View style={{ gap: 10 }}>
              <Text style={text}>
                Offer collection pending. No verified current offer is recorded; this does not mean
                none exists.
              </Text>
              <Button
                title="Open platform ↗"
                secondary
                onPress={() =>
                  onLink(research.platforms.find(item => item.id === platform)!.sourceUrl)
                }
              />
            </View>
          )}
        </>
      )}
      {view === 'Coverage' && (
        <>
          <Text style={text}>
            {research.listings.length} discovered listings · {research.issuers.length} issuer
            sources · {research.platforms.length} platform targets. Completeness is not certified.
            Network variants, business/secured cards and invitation-only products need separate
            audits.
          </Text>
          {research.issuers.map(item => (
            <Disclosure key={item.id} title={`${item.title} · ${item.coverage}`}>
              <Text style={text}>{item.note}</Text>
              <Badge>
                {research.listings.filter(card => card.issuerId === item.id).length} names collected
                · checked {formatDate(new Date(item.checkedAt))}
              </Badge>
              <Button title="Issuer source ↗" secondary onPress={() => onLink(item.sourceUrl)} />
            </Disclosure>
          ))}
          <Disclosure title="Platform collection gaps">
            {research.platforms.map(item => (
              <View key={item.id} style={{ gap: 5, paddingVertical: 10 }}>
                <Text style={{ color: C.text, fontSize: 16 }}>
                  {item.title} · {item.coverage}
                </Text>
                <Text style={text}>{item.note}</Text>
              </View>
            ))}
          </Disclosure>
        </>
      )}
      {listing && (
        <Sheet
          title={listing.issuer}
          fullScreen
          scrollable={false}
          onClose={() => setListing(null)}
        >
          <SwipeDeck
            pages={[
              <DeckPage
                key="name"
                eyebrow={listing.issuer}
                title={listing.title}
                caption={
                  listing.availability === 'listed-unverified'
                    ? 'Source listed. New applications not yet verified.'
                    : listing.availability
                }
                visual={
                  <View
                    style={{
                      width: 280,
                      height: 170,
                      borderWidth: 1,
                      borderColor: C.line,
                      backgroundColor: C.card,
                      borderRadius: 24,
                      padding: 25,
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: C.lime, fontSize: 14 }}>{listing.issuer}</Text>
                    <Text style={{ color: C.text, fontSize: 21 }}>{listing.title}</Text>
                  </View>
                }
              />,
              <DeckPage
                key="terms"
                eyebrow="Not yet reviewed"
                title="Unknown is not free."
                caption={listing.note}
              >
                <Text style={text}>
                  Annual fee:{' '}
                  {listing.annualFee === null ? 'not verified' : `₹${listing.annualFee}`}
                </Text>
                <Text style={text}>
                  Joining fee:{' '}
                  {listing.joiningFee === null ? 'not verified' : `₹${listing.joiningFee}`}
                </Text>
                <Text style={text}>
                  Exact card/network variants and complete terms are pending. This listing is not a
                  recommendation.
                </Text>
              </DeckPage>,
              <DeckPage
                key="source"
                eyebrow="Research first"
                title="Check the issuer."
                caption="An issuer-wide offer does not necessarily include every card from that bank."
              >
                <Text style={text}>
                  Fees and eligibility must be reviewed before this listing can be used to calculate
                  personal value.
                </Text>
              </DeckPage>,
            ]}
            footer={<Button title="Official source ↗" onPress={() => onLink(listing.sourceUrl)} />}
          />
        </Sheet>
      )}
    </View>
  );
}
