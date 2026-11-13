import { useEffect, useState } from 'react';
import { api } from './api';
import type { PersonalMetricKey, PersonalMetrics } from '../../shared/personal-metrics';
import { paceRange, vdot, type RunIntensity } from '../../shared/running-paces';

// The member's personal metrics, kept for the session so screens can use them without waiting.
let current: PersonalMetrics = {};
let loaded = false;
let pending: Promise<PersonalMetrics> | null = null;
const listeners = new Set<(value: PersonalMetrics) => void>();

function publish(next: PersonalMetrics) {
  current = next;
  loaded = true;
  listeners.forEach(listener => listener(next));
}

export function loadPersonalMetrics(force = false) {
  if (pending && !force) return pending;
  if (loaded && !force) return Promise.resolve(current);
  pending = api<{ metrics: PersonalMetrics }>('/api/mobile/personal')
    .then(result => {
      publish(result.metrics);
      return result.metrics;
    })
    .catch(() => current)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function usePersonalMetrics() {
  const [value, setValue] = useState<PersonalMetrics>(current);
  useEffect(() => {
    listeners.add(setValue);
    void loadPersonalMetrics();
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

export async function savePersonalMetric(metric: PersonalMetricKey, value: Record<string, unknown> | null) {
  const result = await api<{ metrics: PersonalMetrics }>(
    '/api/mobile/personal',
    value ? { action: 'set', metric, value } : { action: 'clear', metric },
  );
  publish(result.metrics);
  return result.metrics;
}

/** The member's pace for a kind of running, from their recent run. Null until they've given one. */
export function runPace(metrics: PersonalMetrics, intensity: RunIntensity) {
  const run = metrics['run.recent'];
  const value = run ? vdot(run.distanceM, run.seconds) : null;
  return value ? paceRange(value, intensity) : null;
}

/** Forget the last member's metrics on sign-in and sign-out. */
export function resetPersonalMetrics() {
  current = {};
  loaded = false;
  listeners.forEach(listener => listener(current));
}
