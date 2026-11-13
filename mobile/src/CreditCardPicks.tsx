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
import { Badge, Button, Field, HabitToggle, SectionHeader } from './design/components';
import { hit, opacity, radius, space, useTheme } from './design/theme';

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
      contentContainerStyle={{ paddingBottom: 48, gap: space.md }}
    >
      <View
        onLayout={event => setPictureWidth(event.nativeEvent.layout.width)}
        style={{
          width: '100%',
          aspectRatio: 1.586,
          borderRadius: radius.small,
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
            <View style={{ flex: 1, padding: space.md, justifyContent: 'space-between' }}>
              <Text variant="footnote" style={{ color: C.muted }}>{card.issuer}</Text>
              <Text variant="headline" style={{ color: C.text }}>{card.name}</Text>
            </View>
          ))}
      </View>
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
          {card.name}
        </Text>
        <Text variant="subhead" style={{ color: C.muted }}>{card.issuer}</Text>
      </View>
      <Button
        title={ownedLabel}
        accessibilityLabel={ownedLabel}
        disabled={busy}
        onPress={() => void onChange({ action: 'card-owned', id: card.id, enabled: !wallet })}
      />
      <View style={{ gap: space.ms }}>
        <SectionHeader title="At a glance" />
        {glance.map(row => (
          <View key={row.label} style={{ gap: space.xxs }}>
            <Text variant="footnote" style={{ color: C.muted }}>{row.label}</Text>
            <Text variant="subhead" style={{ color: C.text }}>{row.value}</Text>
          </View>
        ))}
      </View>
      {wallet && (
        <View style={{ gap: space.sm }}>
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
          <Text variant="caption" style={{ color: C.muted }}>
            User-entered terms, not verified with the issuer. Never enter card numbers, CVV, PIN or
            bank credentials.
          </Text>
        </View>
      )}
      {card.comparison?.bestFor ? (
        <View style={{ gap: space.xs }}>
          <SectionHeader title="Best for" />
          <Text variant="subhead" style={{ color: C.text }}>{card.comparison.bestFor}</Text>
        </View>
      ) : null}
      {card.comparison?.watchOut ? (
        <View style={{ gap: space.xs }}>
          <SectionHeader title="Watch out" />
          <Text variant="subhead" style={{ color: C.text }}>{card.comparison.watchOut}</Text>
        </View>
      ) : null}
      {card.curation?.summary ? (
        <Text variant="subhead" style={{ color: C.text }}>{card.curation.summary}</Text>
      ) : null}
      {groups.length > 0 && (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Benefits" />
          {groups.map(group => (
            <View key={group.category} style={{ gap: space.ms }}>
              <Text variant="footnote" style={{ color: C.muted }}>{group.category}</Text>
              {group.benefits.map(benefit => (
                <View key={benefit.id} style={{ gap: space.xs }}>
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{benefit.title}</Text>
                  <Text variant="subhead" style={{ color: C.text }}>{benefit.summary}</Text>
                  <Text variant="footnote" style={{ color: C.muted }}>{benefit.conditions}</Text>
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
        <View style={{ gap: space.ms }}>
          <SectionHeader title="Against similar cards" />
          {compared.map(other => (
            <Pressable
              key={other.category}
              accessibilityRole="button"
              accessibilityLabel={`${other.category}: ${other.card.name}`}
              onPress={() => onOpen(other.card)}
              style={({ pressed }) => ({ gap: space.xxs, opacity: pressed ? opacity.pressed : 1 })}
            >
              <Text variant="subhead" style={{ color: C.text }}>
                {other.category}: {other.card.name}
              </Text>
              <Text variant="footnote" style={{ color: C.muted }}>{other.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button
        variant="text"
        title="Verify current issuer terms"
        accessibilityLabel="Verify current issuer terms"
        onPress={() => onLink(card.sourceUrl)}
      />
      {card.reviewNote ? (
        <Text variant="footnote" style={{ color: C.muted }}>{card.reviewNote}</Text>
      ) : null}
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          onPress={onBack}
          style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="subhead" style={{ color: C.muted }}>Previous card</Text>
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
    <View style={{ gap: space.ms }}>
      <Text variant="section" style={{ color: C.lime }}>
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
