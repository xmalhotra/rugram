import { useEffect, useState } from 'react';
import type { FlowRunState } from '../../shared/flow-run';
import { flowRunHome } from './flow-runs';

/** A workout someone has left open while using the rest of the app. Kept in memory on this phone. */
export type ActiveRun = {
  kind: 'flow' | 'personal';
  id: string;
  title: string;
  state: FlowRunState;
};

let current: ActiveRun | null = null;
let screenOpen = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

export function setActiveRun(run: ActiveRun | null) {
  current = run;
  notify();
}

export function setRunScreenOpen(open: boolean) {
  screenOpen = open;
  notify();
}

/** The run in progress, and whether its screen is showing right now. */
export function useActiveRun() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick(value => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { run: current, screenOpen };
}

let seeded = false;
/** Workouts touched in the last few hours count as in progress; older ones were left behind. */
const recentMs = 6 * 60 * 60 * 1000;

/**
 * After the app opens, picks up the most recent workout still in progress on the server,
 * so the floating square comes back after a reload. Runs once.
 */
export function seedActiveRun() {
  if (seeded) return;
  seeded = true;
  void flowRunHome()
    .then(home => {
      if (current) return;
      const recent = home.running
        .filter(run => run.status === 'running' && Date.now() - Date.parse(run.updatedAt) < recentMs)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
      if (recent) setActiveRun({ kind: recent.kind, id: recent.flowId, title: recent.title, state: recent.state });
    })
    .catch(() => {
      seeded = false;
    });
}

/** The run in progress right now, read at the moment someone taps to go back to it. */
export function currentActiveRun() {
  return current;
}
