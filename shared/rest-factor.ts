/**
 * The member's own rest, learned from "harder" and "easier" on a hint.
 * 1 leaves the class time alone. Stored as the personal metric `gym.restFactor`.
 */

export const restFactorMin = 0.6;
export const restFactorMax = 1.6;

/**
 * One tap. Small on purpose, so the factor is learned over many sets
 * and stays inside 0.6–1.6. "harder" means the hint was too short.
 * "easier" means it was too long.
 */
export const restFactorStep = 0.05;

export type RestFactorTap = 'harder' | 'easier';

/** A missing factor is 1. Anything outside the band is pulled back in. */
export function clampRestFactor(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 1;
  return Math.min(restFactorMax, Math.max(restFactorMin, value));
}

export function nextRestFactor(current: number | null | undefined, tap: RestFactorTap): number {
  const step = tap === 'harder' ? restFactorStep : -restFactorStep;
  const next = Math.round((clampRestFactor(current) + step) * 100) / 100;
  return clampRestFactor(next);
}
