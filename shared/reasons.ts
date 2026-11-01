import type { HabitFlow, Product, CityEvent } from './mobile';
import { checkedAgo, formatDate, formatInr } from './format';
import { focusOptions } from './focus';
export function flowReason(
  flow: HabitFlow,
  focusId?: string,
  options: readonly { id: string; title: string; flowIds: readonly string[] }[] = focusOptions,
) {
  const focus = options.find(item => item.id === focusId && item.flowIds.includes(flow.id));
  return focus
    ? `Because your focus is ${focus.title}`
    : [flow.level ?? 'Editor’s selection', `${flow.steps.length} steps`].join(' · ');
}
export function pickReason(product: Product, budget?: number, now = new Date()) {
  const fits =
    typeof budget === 'number' &&
    Number.isFinite(budget) &&
    Number.isFinite(product.price) &&
    product.price <= budget;
  return [
    fits ? `Fits your ${formatInr(budget)} budget` : undefined,
    `${product.tier} tier`,
    checkedAgo(product.checkedAt, now),
  ]
    .filter(Boolean)
    .join(' · ');
}
export function eventReason(event: CityEvent) {
  return `${event.city} · ${formatDate(event.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}`;
}
