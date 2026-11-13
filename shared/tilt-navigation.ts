export type TiltState = { lastAt: number | null; angle: number; lastStepAt: number };
export const initialTiltState = (): TiltState => ({
  lastAt: null,
  angle: 0,
  lastStepAt: -Infinity,
});

/** Integrate portrait-phone roll, ignoring jitter, gaps and repeated fast gestures. */
export function tiltNavigation(
  state: TiltState,
  z: number,
  now: number,
): { state: TiltState; step: number } {
  if (!Number.isFinite(z) || !Number.isFinite(now)) return { state: initialTiltState(), step: 0 };
  const elapsed = state.lastAt === null ? 0 : now - state.lastAt;
  if (elapsed <= 0 || elapsed > 250) return { state: { ...state, lastAt: now, angle: 0 }, step: 0 };
  if (now - state.lastStepAt < 750) return { state: { ...state, lastAt: now, angle: 0 }, step: 0 };
  const angle =
    Math.abs(z) < 0.12 ? 0 : state.angle + (Math.max(-4, Math.min(4, z)) * elapsed) / 1000;
  if (Math.abs(angle) < 0.25) return { state: { ...state, lastAt: now, angle }, step: 0 };
  return { state: { lastAt: now, angle: 0, lastStepAt: now }, step: angle < 0 ? 1 : -1 };
}
