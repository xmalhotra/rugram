import { formatInr } from '../../shared/format';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import type { CardBenefit, CreditCard, CardWallet } from '../../shared/credit-cards';
import { Button, Chip } from './design/components';
import { Disclosure } from './Disclosure';
import { hit, radius, space, useTheme } from './design/theme';
const money = formatInr;
export function CardComparison({
  cards,
  wallet,
  onOpen,
}: {
  cards: CreditCard[];
  wallet: CardWallet;
  onOpen: (card: CreditCard) => void;
}) {
  const { colors: C } = useTheme();
  const [category, setCategory] = useState<CardBenefit['category']>('Online shopping');
  const categories = [
    ...new Set(cards.flatMap(card => card.benefits.map(benefit => benefit.category))),
  ];
  const fees = Object.fromEntries(
    Object.entries(wallet).flatMap(([id, entry]) =>
      entry.annualFeeOverride === undefined ? [] : [[id, entry.annualFeeOverride]],
    ),
  );
  const rows: { label: string; values: (string | React.ReactNode)[]; accent?: boolean }[] = [
    {
      label: 'Card',
      values: cards.map(card => (
        <Pressable
          key={card.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${card.name}`}
          onPress={() => onOpen(card)}
          style={{ minHeight: hit, justifyContent: 'center' }}
        >
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>
            {card.name} →
          </Text>
        </Pressable>
      )),
    },
    {
      label: 'Benefit here',
      values: cards.map(
        card =>
          card.benefits
            .filter(benefit => benefit.category === category)
            .map(benefit => benefit.summary)
            .join(' · ') || 'No benefit verified in this category',
      ),
    },
    {
      label: 'Cashback rate',
      values: cards.map(
        card =>
          card.benefits
            .filter(benefit => benefit.category === category && benefit.cashback)
            .map(benefit => `${benefit.cashback!.rate}% · ${benefit.title}`)
            .join(' · ') || 'See benefit terms',
      ),
    },
    {
      label: 'Benefit cap',
      values: cards.map(
        card =>
          card.benefits
            .filter(benefit => benefit.category === category && benefit.tracker)
            .map(
              benefit =>
                `${benefit.tracker!.unit === 'INR' ? money(benefit.tracker!.limit) : `${benefit.tracker!.limit} ${benefit.tracker!.unit}`} / ${benefit.tracker!.period} · ${benefit.title}`,
            )
            .join(' · ') || 'Check benefit terms',
      ),
    },
    {
      label: 'Annual fee',
      values: cards.map(
        card =>
          `${money(fees[card.id] ?? card.annualFee)} + tax${fees[card.id] !== undefined ? ' · your fee' : ''}`,
      ),
    },
    {
      label: 'Fits best',
      values: cards.map(
        card => card.comparison?.bestFor ?? card.benefits[0]?.title ?? 'Not assessed',
      ),
    },
    {
      label: 'Main trade-off',
      values: cards.map(
        card =>
          card.comparison?.watchOut ??
          card.reviewNote ??
          'Check eligible merchants, redemption and fees.',
      ),
    },
    {
      label: 'Check details',
      values: cards.map(card => (
        <Button key={card.id} title="Terms & benefits →" secondary onPress={() => onOpen(card)} />
      )),
    },
  ];
  return (
    <View style={{ gap: space.md }}>
      <Text variant="heading" style={{ color: C.text }}>Compare card benefits</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
      >
        {categories.map(item => (
          <Chip
            key={item}
            title={item}
            active={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </ScrollView>
      <Text variant="caption" style={{ color: C.muted }}>Swipe table sideways to compare cards →</Text>
      <ScrollView horizontal directionalLockEnabled showsHorizontalScrollIndicator>
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: radius.control, overflow: 'hidden' }}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                backgroundColor: index % 2 === 0 ? C.card : C.bg,
                borderBottomWidth: index === rows.length - 1 ? 0 : 1,
                borderBottomColor: C.line,
              }}
            >
              <View
                style={{
                  width: 108,
                  padding: space.ms,
                  justifyContent: 'center',
                  borderRightWidth: 1,
                  borderRightColor: C.line,
                }}
              >
                <Text variant="footnote" style={{ color: C.muted, fontWeight: '600' }}>
                  {row.label}
                </Text>
              </View>
              {row.values.map((value, column) => (
                <View
                  key={cards[column].id}
                  style={{
                    width: 178,
                    padding: space.ms,
                    minHeight: 66,
                    justifyContent: 'center',
                    borderRightWidth: column === cards.length - 1 ? 0 : 1,
                    borderRightColor: C.line,
                  }}
                >
                  {typeof value === 'string' ? (
                    <Text
                      variant={row.accent ? 'section' : 'subhead'}
                      style={{ color: row.accent ? C.lime : C.text }}
                    >
                      {value}
                    </Text>
                  ) : (
                    value
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text variant="caption" style={{ color: C.muted }}>
        Published benefits, not a personal savings estimate. Eligibility, exclusions, fees and taxes
        apply. Pay in full; borrowing costs can outweigh rewards.
      </Text>
      <Disclosure title="Eligibility, waivers & sources">
        {cards.map(card => (
          <View key={card.id} style={{ gap: space.sm, paddingVertical: space.sm }}>
            <Text variant="headline" style={{ color: C.text }}>{card.name}</Text>
            <Text variant="subhead" style={{ color: C.muted }}>{card.waiver}</Text>
            {card.benefits
              .filter(benefit => benefit.category === category)
              .map(benefit => (
                <Text key={benefit.id} variant="subhead" style={{ color: C.muted }}>
                  {benefit.summary} {benefit.conditions}
                </Text>
              ))}
            <Text variant="caption" style={{ color: C.muted }}>
              Source review: {card.checkedAt} · confirm current terms with the issuer.
            </Text>
            <Button title="Review this card’s sources →" secondary onPress={() => onOpen(card)} />
          </View>
        ))}
      </Disclosure>
    </View>
  );
}
