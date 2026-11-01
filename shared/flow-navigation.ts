import type { FlowCategoryGroup } from './flow-categories';

export function flowBrowseNavigation(group: FlowCategoryGroup | undefined) {
  if (!group) return { level: 'categories' as const, title: 'Explore flows', backLabel: '' };
  return { level: 'topics' as const, title: group.title, backLabel: 'All categories' };
}
