import { formatEventTime } from '../../shared/format';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import type { MobilePayload } from '../../shared/mobile';
import {
  benefitPeriod,
  benefitRemaining,
  creditCards,
  type CreditCard,
  type CardBenefit,
} from '../../shared/credit-cards';
import { cardCell, formatFee, spendCategories } from '../../shared/card-table';
import { bestCardInCategory } from '../../shared/card-shelves';
import { Badge, Button, Field, HabitToggle } from './design/components';
import { useTheme } from './design/theme';

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
  const wallet = data.profile.cardWallet?.[card.id];
  const [pictureWidth, setPictureWidth] = useState(0);
  const [fee, setFee] = useState(
    wallet?.annualFeeOverride === undefined ? '' : String(wallet.annualFeeOverride),
  );
  const catalogue = data.library?.cards ?? creditCards;
  const ownedLabel = wallet ? '✓ In my cards' : 'Add to my cards';
  const groups = spendCategories.flatMap(category => {
    const benefits = card.benefits.filter(benefit => benefit.category === category);
    return benefits.length ? [{ category, benefits }] : [];
  });
  const compared = spendCategories.flatMap(category => {
    if (!cardCell(card, category)) return [];
    const best = bestCardInCategory(
      catalogue.filter(other => other.id !== card.id),
      category,
    );
    return best ? [{ category, card: best.card, label: best.label }] : [];
  });
  const glance: { label: string; value: string }[] = [
    { label: 'Annual fee', value: formatFee(card.annualFee) },
  ];
  if (card.joiningFee !== null) glance.push({ label: 'Joining fee', value: formatFee(card.joiningFee) });
  if (card.waiver.trim()) glance.push({ label: 'Fee waiver', value: card.waiver });
  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 48, gap: 16 }}
    >
      <View
        onLayout={event => setPictureWidth(event.nativeEvent.layout.width)}
        style={{
          width: '100%',
          aspectRatio: 1.586,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: C.card,
        }}
      >
        {pictureWidth > 0 &&
          (card.imageUrl ? (
            <Image
              source={{ uri: card.imageUrl }}
              accessible={false}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{card.issuer}</Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>{card.name}</Text>
            </View>
          ))}
      </View>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 26, fontWeight: '700' }}>
          {card.name}
        </Text>
        <Text style={{ color: C.muted, fontSize: 15 }}>{card.issuer}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ownedLabel}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void onChange({ action: 'card-owned', id: card.id, enabled: !wallet })}
        style={({ pressed }) => ({
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 26,
          backgroundColor: C.lime,
          opacity: busy ? 0.5 : pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ color: C.onAccent, fontSize: 16, fontWeight: '700' }}>{ownedLabel}</Text>
      </Pressable>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
          At a glance
        </Text>
        {glance.map(row => (
          <View key={row.label} style={{ gap: 2 }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{row.label}</Text>
            <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{row.value}</Text>
          </View>
        ))}
      </View>
      {wallet && (
        <View style={{ gap: 8 }}>
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
          <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>
            User-entered terms, not verified with the issuer. Never enter card numbers, CVV, PIN or
            bank credentials.
          </Text>
        </View>
      )}
      {card.comparison?.bestFor ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            Best for
          </Text>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{card.comparison.bestFor}</Text>
        </View>
      ) : null}
      {card.comparison?.watchOut ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            Watch out
          </Text>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{card.comparison.watchOut}</Text>
        </View>
      ) : null}
      {card.curation?.summary ? (
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{card.curation.summary}</Text>
      ) : null}
      {groups.length > 0 && (
        <View style={{ gap: 14 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            Benefits
          </Text>
          {groups.map(group => (
            <View key={group.category} style={{ gap: 10 }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{group.category}</Text>
              {group.benefits.map(benefit => (
                <View key={benefit.id} style={{ gap: 4 }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{benefit.title}</Text>
                  <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{benefit.summary}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{benefit.conditions}</Text>
                  {wallet && benefit.tracker ? (
                    <BenefitTracker
                      key={`${card.id}:${benefit.id}:${benefitPeriod(benefit.tracker.period, new Date(), wallet.usage[benefit.id])?.start ?? 'unknown'}`}
                      card={card}
                      benefit={benefit}
                      data={data}
                      busy={busy}
                      onChange={onChange}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
      {compared.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            Against similar cards
          </Text>
          {compared.map(other => (
            <Pressable
              key={other.category}
              accessibilityRole="button"
              accessibilityLabel={`${other.category}: ${other.card.name}`}
              onPress={() => onOpen(other.card)}
              style={({ pressed }) => ({ gap: 2, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: C.text, fontSize: 15 }}>
                {other.category}: {other.card.name}
              </Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{other.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verify current issuer terms"
        onPress={() => onLink(card.sourceUrl)}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Verify current issuer terms</Text>
      </Pressable>
      {card.reviewNote ? (
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{card.reviewNote}</Text>
      ) : null}
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          onPress={onBack}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ color: C.muted, fontSize: 15 }}>Previous card</Text>
        </Pressable>
      )}
    </ScrollView>
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
