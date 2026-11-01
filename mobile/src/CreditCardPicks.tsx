import { formatInr, formatEventTime } from '../../shared/format';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { MobilePayload } from '../../shared/mobile';
import {
  benefitPeriod,
  benefitRemaining,
  creditCards,
  type CreditCard,
  type CardBenefit,
} from '../../shared/credit-cards';
import { Badge, Button, Card, Field, HabitToggle, Sheet } from './design/components';
import { SwipeDeck, DeckPage } from './SwipeDeck';
import { Disclosure } from './Disclosure';
import { similarFeeCards, cardFeeBand } from '../../shared/card-discovery';
import { CreditCardShowcase } from './CreditCardShowcase';
import { Image } from 'react-native';
import { useTheme } from './design/theme';
const money = formatInr;

export function CreditCardPicks({
  data,
  busy,
  onOpen,
  onChange,
}: {
  data: MobilePayload;
  busy: boolean;
  onOpen: (card: CreditCard) => void;
  onChange: (input: unknown) => Promise<boolean>;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [view, setView] = useState<'discover' | 'owned' | 'add'>('discover');
  const [pending, setPending] = useState<string | null>(null);
  const catalogue = data.library?.cards ?? creditCards;
  const owned = data.profile.cardWallet ?? {};
  const cards = view === 'add' ? catalogue : catalogue.filter(card => Boolean(owned[card.id]));
  async function add(card: CreditCard) {
    if (busy || pending || owned[card.id]) return;
    setPending(card.id);
    try {
      await onChange({ action: 'card-owned', id: card.id, enabled: true });
    } finally {
      setPending(null);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text
        accessibilityRole="header"
        style={{ color: C.text, fontSize: 26, lineHeight: 34, fontWeight: '600' }}
      >
        {view === 'discover' ? 'Credit cards' : view === 'add' ? 'Add cards' : 'My Cards'}
      </Text>
      {view === 'discover' ? (
        <CreditCardShowcase
          cards={catalogue}
          wallet={owned}
          onOpen={onOpen}
          onMyCards={() => setView('owned')}
        />
      ) : (
        <>
          {view === 'add' ? (
            <Button
              title="Done"
              secondary
              disabled={busy || Boolean(pending)}
              onPress={() => setView('owned')}
            />
          ) : (
            <>
              <Button title="← Credit cards" secondary onPress={() => setView('discover')} />
              <Button title="+ Add cards" onPress={() => setView('add')} />
            </>
          )}
          {view === 'owned' && cards.length === 0 && (
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>
              No cards added yet.
            </Text>
          )}
          {cards.map(card => (
            <Card key={card.id}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <View
                  accessible={false}
                  style={{
                    width: 52,
                    height: 38,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: C.lime,
                    backgroundColor: C.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: C.lime, fontSize: 12, fontWeight: '700' }}>
                    {card.issuer.split(' ')[0].slice(0, 4)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{card.issuer}</Text>
                  <Text style={{ color: C.text, fontSize: 18, lineHeight: 25, fontWeight: '600' }}>
                    {card.name}
                  </Text>
                </View>
              </View>
              {view === 'add' ? (
                <Button
                  title={owned[card.id] ? 'Added' : pending === card.id ? 'Adding…' : 'Add'}
                  secondary
                  disabled={busy || Boolean(pending) || Boolean(owned[card.id])}
                  onPress={() => void add(card)}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${card.name}`}
                  onPress={() => onOpen(card)}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.lime, fontSize: 16 }}>View card →</Text>
                </Pressable>
              )}
            </Card>
          ))}
          {view === 'add' && cards.length === 0 && (
            <Text style={{ color: C.muted, fontSize: 15 }}>No cards are available right now.</Text>
          )}
        </>
      )}
    </View>
  );
}

export function CreditCardDetails({
  card,
  data,
  busy,
  onChange,
  onLink,
  onOpen,
  onBack,
}: {
  card: CreditCard;
  data: MobilePayload;
  busy: boolean;
  onChange: (input: unknown) => Promise<boolean>;
  onLink: (url: string) => void;
  onOpen: (card: CreditCard) => void;
  onBack?: () => void;
}) {
  const { colors: C } = useTheme();
  const [details, setDetails] = useState(false);
  const wallet = data.profile.cardWallet?.[card.id];
  const visual = card.imageUrl ? (
    <Image
      source={{ uri: card.imageUrl }}
      accessibilityLabel={card.name}
      resizeMode="contain"
      style={{ width: '95%', height: 210 }}
    />
  ) : (
    <View
      style={{
        width: '92%',
        maxWidth: 330,
        aspectRatio: 1.65,
        borderRadius: 25,
        padding: 24,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.line,
        justifyContent: 'space-between',
        transform: [{ rotate: '-5deg' }],
      }}
    >
      <Text style={{ color: C.muted, fontSize: 14 }}>{card.issuer}</Text>
      <View
        style={{ height: 25, width: 34, borderRadius: 6, backgroundColor: C.lime, opacity: 0.6 }}
      />
      <Text style={{ color: C.text, fontSize: 23, fontWeight: '600' }}>{card.name}</Text>
    </View>
  );
  const pages = [
    <DeckPage
      key="intro"
      eyebrow={card.issuer}
      title={card.name}
      caption={card.curation?.summary ?? card.comparison?.bestFor}
      visual={visual}
    />,
    <DeckPage key="benefits" eyebrow="What it offers" title="For the way you spend.">
      {card.benefits.slice(0, 3).map(benefit => (
        <View
          key={benefit.id}
          style={{ padding: 22, borderRadius: 24, backgroundColor: C.card, gap: 10 }}
        >
          <Text style={{ color: C.lime, fontSize: 21, lineHeight: 28 }}>{benefit.title}</Text>
        </View>
      ))}
      <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 18 }}>
        Eligibility, caps and exclusions apply. Rewards are not guaranteed.
      </Text>
      <Button
        title="All benefits, limits & conditions"
        secondary
        onPress={() => setDetails(true)}
      />
    </DeckPage>,
    <DeckPage
      key="fees"
      eyebrow="Before you decide"
      title={card.annualFee === 0 ? 'No annual fee.' : `${money(card.annualFee)} a year.`}
      caption={
        card.annualFee === 0
          ? 'Other charges and eligibility conditions can still apply.'
          : 'Standard renewal fee, before taxes.'
      }
      visual={visual}
    >
      <Text style={{ color: C.text, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>
        Joining fee:{' '}
        {card.joiningFee === null ? 'not confirmed' : `${money(card.joiningFee)} before tax`}
      </Text>
      <Button
        title="Fee waiver, catches & alternatives"
        secondary
        onPress={() => setDetails(true)}
      />
      <Button
        title="Verify current issuer terms ↗"
        secondary
        onPress={() => onLink(card.sourceUrl)}
      />
    </DeckPage>,
  ];
  return (
    <>
      <SwipeDeck
        pages={pages}
        footer={
          <>
            <Button
              title={wallet ? 'Remove from My Cards' : 'Add to My Cards'}
              secondary={Boolean(wallet)}
              disabled={busy}
              onPress={() => void onChange({ action: 'card-owned', id: card.id, enabled: !wallet })}
            />
            {onBack && <Button title="← Previous card" secondary onPress={onBack} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`All details and conditions for ${card.name}`}
              onPress={() => setDetails(true)}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.muted, fontSize: 14 }}>All details & conditions</Text>
            </Pressable>
          </>
        }
      />
      {details && (
        <Sheet title="Card details & conditions" onClose={() => setDetails(false)}>
          <CreditCardReferenceDetails
            card={card}
            data={data}
            busy={busy}
            onChange={onChange}
            onLink={onLink}
            onOpen={onOpen}
            onBack={onBack}
          />
        </Sheet>
      )}
    </>
  );
}
function CreditCardReferenceDetails({
  card,
  data,
  busy,
  onChange,
  onLink,
  onOpen,
  onBack,
}: {
  card: CreditCard;
  data: MobilePayload;
  busy: boolean;
  onChange: (input: unknown) => Promise<boolean>;
  onLink: (url: string) => void;
  onOpen: (card: CreditCard) => void;
  onBack?: () => void;
}) {
  const { colors: C } = useTheme();
  const wallet = data.profile.cardWallet?.[card.id];
  const [fee, setFee] = useState(
    wallet?.annualFeeOverride === undefined ? '' : String(wallet.annualFeeOverride),
  );
  const alternatives = similarFeeCards(card, data.library?.cards ?? creditCards);
  const text = { color: C.muted, fontSize: 15, lineHeight: 23 } as const;
  const heading = { color: C.text, fontSize: 21, fontWeight: '600', lineHeight: 28 } as const;
  return (
    <View style={{ gap: 16 }}>
      {onBack && <Button title="← Previous card" secondary onPress={onBack} />}
      <View
        style={{
          minHeight: 140,
          borderRadius: 22,
          padding: 22,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          justifyContent: 'space-between',
          gap: 18,
        }}
      >
        <Text style={{ color: C.lime, fontSize: 14, fontWeight: '600' }}>{card.issuer}</Text>
        <Text style={{ color: C.text, fontSize: 25, lineHeight: 33, fontWeight: '600' }}>
          {card.name}
        </Text>
        <Text style={text}>
          {card.annualFee === 0
            ? 'No annual membership fee'
            : `${money(card.annualFee)} renewal / year + tax`}
        </Text>
      </View>
      {card.curation && (
        <>
          <Badge>{card.curation.badge} · editorial selection</Badge>
          <Text style={text}>{card.curation.summary}</Text>
        </>
      )}
      <Button
        title={wallet ? 'Remove from my cards' : 'Add to My Cards'}
        secondary={Boolean(wallet)}
        disabled={busy}
        onPress={() => void onChange({ action: 'card-owned', id: card.id, enabled: !wallet })}
      />
      <Text accessibilityRole="header" style={heading}>
        What you get
      </Text>
      {card.benefits.map(benefit => (
        <Disclosure key={benefit.id} title={benefit.title}>
          <Text style={text}>{benefit.summary}</Text>
          <Text style={{ ...text, fontSize: 13 }}>{benefit.conditions}</Text>
          <Button
            title="Issuer benefit terms ↗"
            secondary
            onPress={() => onLink(benefit.sourceUrl)}
          />
          {wallet && benefit.tracker ? (
            <Disclosure title="My benefit usage">
              <BenefitTracker
                key={`${card.id}:${benefit.id}:${benefitPeriod(benefit.tracker.period, new Date(), wallet.usage[benefit.id])?.start ?? 'unknown'}`}
                card={card}
                benefit={benefit}
                data={data}
                busy={busy}
                onChange={onChange}
              />
            </Disclosure>
          ) : null}
        </Disclosure>
      ))}
      <Disclosure title="Fees & catches">
        <Text style={text}>
          Renewal: {money(card.annualFee)} before tax. Joining:{' '}
          {card.joiningFee === null ? 'not confirmed' : `${money(card.joiningFee)} before tax`}.
        </Text>
        <Text style={text}>{card.feeNote}</Text>
        <Text style={text}>{card.waiver}</Text>
        {card.reviewNote && <Text style={text}>{card.reviewNote}</Text>}
        {card.comparison?.watchOut && <Text style={text}>{card.comparison.watchOut}</Text>}
      </Disclosure>
      {wallet && (
        <Disclosure title="My fee terms">
          <Field
            label="Your annual fee before tax (blank = standard; 0 = lifetime free)"
            value={fee}
            onChange={setFee}
            numeric
          />
          <Button
            title="Save my fee"
            secondary
            disabled={
              busy || (fee.trim() !== '' && (!Number.isFinite(Number(fee)) || Number(fee) < 0))
            }
            onPress={() =>
              void onChange({
                action: 'card-fee',
                id: card.id,
                annualFee: fee.trim() === '' ? null : Number(fee),
              })
            }
          />
          <Text style={{ ...text, fontSize: 12 }}>
            User-entered terms, not verified with the issuer. Never enter card numbers, CVV, PIN or
            bank credentials.
          </Text>
        </Disclosure>
      )}
      <Disclosure title="Why we shortlisted it">
        {card.curation?.placements.map(placement => (
          <View key={placement.topic} style={{ gap: 5 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
              #{placement.rank} · {placement.topic}
            </Text>
            <Text style={text}>{placement.reason}</Text>
          </View>
        ))}
        <Text style={{ ...text, fontSize: 12 }}>
          Editorial assessment of published terms, not a study or guarantee of value. Source checked{' '}
          {card.checkedAt}; verify current issuer rules.
        </Text>
        <Button
          title="Read issuer fees & terms ↗"
          secondary
          onPress={() => onLink(card.sourceUrl)}
        />
      </Disclosure>
      {alternatives.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={heading}>
            Similar annual fee
          </Text>
          <Text style={{ ...text, fontSize: 13 }}>
            {cardFeeBand(card.annualFee)} before tax · related uses, not guaranteed substitutes.
          </Text>
          {alternatives.map(other => (
            <Card key={other.id}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{other.issuer}</Text>
              <Text style={{ color: C.text, fontSize: 18, lineHeight: 25, fontWeight: '600' }}>
                {other.name}
              </Text>
              <Text style={text}>
                {other.curation?.summary ?? other.comparison?.bestFor ?? other.benefits[0]?.title}
              </Text>
              <Badge>
                {other.annualFee === 0 ? 'No annual fee' : `${money(other.annualFee)} / year + tax`}
              </Badge>
              <Button title="Explore alternative →" secondary onPress={() => onOpen(other)} />
            </Card>
          ))}
        </View>
      )}
      <Text style={{ ...text, fontSize: 12 }}>
        Choose for spending you already planned. No card is essential for everyone; pay in full
        because interest can outweigh rewards.
      </Text>
    </View>
  );
}

function BenefitTracker({
  card,
  benefit,
  data,
  busy,
  onChange,
}: {
  card: CreditCard;
  benefit: CardBenefit;
  data: MobilePayload;
  busy: boolean;
  onChange: (input: unknown) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const record = data.profile.cardWallet?.[card.id]?.usage[benefit.id];
  const expected = benefitPeriod(benefit.tracker!.period, new Date(), record);
  const current =
    record &&
    expected &&
    record.start === expected.start &&
    record.end === expected.end &&
    record.termsVersion === card.revision;
  const [used, setUsed] = useState(current ? String(record.used) : '');
  const [eligible, setEligible] = useState(Boolean(current && record.eligible));
  const [start, setStart] = useState(current ? record.start : '');
  const [end, setEnd] = useState(current ? record.end : '');
  const tracker = benefit.tracker!;
  const remaining = benefitRemaining(card, benefit, record);
  const valid =
    used.trim() !== '' &&
    Number.isFinite(Number(used)) &&
    Number(used) >= 0 &&
    Number(used) <= tracker.limit &&
    (tracker.unit !== 'uses' || Number.isInteger(Number(used)));
  const unit = tracker.unit === 'INR' ? 'rupees' : tracker.unit;
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: C.lime, fontSize: 19, fontWeight: '600' }}>
        {remaining === null
          ? 'Remaining unknown—check usage & eligibility'
          : `${remaining} ${unit} left according to your log`}
      </Text>
      <Badge>
        Published cap: {tracker.limit} {unit} / {tracker.period}. Not a balance from your bank.
      </Badge>
      {tracker.period === 'billing-cycle' ? (
        <>
          <Field
            label="Current billing cycle start (YYYY-MM-DD)"
            value={start}
            onChange={setStart}
          />
          <Field label="Current billing cycle end (YYYY-MM-DD)" value={end} onChange={setEnd} />
          <Badge>Use exact statement dates. Billing cycles are not calendar months.</Badge>
        </>
      ) : (
        <Badge>
          Current period (India): {expected?.start} to {expected?.end}
        </Badge>
      )}
      <Field label={`Already used this period (${unit})`} value={used} onChange={setUsed} numeric />
      <HabitToggle
        title="I checked current eligibility and total usage with the issuer"
        detail="Include spending thresholds, pending or reversed benefits and transactions outside this app. Do not assume all published benefits are unlocked."
        checked={eligible}
        disabled={busy}
        onChange={setEligible}
      />
      <Button
        title="Save my usage snapshot"
        secondary
        disabled={busy || !valid}
        onPress={() =>
          void onChange({
            action: 'card-usage',
            id: card.id,
            benefitId: benefit.id,
            used: Number(used),
            eligible,
            ...(tracker.period === 'billing-cycle' ? { start, end } : expected),
          })
        }
      />
      {record && (
        <Badge>
          Last manual entry: {formatEventTime(new Date(record.checkedAt))}. New periods and changed
          terms require a new check.
        </Badge>
      )}
    </View>
  );
}
