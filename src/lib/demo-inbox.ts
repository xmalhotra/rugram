import type { InboxItem } from '../../shared/notifications';

export type DemoInboxItem = InboxItem & { recipientId: string; businessKey: string };

declare global {
  var betterHabitsInbox: DemoInboxItem[] | undefined;
}

/** In-app notice for demo mode. The notification store re-exports this. */
export function demoInboxPut(
  recipientId: string,
  businessKey: string,
  item: Omit<InboxItem, 'id' | 'createdAt' | 'readAt'>,
) {
  const items = (globalThis.betterHabitsInbox ??= []);
  if (items.some(row => row.recipientId === recipientId && row.businessKey === businessKey)) return;
  items.push({
    ...item,
    id: crypto.randomUUID(),
    recipientId,
    businessKey,
    createdAt: new Date().toISOString(),
    readAt: null,
  });
}
