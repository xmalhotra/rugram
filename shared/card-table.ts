import type { CardBenefit, CreditCard } from './credit-cards';

export type SpendCategory = CardBenefit['category'];

export const spendCategories: SpendCategory[] = [
  'Online shopping',
  'Groceries',
  'Food & Instamart',
  'Bills & recharges',
  'Fuel',
  'Travel',
  'Movies',
];

export type CardCell = { label: string; benefit: CardBenefit; best: boolean };

export type CardTableRow = { category: SpendCategory; cells: (CardCell | null)[] };

const kindLabel: Record<CardBenefit['kind'], string> = {
  'Reward points': 'Points',
  'Instant discount': 'Discount',
  'Lounge access': 'Lounge',
  'Surcharge waiver': 'Fee waiver',
  Cashback: 'Cashback',
};

function cashbackRate(benefit: CardBenefit): number | null {
  if (benefit.kind !== 'Cashback') return null;
  const rate = benefit.cashback?.rate;
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
}

export function cardCell(card: CreditCard, category: SpendCategory): CardCell | null {
  const benefits = card.benefits.filter(benefit => benefit.category === category);
  if (benefits.length === 0) return null;
  const rated = benefits.flatMap(benefit => {
    const rate = cashbackRate(benefit);
    return rate === null ? [] : [{ benefit, rate }];
  });
  if (rated.length > 0) {
    const top = rated.reduce((winner, item) => (item.rate > winner.rate ? item : winner));
    return { label: `${top.rate}%`, benefit: top.benefit, best: false };
  }
  const benefit = benefits[0];
  return { label: kindLabel[benefit.kind], benefit, best: false };
}

export function cardTable(cards: CreditCard[]): CardTableRow[] {
  return spendCategories.flatMap(category => {
    const cells = cards.map(card => cardCell(card, category));
    if (cells.every(cell => cell === null)) return [];
    const rates = cells.map(cell => (cell ? cashbackRate(cell.benefit) : null));
    const competing = rates.filter((rate): rate is number => rate !== null);
    // Only cashback rates compete; ties are all best, and other rows have none.
    const top = competing.length > 0 ? Math.max(...competing) : null;
    return [
      {
        category,
        cells: cells.map((cell, index) =>
          cell && top !== null && rates[index] === top ? { ...cell, best: true } : cell,
        ),
      },
    ];
  });
}

export function formatFee(value: number | null): string {
  if (value === null) return 'Not confirmed';
  if (value === 0) return 'Free';
  return `₹${value.toLocaleString('en-IN')}`;
}
