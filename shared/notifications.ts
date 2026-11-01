export const notificationTypes = [
  'registration_requested',
  'registration_approved',
  'registration_declined',
  'event_cancelled',
  'event_changed',
  'listing_published',
  'listing_rejected',
  'admin_queue_digest',
  'report_resolved',
  'community_flow_edited',
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export type InboxItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  target: { kind: 'flow' | 'pick' | 'event' | 'submission' | 'admin' | 'community'; id: string };
};
export type NotificationInbox = {
  items: InboxItem[];
  unreadCount: number;
  nextCursor: string | null;
};
