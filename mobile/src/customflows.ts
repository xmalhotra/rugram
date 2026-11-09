import { useEffect, useState } from 'react';
import { api } from './api';
import { customflowKey, type Customflow, type CustomflowSource, type Customflows } from '../../shared/customflows';

// The member's Customflows, kept for the session so screens can apply them without waiting.
let current: Customflows = {};
let loaded = false;
let pending: Promise<Customflows> | null = null;
const listeners = new Set<(value: Customflows) => void>();

function publish(next: Customflows) {
  current = next;
  loaded = true;
  listeners.forEach(listener => listener(next));
}

export function loadCustomflows(force = false) {
  if (pending && !force) return pending;
  if (loaded && !force) return Promise.resolve(current);
  pending = api<{ customflows: Customflows }>('/api/mobile/customflows')
    .then(result => {
      publish(result.customflows);
      return result.customflows;
    })
    .catch(() => current)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** The member's Customflow for a source, if they've customised it. */
export function customflowFor(kind: CustomflowSource['kind'], id: string): Customflow | undefined {
  return current[customflowKey(kind, id)];
}

export function useCustomflow(kind: CustomflowSource['kind'], id: string | undefined) {
  const [all, setAll] = useState<Customflows>(current);
  useEffect(() => {
    listeners.add(setAll);
    void loadCustomflows();
    return () => {
      listeners.delete(setAll);
    };
  }, []);
  return id ? all[customflowKey(kind, id)] : undefined;
}

/** The order shows at once; the server follows. A failure puts the previous Customflows back. */
export async function saveCustomflowOrder(source: CustomflowSource, keys: string[] | null) {
  const key = customflowKey(source.kind, source.id);
  const before = current;
  const now = new Date().toISOString();
  const existing = current[key];
  const next = { ...current };
  if (keys) next[key] = { source, changes: { ...existing?.changes, order: keys }, createdAt: existing?.createdAt ?? now, updatedAt: now };
  else if (existing) {
    const changes = { ...existing.changes };
    delete changes.order;
    if (Object.keys(changes).length) next[key] = { ...existing, changes, updatedAt: now };
    else delete next[key];
  }
  publish(next);
  try {
    const result = await api<{ customflows: Customflows }>('/api/mobile/customflows', { action: 'order', source, keys });
    publish(result.customflows);
  } catch (error) {
    publish(before);
    throw error;
  }
}

/** Back to the original: every change to this source is dropped. */
export async function resetCustomflow(source: CustomflowSource) {
  const before = current;
  const next = { ...current };
  delete next[customflowKey(source.kind, source.id)];
  publish(next);
  try {
    const result = await api<{ customflows: Customflows }>('/api/mobile/customflows', { action: 'reset', source });
    publish(result.customflows);
  } catch (error) {
    publish(before);
    throw error;
  }
}

/** Forget the last member's Customflows on sign-in and sign-out. */
export function resetCustomflows() {
  current = {};
  loaded = false;
  listeners.forEach(listener => listener(current));
}
