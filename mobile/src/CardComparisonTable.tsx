import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import type { CreditCard } from '../../shared/credit-cards';
import { cardTable, formatFee, type SpendCategory } from '../../shared/card-table';
import { Text } from './design/Text';
import { Button } from './design/components';
import { radius, space, stroke, useTheme } from './design/theme';

const headerHeight = 88;
const infoHeight = 56;
const sectionHeight = 36;
const categoryHeight = 48;

export function CardComparisonTable({
  cards,
  onCard,
  onLink,
}: {
  cards: CreditCard[];
  onCard: (card: CreditCard) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const rows = cardTable(cards);
  const [category, setCategory] = useState<SpendCategory | null>(null);
  const [picked, setPicked] = useState<{ cardId: string; category: SpendCategory } | null>(null);
  const rowStyle = (height: number, backgroundColor?: string): ViewStyle => ({
    height,
    padding: space.sm,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    backgroundColor,
  });
  const pickedRow = rows.find(row => row.category === picked?.category);
  const pickedIndex = cards.findIndex(card => card.id === picked?.cardId);
  const pickedCell = pickedIndex >= 0 ? pickedRow?.cells[pickedIndex] : null;
  const pickedCard = pickedCell ? cards[pickedIndex] : undefined;
  const checkedAt = cards.reduce(
    (latest, card) => (card.checkedAt > latest ? card.checkedAt : latest),
    cards[0]?.checkedAt ?? '',
  );

  if (cards.length === 0) {
    return (
      <View style={{ gap: space.md }}>
        <Text style={{ color: C.muted }}>No cards to compare yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {rows.map(row => {
            const selected = category === row.category;
            return (
              <Pressable
                key={row.category}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${row.category}`}
                accessibilityState={{ selected }}
                onPress={() =>
                  setCategory(current => (current === row.category ? null : row.category))
                }
                style={{
                  borderRadius: radius.control,
                  paddingHorizontal: space.ms,
                  paddingVertical: space.sm,
                  borderWidth: 1,
                  borderColor: C.line,
                  backgroundColor: selected ? C.lime : undefined,
                }}
              >
                <Text style={{ color: selected ? C.onAccent : C.text }}>{row.category}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 128 }}>
          <View style={rowStyle(headerHeight)}>
            <Text variant="footnote" style={{ color: C.text, fontWeight: '600' }}>Card</Text>
          </View>
          {(['Joining fee', 'Annual fee', 'Fee waiver'] as const).map(label => (
            <View key={label} style={rowStyle(infoHeight)}>
              <Text variant="footnote" style={{ color: C.text }}>{label}</Text>
            </View>
          ))}
          <View style={rowStyle(sectionHeight)}>
            <Text variant="caption" style={{ color: C.muted, fontWeight: '600' }}>
              Rewards by spend
            </Text>
          </View>
          {rows.map(row => (
            <View
              key={row.category}
              style={rowStyle(categoryHeight, category === row.category ? C.card : undefined)}
            >
              <Text variant="footnote" style={{ color: C.text }} numberOfLines={2}>
                {row.category}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            {cards.map((card, index) => (
              <View
                key={card.id}
                style={{
                  width: 112,
                  borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderLeftColor: C.line,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${card.name}`}
                  onPress={() => onCard(card)}
                  style={rowStyle(headerHeight)}
                >
                  <Text
                    variant="footnote"
                    style={{ color: C.text, fontWeight: '600' }}
                    numberOfLines={2}
                  >
                    {card.name}
                  </Text>
                  <Text variant="caption" style={{ color: C.muted }} numberOfLines={1}>
                    {card.issuer}
                  </Text>
                </Pressable>
                <View style={rowStyle(infoHeight)}>
                  <Text variant="footnote" style={{ color: C.text }} numberOfLines={2}>
                    {formatFee(card.joiningFee)}
                  </Text>
                </View>
                <View style={rowStyle(infoHeight)}>
                  <Text variant="footnote" style={{ color: C.text }} numberOfLines={2}>
                    {formatFee(card.annualFee)}
                  </Text>
                </View>
                <View style={rowStyle(infoHeight)}>
                  <Text variant="caption" style={{ color: C.muted }} numberOfLines={3}>
                    {card.waiver}
                  </Text>
                </View>
                <View style={rowStyle(sectionHeight)} />
                {rows.map(row => {
                  const cell = row.cells[index];
                  const highlighted = category === row.category;
                  const backgroundColor = cell?.best ? C.lime : highlighted ? C.card : undefined;
                  const color = cell?.best ? C.onAccent : cell ? C.text : C.muted;
                  const open = picked?.cardId === card.id && picked.category === row.category;
                  return cell ? (
                    <Pressable
                      key={row.category}
                      accessibilityRole="button"
                      accessibilityLabel={`${card.name}, ${row.category}: ${cell.label}${cell.best ? ', best in row' : ''}`}
                      accessibilityState={{ selected: open }}
                      onPress={() => setPicked({ cardId: card.id, category: row.category })}
                      style={[
                        rowStyle(categoryHeight, backgroundColor),
                        open && { borderWidth: stroke.active, borderColor: C.text },
                      ]}
                    >
                      <Text variant="subhead" style={{ color, fontWeight: '600' }}>{cell.label}</Text>
                    </Pressable>
                  ) : (
                    <View key={row.category} style={rowStyle(categoryHeight, backgroundColor)}>
                      <Text variant="subhead" style={{ color, fontWeight: '600' }}>–</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      {pickedCard && pickedCell ? (
        <View
          style={{
            borderRadius: radius.control,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            padding: space.md,
            gap: space.sm,
          }}
        >
          <Text style={{ color: C.text, fontWeight: '600' }}>
            {`${pickedCard.name} · ${pickedCell.benefit.title}`}
          </Text>
          <Text style={{ color: C.text }}>{pickedCell.benefit.summary}</Text>
          <Text variant="footnote" style={{ color: C.muted }}>{pickedCell.benefit.conditions}</Text>
          {pickedCell.benefit.tracker ? (
            <Text variant="footnote" style={{ color: C.muted }}>
              {`Cap: ${
                pickedCell.benefit.tracker.unit === 'INR'
                  ? `₹${pickedCell.benefit.tracker.limit.toLocaleString('en-IN')}`
                  : `${pickedCell.benefit.tracker.limit.toLocaleString('en-IN')} ${pickedCell.benefit.tracker.unit}`
              } per ${
                pickedCell.benefit.tracker.period === 'billing-cycle'
                  ? 'billing cycle'
                  : pickedCell.benefit.tracker.period
              }`}
            </Text>
          ) : null}
          <Button
            variant="text"
            title="Source ›"
            accessibilityLabel="Open source"
            onPress={() => onLink(pickedCell.benefit.sourceUrl)}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setPicked(null)}>
            <Text style={{ color: C.muted }}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      <Text variant="caption" style={{ color: C.muted }}>
        {`Rates from each card's published terms, checked ${checkedAt}. Caps and exclusions apply. Tap a cell for details.`}
      </Text>
    </View>
  );
}
