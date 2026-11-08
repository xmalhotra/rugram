import { useState } from 'react';
import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import type { CreditCard } from '../../shared/credit-cards';
import { cardTable, formatFee, type SpendCategory } from '../../shared/card-table';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
    padding: 8,
    justifyContent: 'center',
    borderBottomWidth: 0.5,
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
      <View style={{ gap: 14 }}>
        <Text style={{ color: C.muted }}>No cards to compare yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
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
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>Card</Text>
          </View>
          {(['Joining fee', 'Annual fee', 'Fee waiver'] as const).map(label => (
            <View key={label} style={rowStyle(infoHeight)}>
              <Text style={{ color: C.text, fontSize: 13 }}>{label}</Text>
            </View>
          ))}
          <View style={rowStyle(sectionHeight)}>
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>
              Rewards by spend
            </Text>
          </View>
          {rows.map(row => (
            <View
              key={row.category}
              style={rowStyle(categoryHeight, category === row.category ? C.card : undefined)}
            >
              <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={2}>
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
                  borderLeftWidth: index === 0 ? 0 : 0.5,
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
                    style={{ color: C.text, fontSize: 13, fontWeight: '700' }}
                    numberOfLines={2}
                  >
                    {card.name}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                    {card.issuer}
                  </Text>
                </Pressable>
                <View style={rowStyle(infoHeight)}>
                  <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={2}>
                    {formatFee(card.joiningFee)}
                  </Text>
                </View>
                <View style={rowStyle(infoHeight)}>
                  <Text style={{ color: C.text, fontSize: 13 }} numberOfLines={2}>
                    {formatFee(card.annualFee)}
                  </Text>
                </View>
                <View style={rowStyle(infoHeight)}>
                  <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={3}>
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
                        open && { borderWidth: 2, borderColor: C.text },
                      ]}
                    >
                      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{cell.label}</Text>
                    </Pressable>
                  ) : (
                    <View key={row.category} style={rowStyle(categoryHeight, backgroundColor)}>
                      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>–</Text>
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
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            padding: 14,
            gap: 6,
          }}
        >
          <Text style={{ color: C.text, fontWeight: '700' }}>
            {`${pickedCard.name} · ${pickedCell.benefit.title}`}
          </Text>
          <Text style={{ color: C.text }}>{pickedCell.benefit.summary}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{pickedCell.benefit.conditions}</Text>
          {pickedCell.benefit.tracker ? (
            <Text style={{ color: C.muted, fontSize: 13 }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open source"
            onPress={() => onLink(pickedCell.benefit.sourceUrl)}
          >
            <Text style={{ color: C.lime, fontWeight: '600' }}>Source ›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setPicked(null)}>
            <Text style={{ color: C.muted }}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={{ color: C.muted, fontSize: 12 }}>
        {`Rates from each card's published terms, checked ${checkedAt}. Caps and exclusions apply. Tap a cell for details.`}
      </Text>
    </View>
  );
}
