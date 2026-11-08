import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { cardShelfIcons } from './picks-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { CreditCard } from '../../shared/credit-cards';
import { cardCell, formatFee, type SpendCategory } from '../../shared/card-table';
import { cardShelves, type CardShelf } from '../../shared/card-shelves';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { usePaneState } from './pane-state';
import { useRootListInset } from './RootList';
import { CatalogBar } from './FlowCatalogTile';
import { CardComparisonTable } from './CardComparisonTable';

const gap = 10;
const gridGap = 12;
const railWidth = 88;
/** The space App leaves under the glass top bar, part of the list inset. */
const rootListGap = 12;

type Glyph = 'groceries' | 'food' | 'shopping' | 'fuel' | 'travel' | 'movies' | 'wallet' | 'card';

function glyphFor(shelf: CardShelf): Glyph {
  if (shelf.id === 'lifetime-free') return 'wallet';
  if (shelf.id === 'groceries') return 'groceries';
  if (shelf.id === 'food-instamart') return 'food';
  if (shelf.id === 'online-shopping') return 'shopping';
  if (shelf.id === 'fuel') return 'fuel';
  if (shelf.id === 'travel') return 'travel';
  if (shelf.id === 'movies') return 'movies';
  return 'card';
}

function ShelfIcon({ kind, color, size }: { kind: Glyph; color: string; size: number }) {
  const line = {
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === 'groceries' ? (
        <>
          <Path d="M4 9h16l-1.4 11H5.4z" {...line} />
          <Path d="M8 9l1.2-4h5.6L16 9" {...line} />
          <Path d="M9 13v4M12 13v4M15 13v4" {...line} />
        </>
      ) : kind === 'food' ? (
        <>
          <Path d="M8 3v7M12 3v18M16 3v7" {...line} />
          <Path d="M8 7c0 2 8 2 8 0" {...line} />
        </>
      ) : kind === 'shopping' ? (
        <>
          <Path d="M6 8h12l-1 12H7z" {...line} />
          <Path d="M9 8V6a3 3 0 016 0v2" {...line} />
        </>
      ) : kind === 'fuel' ? (
        <>
          <Rect x={4} y={3} width={9} height={18} rx={1.5} {...line} />
          <Path d="M8 7h2M13 8h3l2 3v5h-2" {...line} />
          <Circle cx={8.5} cy={16} r={0.8} fill={color} stroke="none" />
        </>
      ) : kind === 'travel' ? (
        <Path d="M3 13l18-7-6 8 3 7-4-5-6 3 2-6z" {...line} />
      ) : kind === 'movies' ? (
        <>
          <Path d="M4 8h16v9H4z" {...line} />
          <Path d="M4 12.5h16M8 8v9" {...line} />
          <Circle cx={4} cy={10} r={1.2} {...line} />
          <Circle cx={4} cy={15} r={1.2} {...line} />
          <Circle cx={20} cy={10} r={1.2} {...line} />
          <Circle cx={20} cy={15} r={1.2} {...line} />
        </>
      ) : kind === 'wallet' ? (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2} {...line} />
          <Path d="M3 11h18" {...line} />
          <Circle cx={16.5} cy={14.5} r={1} fill={color} stroke="none" />
        </>
      ) : (
        <>
          <Rect x={2} y={5} width={20} height={14} rx={2} {...line} />
          <Path d="M2 10h20" {...line} />
        </>
      )}
    </Svg>
  );
}

