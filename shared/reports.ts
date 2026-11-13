export const reportReasons = [
  'Wrong price',
  'Broken link',
  'Wrong date/venue',
  'Misleading claim',
  'Other',
] as const;
export const reportOutcomes = ['Fixed', 'No issue found', 'Archived'] as const;
export type MemberReport = {
  id: string;
  kind: 'pick' | 'event';
  itemId: string;
  title: string;
  reason: (typeof reportReasons)[number];
  note: string;
  createdAt: string;
  status: 'open' | 'resolved';
  outcome: (typeof reportOutcomes)[number] | null;
  resolvedAt: string | null;
};
