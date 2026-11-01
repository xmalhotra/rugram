import type { MobilePayload, Tier } from './mobile';
const normalise = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-IN')
    .trim();
export function searchCatalogue(
  data: Pick<MobilePayload, 'flows' | 'exercises' | 'products' | 'events' | 'demoMode'> &
    Partial<Pick<MobilePayload, 'flowResources'>>,
  query: string,
  filters: { city?: string; tier?: Tier } = {},
) {
  const products = [
    ...new Map(
      [...(data.flowResources?.products ?? []), ...data.products].map(item => [item.id, item]),
    ).values(),
  ];
  const events = [
    ...new Map(
      [...(data.flowResources?.events ?? []), ...data.events].map(item => [item.id, item]),
    ).values(),
  ];
  const words = normalise(query).slice(0, 80).split(/\s+/).filter(Boolean);
  const matches = (values: (string | undefined)[]) =>
    words.length > 0 &&
    words.every(word => normalise(values.filter(Boolean).join(' ')).includes(word));
  return {
    flows: data.flows
      .filter(item => matches([item.title, item.goal, item.description, item.area]))
      .slice(0, 40),
    picks: products
      .filter(
        item =>
          item.status === 'published' &&
          (!item.demo || data.demoMode) &&
          (!filters.tier || item.tier === filters.tier) &&
          matches([item.title, item.summary, item.category, item.subcategory]),
      )
      .slice(0, 40),
    events: events
      .filter(
        item =>
          item.status === 'published' &&
          (!item.demo || data.demoMode) &&
          (!filters.city || normalise(item.city) === normalise(filters.city)) &&
          matches([item.title, item.city, item.venue, item.topic]),
      )
      .slice(0, 40),
    exercises: data.exercises
      .filter(item => matches([item.name, item.category, item.equipment, ...item.muscles]))
      .slice(0, 40),
  };
}
export function recentSearches(current: string[], query: string) {
  const value = query.trim().slice(0, 80);
  if (!value) return current.slice(0, 8);
  return [value, ...current.filter(item => normalise(item) !== normalise(value))].slice(0, 8);
}
