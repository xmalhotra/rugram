import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { FollowView } from './follow';
import type { FlowAttachment } from '../../shared/share-attachment';

export type ShareCard = {
  kind: 'custom-flow' | 'daily-flow' | 'map-flow';
  id: string;
  title: string;
  /** The Map flow name, when another row has the same title. */
  detail?: string | null;
  reason: string;
  line: string | null;
  /** For rows not yet earned: progress toward the threshold. */
  done?: number;
  need?: number;
  attachment?: FlowAttachment;
};

export type ShareRemark = {
  id: string;
  postId: string;
  userId: string;
  name: string;
  text: string;
  at: string;
};

export type SharePost = {
  id: string;
  at: string;
  text: string;
  attachment: FlowAttachment;
  following: number;
  finished: number;
  remarkCount: number;
  viewer: { own: boolean; following: boolean; followsAuthor: boolean; update: string[] | null };
};

export type ShareDetail = { post: SharePost; remarks: ShareRemark[]; follows?: FollowView[]; placedSlot?: number | null };

const listeners = new Set<() => void>();
function changed() {
  listeners.forEach(listener => listener());
}

export async function shareAct(action: Record<string, unknown>) {
  const result = await api<ShareDetail>('/api/mobile/shares', action);
  changed();
  return result;
}

function useShare<T>(path: string) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    api<T>(path)
      .then(next => {
        if (!live) return;
        setValue(next);
        setError('');
      })
      .catch(reason => {
        if (live) setError(reason instanceof Error ? reason.message : 'Could not load.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path]);
  useEffect(() => load(), [load]);
  useEffect(() => {
    const listener = () => load();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [load]);
  return { value, error, loading, reload: load };
}

export function useShareYours() {
  return useShare<{ earned: ShareCard[]; close: ShareCard[] }>('/api/mobile/shares?view=yours');
}

export function useShareFeed() {
  return useShare<{ posts: SharePost[] }>('/api/mobile/shares?view=feed');
}
