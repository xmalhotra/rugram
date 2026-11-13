import type { HabitFlow, Product, CityEvent } from './mobile';
import { checkedAgo, formatEventTime, formatInr } from './format';
export type SharedKind = 'flow' | 'pick' | 'event';
export const contentLink = (kind: SharedKind, id: string) =>
  `qram://${kind}/${encodeURIComponent(id)}`;
const title = (value: string) => value.replace(/\s+/g, ' ').trim();
export const memberLink = (id: string) => `qram://member/${encodeURIComponent(id)}`;
/** Only the public name and username: never stats, weights or details. */
export function shareProfile(user: { id: string; name: string; handle: string }) {
  return {
    title: user.name,
    message: [`${title(user.name)} (@${user.handle}) on Qram`, memberLink(user.id)].join('\n'),
  };
}
export function shareFlow(flow: HabitFlow) {
  return {
    title: flow.title,
    message: [
      title(flow.title),
      `${flow.steps.length} step${flow.steps.length === 1 ? '' : 's'} · go at your pace`,
      contentLink('flow', flow.id),
    ].join('\n'),
  };
}
export function sharePick(product: Product, now = new Date()) {
  return {
    title: product.title,
    message: [
      title(product.title),
      `${formatInr(product.price)} · ${checkedAgo(product.checkedAt, now)} · sources linked`,
      contentLink('pick', product.id),
    ].join('\n'),
  };
}
export function shareEvent(event: CityEvent) {
  return {
    title: event.title,
    message: [
      title(event.title),
      `${formatEventTime(event.startsAt, event.endsAt, event.dateOnly)} · ${event.city} · ${event.venue}`,
      contentLink('event', event.id),
    ].join('\n'),
  };
}
