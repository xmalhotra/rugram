import { useEffect, useState } from 'react';
import { api } from './api';
import { customflowKey, hasChanges, type Customflow, type CustomflowChanges, type CustomflowSource, type Customflows } from '../../shared/customflows';

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

/** One exercise stands in for the flow's own. `null` puts that slot back. A failure restores the previous Customflows. */
export async function saveCustomflowSwap(source: CustomflowSource, key: string, exerciseId: string | null) {
  const id = customflowKey(source.kind, source.id);
  const before = current;
  const now = new Date().toISOString();
  const existing = current[id];
  const swaps = { ...(existing?.changes.swaps ?? {}) };
  if (exerciseId && exerciseId !== key) swaps[key] = exerciseId;
  else delete swaps[key];
  const changes: CustomflowChanges = { ...existing?.changes };
  if (Object.keys(swaps).length) changes.swaps = swaps;
  else delete changes.swaps;
  const next = { ...current };
  if (hasChanges(changes)) next[id] = { source, changes, createdAt: existing?.createdAt ?? now, updatedAt: now };
  else delete next[id];
  publish(next);
  try {
    const result = await api<{ customflows: Customflows }>('/api/mobile/customflows', {
      action: 'swap',
      source,
      key,
      exerciseId,
    });
    publish(result.customflows);
  } catch (error) {
    publish(before);
    throw error;
  }
}

/** Leave an item out, or put it back when `out` is false. A failure restores the previous Customflows. */
export async function saveCustomflowRemoval(source: CustomflowSource, key: string, out: boolean) {
  const id = customflowKey(source.kind, source.id);
  const before = current;
  const now = new Date().toISOString();
  const existing = current[id];
  const removed = [...(existing?.changes.removed ?? [])];
  const index = removed.indexOf(key);
  if (out) {
    if (index < 0) removed.push(key);
  } else if (index >= 0) removed.splice(index, 1);
  const changes: CustomflowChanges = { ...existing?.changes };
  if (removed.length) changes.removed = removed;
  else delete changes.removed;
  const next = { ...current };
  if (hasChanges(changes)) next[id] = { source, changes, createdAt: existing?.createdAt ?? now, updatedAt: now };
  else delete next[id];
  publish(next);
  try {
    const result = await api<{ customflows: Customflows }>('/api/mobile/customflows', { action: 'remove', source, key, out });
    publish(result.customflows);
  } catch (error) {
    publish(before);
    throw error;
  }
}

/** Every Customflow, so a list of cards can mark the ones this member changed. */
export function useCustomflows() {
  const [all, setAll] = useState<Customflows>(current);
  useEffect(() => {
    listeners.add(setAll);
    void loadCustomflows();
    return () => {
      listeners.delete(setAll);
    };
  }, []);
  return all;
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