function CardFace({ card, width }: { card: CreditCard; width: number }) {
  const { colors: C } = useTheme();
  if (width <= 0) return null;
  if (card.imageUrl) {
    return (
      <Image
        source={{ uri: card.imageUrl }}
        accessible={false}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
  return (
    <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>
        {card.issuer}
      </Text>
      <Text numberOfLines={2} style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>
        {card.name}
      </Text>
    </View>
  );
}

/** Credit cards, laid out like the Flows catalog: shelves, then the cards on a shelf. */
export function CardCatalog({
  cards,
  onCard,
  onLink,
}: {
  cards: CreditCard[];
  onCard: (card: CreditCard) => void;
  onLink: (url: string) => void;
}) {
  const shelves = cardShelves(cards);
  const [shelfId, setShelfId] = usePaneState<string | null>('cardCatalogShelf', null);
  const [compare, setCompare] = usePaneState('cardCatalogCompare', false);
  const shelf = shelves.find(item => item.id === shelfId);
  if (shelf) {
    return (
      <ShelfPage
        shelf={shelf}
        shelves={shelves}
        onShelf={setShelfId}
        onBack={() => setShelfId(null)}
        onCard={onCard}
      />
    );
  }
  if (compare) {
    return (
      <ComparePage cards={cards} onCard={onCard} onLink={onLink} onBack={() => setCompare(false)} />
    );
  }
  return <ShelfHome shelves={shelves} onOpen={setShelfId} onCompare={() => setCompare(true)} />;
}

function ShelfHome({
  shelves,
  onOpen,
  onCompare,
}: {
  shelves: CardShelf[];
  onOpen: (id: string) => void;
  onCompare: () => void;
}) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [offset, setOffset] = usePaneState('cardCatalogScroll', 0);
  const [width, setWidth] = useState(0);
  const list = useRef<React.ElementRef<typeof ScrollView>>(null);
  const restore = useRef(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      list.current?.scrollTo({ y: offset, animated: false });
      requestAnimationFrame(() => {
        restore.current = false;
      });
    });
    return () => cancelAnimationFrame(frame);
    // Restore the position saved before a shelf opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const column = width > 0 ? (width - gap * 2) / 3 : 0;
  return (
    <ScrollView
      ref={list}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={event => {
        if (!restore.current) setOffset(event.nativeEvent.contentOffset.y);
      }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: inset, paddingBottom: 128, gap: 24 }}
    >
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          Credit cards
        </Text>
        <View
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
        >
          {column > 0 &&
            shelves.map(shelf => (
              <Pressable
                key={shelf.id}
                accessibilityRole="button"
                accessibilityLabel={shelf.title}
                onPress={() => onOpen(shelf.id)}
                style={{ width: column, gap: 6 }}
              >
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: C.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cardShelfIcons[shelf.id] ? (
                    <Image
                      source={cardShelfIcons[shelf.id]!}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <ShelfIcon kind={glyphFor(shelf)} color={C.muted} size={34} />
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: '500',
                    lineHeight: 17,
                    textAlign: 'center',
                  }}
                >
                  {shelf.title}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare all cards"
        onPress={onCompare}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ color: C.muted, fontSize: 15 }}>Compare all cards ›</Text>
      </Pressable>
    </ScrollView>
  );
}

function ShelfPage({
  shelf,
  shelves,
  onShelf,
  onBack,
  onCard,
}: {
  shelf: CardShelf;
  shelves: CardShelf[];
  onShelf: (id: string) => void;
  onBack: () => void;
  onCard: (card: CreditCard) => void;
}) {
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const category = shelf.id === 'lifetime-free' ? null : (shelf.title as SpendCategory);
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - rootListGap) }}>
      <CatalogBar title="Credit cards" onBack={onBack} />
      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: 0.5, borderColor: C.line }}>
        <ScrollView
          style={{ width: railWidth, flexGrow: 0, borderRightWidth: 0.5, borderColor: C.line }}
          contentContainerStyle={{ paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
        >
          {shelves.map(item => {
            const selected = item.id === shelf.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityState={{ selected }}
                onPress={() => onShelf(item.id)}
                style={{ alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6 }}
              >
                {cardShelfIcons[item.id] ? (
                  <Image
                    source={cardShelfIcons[item.id]!}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      borderWidth: selected ? 1.5 : 0,
                      borderColor: C.lime,
                    }}
                  />
                ) : (
                  <ShelfIcon kind={glyphFor(item)} color={selected ? C.lime : C.muted} size={24} />
                )}
                <Text
                  numberOfLines={2}
                  style={{
                    color: selected ? C.lime : C.muted,
                    fontSize: 12,
                    fontWeight: selected ? '700' : '500',
                    textAlign: 'center',
                  }}
                >
                  {item.title}
                </Text>
                {selected && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 10,
                      bottom: 10,
                      width: 3,
                      borderTopLeftRadius: 3,
                      borderBottomLeftRadius: 3,
                      backgroundColor: C.lime,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <CardGrid cards={shelf.cards} category={category} onCard={onCard} />
      </View>
    </View>
  );
}

function CardGrid({
  cards,
  category,
  onCard,
}: {
  cards: CreditCard[];
  category: SpendCategory | null;
  onCard: (card: CreditCard) => void;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - gridGap) / 2 : 0;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 128 }}>
      <View
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}
      >
        {cell > 0 &&
          cards.map(card => {
            const benefit = category ? cardCell(card, category) : null;
            return (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${card.name}`}
                onPress={() => onCard(card)}
                style={({ pressed }) => ({ width: cell, gap: 6, opacity: pressed ? 0.75 : 1 })}
              >
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1.586,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: C.card,
                  }}
                >
                  <CardFace card={card} width={cell} />
                </View>
                <Text
                  numberOfLines={2}
                  style={{ color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }}
                >
                  {card.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{formatFee(card.annualFee)} a year</Text>
                {benefit ? (
                  <Text style={{ color: C.lime, fontSize: 13 }}>{benefit.label}</Text>
                ) : null}
              </Pressable>
            );
          })}
      </View>
    </ScrollView>
  );
}

function ComparePage({
  cards,
  onCard,
  onLink,
  onBack,
}: {
  cards: CreditCard[];
  onCard: (card: CreditCard) => void;
  onLink: (url: string) => void;
  onBack: () => void;
}) {
  const inset = useRootListInset();
  return (
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - rootListGap) }}>
      <CatalogBar title="All cards" onBack={onBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 128 }}>
        <CardComparisonTable cards={cards} onCard={onCard} onLink={onLink} />
      </ScrollView>
    </View>
  );
}
