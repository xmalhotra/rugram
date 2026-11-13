import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusLevel } from '../../shared/focus-targets';
import { localDate } from '../../shared/flow-habits';
import type { Joint } from '../../shared/joint-map';
import type { MuscleArea } from '../../shared/muscle-map';
import { api } from './api';
import { useTrainingTick } from './training-route';

/** This week, this month, or everything since the first finished flow. */
export type BodyFlowRange = 'week' | 'month' | 'start';

export type BodyFlowArea = {
  area: MuscleArea;
  title: string;
  sets: number;
  mainSets: number;
  helperSets: number;
  /** 0 none, 1 under half the band, 2 under the band, 3 in the band, 4 beyond it. */
  shade: number;
  band: { low: number; high: number };
  lastDate: string | null;
  exercises: { exerciseId: string; name: string; sets: number }[];
};

export type BodyFlowJoint = {
  joint: Joint;
  title: string;
  days: number;
  sets: number;
  /** 0 none, 1 under half of 2 days a week, 2 under that, 3 within 2–3, 4 beyond it. */
  shade: number;
  /** Days per week. The shade is this band scaled by the weeks in the range. */
  band: { low: number; high: number };
  lastDate: string | null;
  exercises: { exerciseId: string; name: string; sets: number }[];
};

export type BodyFlowPayload = {
  /** The date of the first finished flow, or null before there is one. */
  dayZero: string | null;
  from: string;
  to: string;
  level: FocusLevel;
  /** Weeks between the first and latest non-skipped set. */
  loggedWeeks: number;
  /** Flows this member has outgrown. Two of them lift the catalogue level. */
  graduatedFlows?: number;
  areas: BodyFlowArea[];
  joints: BodyFlowJoint[];
  cardio: { minutes: number; target: number };
  gaps: string[];
};

/** What a screen needs to tell apart "still loading", "nothing yet" and "the fetch failed". */
export type BodyFlowView = { data: BodyFlowPayload | null; loading: boolean; error: string };

const empty: BodyFlowView = { data: null, loading: true, error: '' };

type Slot = { view: BodyFlowView; request: number };

/** One slot per range and date, so a week can be read while another range is on screen. */
const slots = new Map<string, Slot>();
const listeners = new Set<() => void>();

function slotKey(range: BodyFlowRange, date: string) {
  return `${range}|${date}`;
}

function readSlot(key: string): BodyFlowView {
  return slots.get(key)?.view ?? empty;
}

function publish(key: string, slot: Slot, next: BodyFlowView) {
  if (slots.get(key) !== slot) return;
  slot.view = next;
  listeners.forEach(listener => listener());
}

export function loadBodyFlow(range: BodyFlowRange, date: string, force = false) {
  const key = slotKey(range, date);
  let slot = slots.get(key);
  if (!slot) {
    slot = { view: empty, request: 0 };
    slots.set(key, slot);
  }
  const current = slot;
  if (!force && current.view.data && !current.view.loading && !current.view.error) return Promise.resolve(current.view);
  const token = ++current.request;
  const keep = Boolean(force && current.view.data);
  publish(key, current, keep ? { ...current.view, loading: true, error: '' } : { data: null, loading: true, error: '' });
  return api<BodyFlowPayload>(`/api/mobile/body-flow?range=${range}&date=${encodeURIComponent(date)}`)
    .then(result => {
      if (slots.get(key) === current && token === current.request) publish(key, current, { data: result, loading: false, error: '' });
      return readSlot(key);
    })
    .catch((reason: unknown) => {
      if (slots.get(key) === current && token === current.request)
        publish(key, current, { ...current.view, loading: false, error: reason instanceof Error ? reason.message : 'Try again.' });
      return readSlot(key);
    });
}

/** Fetch every range already on screen again, after a flow run adds sets. */
export function reloadBodyFlow() {
  const pending = [...slots.keys()].map(key => {
    const split = key.indexOf('|');
    return loadBodyFlow(key.slice(0, split) as BodyFlowRange, key.slice(split + 1), true);
  });
  if (!pending.length) return Promise.resolve(empty);
  return Promise.all(pending).then(() => empty);
}

/** Forget the last member's map on sign-in and sign-out. */
export function resetBodyFlow() {
  for (const slot of slots.values()) slot.request += 1;
  slots.clear();
  listeners.forEach(listener => listener());
}

export function useBodyFlow(range: BodyFlowRange) {
  // A finished training session bumps this tick, and those sets belong on the map straight away.
  const [tick] = useTrainingTick();
  const date = localDate(new Date());
  const key = slotKey(range, date);
  const [value, setValue] = useState<BodyFlowView>(() => readSlot(key));
  const seenTick = useRef<number | null>(null);
  useEffect(() => {
    let live = true;
    const listener = () => {
      if (live) setValue(readSlot(key));
    };
    listeners.add(listener);
    const stale = seenTick.current !== null && seenTick.current !== tick;
    seenTick.current = tick;
    void loadBodyFlow(range, date, stale);
    listener();
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [range, date, tick, key]);
  const reload = useCallback(() => loadBodyFlow(range, date, true), [range, date]);
  return { ...value, reload };
}
