import React, { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';

class PaneStore {
  values = new Map<string, unknown>();
  listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  set<T>(key: string, update: React.SetStateAction<T>) {
    const previous = this.values.get(key) as T;
    const value = typeof update === 'function' ? (update as (current: T) => T)(previous) : update;
    if (Object.is(value, previous)) return;
    this.values.set(key, value);
    this.listeners.forEach(listener => listener());
  }
}
const StoreContext = createContext<PaneStore | null>(null);
const PaneContext = createContext('app');
/** Mounted above routes, but keyed by account so no selections survive logout. */
export function PaneStateProvider({ children }: { children: React.ReactNode }) {
  const store = useRef<PaneStore | null>(null);
  if (!store.current) store.current = new PaneStore();
  return <StoreContext.Provider value={store.current}>{children}</StoreContext.Provider>;
}
export function PaneScope({ name, children }: { name: string; children: React.ReactNode }) {
  return <PaneContext.Provider value={name}>{children}</PaneContext.Provider>;
}
export function usePaneState<T>(
  name: string,
  initial: T | (() => T),
  scope: 'pane' | 'account' = 'pane',
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const pane = useContext(PaneContext);
  const provided = useContext(StoreContext);
  const local = useRef<PaneStore | null>(null);
  if (!local.current) local.current = new PaneStore();
  const store = provided ?? local.current;
  const key = scope === 'account' ? `account:${name}` : `${pane}:${name}`;
  if (!store.values.has(key))
    store.values.set(key, typeof initial === 'function' ? (initial as () => T)() : initial);
  const get = useCallback(() => store.values.get(key) as T, [store, key]);
  const value = useSyncExternalStore(store.subscribe, get, get);
  const set = useCallback(
    (update: React.SetStateAction<T>) => store.set(key, update),
    [store, key],
  );
  return [value, set];
}
