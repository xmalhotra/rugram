import type { CreditCard } from './credit-cards';
import { cardCell, cardTable, spendCategories, type SpendCategory } from './card-table';

export type CardShelf = { id: string; title: string; cards: CreditCard[] };

export type WalletCheat = { category: SpendCategory; card: CreditCard; label: string };

function shelfId(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Best cashback in the set first (cardTable), then a lower annual fee. Ties keep the incoming order. */
function rankCards(members: CreditCard[], category: SpendCategory): CreditCard[] {
  const row = cardTable(members).find(item => item.category === category);
  const best = new Map(members.map((card, index) => [card.id, Boolean(row?.cells[index]?.best)]));
  return [...members].sort((a, b) => {
    const bestDelta = Number(best.get(b.id)) - Number(best.get(a.id));
    if (bestDelta !== 0) return bestDelta;
    return a.annualFee - b.annualFee;
  });
}

/** The strongest card in this set for one spend category, with its short benefit label. */
export function bestCardInCategory(
  cards: CreditCard[],
  category: SpendCategory,
): { card: CreditCard; label: string } | null {
  const winner = rankCards(
    cards.filter(card => cardCell(card, category)),
    category,
  )[0];
  const cell = winner ? cardCell(winner, category) : null;
  return winner && cell ? { card: winner, label: cell.label } : null;
}

/** One shelf per spend category any card covers, then Lifetime Free. A card can sit on several. */
export function cardShelves(cards: CreditCard[]): CardShelf[] {
  const shelves: CardShelf[] = [];
  for (const category of spendCategories) {
    const members = cards.filter(card => cardCell(card, category));
    if (members.length === 0) continue;
    shelves.push({ id: shelfId(category), title: category, cards: rankCards(members, category) });
  }
  const free = cards.filter(card => card.annualFee === 0);
  if (free.length > 0) shelves.push({ id: 'lifetime-free', title: 'Lifetime Free', cards: free });
  return shelves;
}

/** One row per spend category the held cards cover, naming the best card among them. */
export function walletCheatSheet(cards: CreditCard[]): WalletCheat[] {
  return cardTable(cards).flatMap(row => {
    const best = bestCardInCategory(cards, row.category);
    return best ? [{ category: row.category, card: best.card, label: best.label }] : [];
  });
}
