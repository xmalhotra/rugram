import { useCallback, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  emptyDailyChecks,
  packDailyChecks,
  parseDailyChecks,
  unpackDailyChecks,
  type DailyChecks,
} from '../../shared/daily-checks';

type Entry = {
  checks: DailyChecks;
  listeners: Set<() => void>;
  token: number;
  started: boolean;
};

const memories = new Map<string, Entry>();

function storageKey(userId: string | undefined) {
  return `qram.daily.${userId ?? 'guest'}`.replace(/[^\w.-]/g, '_');
}

async function readStored(key: string) {
  const head = await SecureStore.getItemAsync(key);
  if (!head) return emptyDailyChecks();
  const parsed = JSON.parse(head) as { chunks?: number; items?: unknown };
  if (parsed && typeof parsed === 'object' && typeof parsed.chunks === 'number' && !parsed.items) {
    const parts: string[] = [];
    for (let index = 0; index < parsed.chunks; index += 1) {
      const piece = await SecureStore.getItemAsync(`${key}.${index}`);
      if (piece) parts.push(piece);
    }
    return parts.length ? unpackDailyChecks(parts) : emptyDailyChecks();
  }
  return parseDailyChecks(parsed);
}

async function writeStored(key: string, parts: string[]) {
  const head = await SecureStore.getItemAsync(key);
  let previous = 0;
  if (head) {
    try {
      const parsed = JSON.parse(head) as { chunks?: number; items?: unknown };
      if (typeof parsed.chunks === 'number' && !parsed.items) previous = parsed.chunks;
    } catch {
      previous = 0;
    }
  }
  if (parts.length === 1) await SecureStore.setItemAsync(key, parts[0]);
  else {
    for (let index = 0; index < parts.length; index += 1)
      await SecureStore.setItemAsync(`${key}.${index}`, parts[index]);
    await SecureStore.setItemAsync(key, JSON.stringify({ chunks: parts.length }));
  }
  const keep = parts.length === 1 ? 0 : parts.length;
  for (let index = keep; index < previous; index += 1) await SecureStore.deleteItemAsync(`${key}.${index}`);
}

function entryFor(key: string) {
  let entry = memories.get(key);
  if (!entry) {
    entry = { checks: emptyDailyChecks(), listeners: new Set(), token: 0, started: false };
    memories.set(key, entry);
  }
  if (!entry.started) {
    entry.started = true;
    const token = entry.token;
    void readStored(key)
      .then(checks => {
        if (!entry || entry.token !== token) return;
        entry.checks = checks;
        entry.listeners.forEach(listener => listener());
      })
      .catch(() => undefined);
  }
  return entry;
}

/** Your daily check-ins, remembered on this device per account. */
export function useDailyChecks(userId: string | undefined) {
  const key = storageKey(userId);
  const subscribe = useCallback(
    (listener: () => void) => {
      const entry = entryFor(key);
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    [key],
  );
  const get = useCallback(() => entryFor(key).checks, [key]);
  const checks = useSyncExternalStore(subscribe, get, get);
  const update = useCallback(
    (recipe: (current: DailyChecks) => DailyChecks) => {
      const entry = entryFor(key);
      entry.token += 1;
      entry.checks = recipe(entry.checks);
      entry.listeners.forEach(listener => listener());
      void writeStored(key, packDailyChecks(entry.checks)).catch(() => undefined);
    },
    [key],
  );
  return { checks, update };
}
