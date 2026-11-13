import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { usePaneState } from './pane-state';
import type { EventCategorySummary } from '../../shared/event-interests';

/** Subscriber counts per category, kept per account; subscribing updates at once and rolls back on failure. */
export function useEventCategories() {
  const [categories, setCategories] = usePaneState<EventCategorySummary[] | null>(
    'eventCategories',
    null,
    'account',
  );
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api<{ categories: EventCategorySummary[] }>('/api/mobile/event-categories')
      .then(result => {
        setCategories(result.categories);
        setError('');
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load.'));
  }, [setCategories]);
  useEffect(() => load(), [load]);
  async function subscribe(id: string, enabled: boolean) {
    const before = categories;
    const shift = (item: EventCategorySummary) =>
      item.id === id && item.subscribed !== enabled
        ? { ...item, subscribed: enabled, subscribers: item.subscribers + (enabled ? 1 : -1) }
        : item;
    setCategories(current => current?.map(shift) ?? current);
    try {
      const { category } = await api<{ category: EventCategorySummary }>(
        '/api/mobile/event-categories',
        { id, enabled },
      );
      setCategories(current => current?.map(item => (item.id === id ? category : item)) ?? current);
    } catch (reason) {
      setCategories(before);
      throw reason;
    }
  }
  return { categories, error, subscribe };
}
