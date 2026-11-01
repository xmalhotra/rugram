import { movementMediaSpec } from './movement-media';

export const movementRows: Record<string, number> = {
  'workout-animal-bear': 0,
  'workout-animal-crab': 1,
  'workout-animal-ape': 2,
  'workout-animal-frog': 3,
  'workout-animal-inchworm': 4,
  'workout-animal-bird-dog': 5,
};
export type Demonstrator = 'male' | 'female';
/** Fixed square surface. Legacy non-square crops are contained, never stretched or clipped.
 * Replacement assets must use the same square canvas, so contain adds no inner matte. */
export function movementImageFit(
  crop: { width: number; height: number },
  width: number,
  height: number,
) {
  if (![width, height, crop.width, crop.height].every(value => Number.isFinite(value) && value > 0))
    return { width: 0, height: 0, scale: 0, imageWidth: 0, imageHeight: 0, offsetX: 0, offsetY: 0 };
  const frameWidth = Math.min(width, height * movementMediaSpec.aspectRatio);
  const frameHeight = frameWidth / movementMediaSpec.aspectRatio;
  const scale = Math.min(frameWidth / crop.width, frameHeight / crop.height);
  const imageWidth = crop.width * scale;
  const imageHeight = crop.height * scale;
  return {
    width: frameWidth,
    height: frameHeight,
    scale,
    imageWidth,
    imageHeight,
    offsetX: (frameWidth - imageWidth) / 2,
    offsetY: (frameHeight - imageHeight) / 2,
  };
}
/** The stage uses the measured space. The picture covers it, centered, without stretching. */
export function movementStageFit(
  crop: { width: number; height: number },
  width: number,
  height: number,
) {
  if (![width, height, crop.width, crop.height].every(value => Number.isFinite(value) && value > 0))
    return { width: 0, height: 0, scale: 0, imageWidth: 0, imageHeight: 0, offsetX: 0, offsetY: 0 };
  const scale = Math.max(width / crop.width, height / crop.height);
  const imageWidth = crop.width * scale;
  const imageHeight = crop.height * scale;
  return {
    width,
    height,
    scale,
    imageWidth,
    imageHeight,
    offsetX: (width - imageWidth) / 2,
    offsetY: (height - imageHeight) / 2,
  };
}
export const isAnimalMovementFlow = (id: string) =>
  id === 'workout-animal-movements' || movementRows[id] !== undefined;
export const clampProgress = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
export function movementFrame(progress: number, count = 4) {
  const last = Math.max(0, count - 1);
  return Math.min(last, Math.round(clampProgress(progress) * last));
}
export function movementGlow(lean: number, active: boolean) {
  if (!active || !Number.isFinite(lean) || Math.abs(lean) < 0.04) return { left: 0, right: 0 };
  const intensity = Math.sqrt(Math.min(1, Math.abs(lean)));
  return { left: lean < 0 ? intensity : 0, right: lean > 0 ? intensity : 0 };
}
/** Separate enter/leave thresholds keep a held pose stable near frame boundaries. */
export function heldMovementFrame(current: number, progress: number, count = 4) {
  const last = Math.max(0, count - 1);
  const frame = Number.isFinite(current) ? Math.max(0, Math.min(last, Math.round(current))) : 0;
  const position = clampProgress(progress) * last;
  if (position > frame + 0.72 || position < frame - 0.72)
    return frame + Math.sign(movementFrame(progress, count) - frame);
  return frame;
}
export type TiltPlaybackIntent = {
  direction: -1 | 0 | 1;
  candidate: -1 | 0 | 1;
  since: number;
};

/** A deliberate tilt latches a direction. Neutral never interrupts a running sequence. */
export function tiltPlaybackIntent(
  state: TiltPlaybackIntent,
  lean: number,
  now: number,
): TiltPlaybackIntent {
  if (!Number.isFinite(now)) return state;
  const candidate = Number.isFinite(lean) && Math.abs(lean) >= 0.3 ? (lean > 0 ? 1 : -1) : 0;
  if (!candidate || candidate === state.direction) return { ...state, candidate: 0, since: now };
  if (candidate !== state.candidate || now < state.since)
    return { ...state, candidate, since: now };
  if (now - state.since < 140) return state;
  return { direction: candidate, candidate: 0, since: now };
}

/** Bounded playback integration; latched direction is supplied by tiltPlaybackIntent. */
export function advanceMovement(current: number, lean: number, elapsedMs: number) {
  const position = clampProgress(current);
  if (!Number.isFinite(lean) || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 250)
    return position;
  const strength = Math.min(1, Math.abs(lean));
  if (strength <= 0.2) return position;
  // A latched direction completes in 1.2 seconds, independent of sensor delivery frequency.
  const speed = (Math.sign(lean) * ((strength - 0.2) / 0.8)) / 1.2;
  return clampProgress(position + (speed * Math.min(elapsedMs, 40)) / 1000);
}
export function tiltProgress(
  gamma: number,
  roll: number,
  baseline: { gamma: number; roll: number; progress: number; axis?: 'roll' | 'gamma' },
) {
  if (![gamma, roll, baseline.gamma, baseline.roll, baseline.progress].every(Number.isFinite))
    return clampProgress(baseline.progress);
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const yawDelta = wrap(gamma - baseline.gamma);
  const rollDelta = wrap(roll - baseline.roll);
  const delta =
    baseline.axis === 'roll'
      ? rollDelta
      : baseline.axis === 'gamma'
        ? yawDelta
        : Math.abs(yawDelta) > Math.abs(rollDelta)
          ? yawDelta
          : rollDelta;
  // Normalize angle to a speed/glow signal. This is not the viewer's pose position.
  const deadzone = 0.006;
  const travel = Math.sign(delta) * Math.max(0, Math.abs(delta) - deadzone);
  return clampProgress(baseline.progress + travel / 0.28);
}

/**
 * Side-to-side lean from CoreMotion gravity.
 * Positive x means the left edge is down (the landscape-left rest pose), so it is negated.
 * Positive result is a right lean.
 */
export function portraitTiltRoll(gravityX: number, gravityY: number) {
  if (!Number.isFinite(gravityX) || !Number.isFinite(gravityY)) return Number.NaN;
  const roll = Math.atan2(-gravityX, -gravityY);
  return roll === 0 ? 0 : roll;
}

/** Time-based low-pass filter: same response regardless of sensor delivery rate. */
export function smoothMovement(current: number, target: number, elapsedMs: number) {
  const dt = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(100, elapsedMs)) : 0;
  return clampProgress(
    clampProgress(current) +
      (clampProgress(target) - clampProgress(current)) * (1 - Math.exp(-dt / 85)),
  );
}

/** Atlas boundaries are measured from the generated assets, not assumed equal-height rows. */
export function movementCrop(row: number, progress: number, gender: Demonstrator) {
  const frame = movementFrame(progress);
  const bounds =
    gender === 'male' ? [0, 252, 492, 723, 952, 1241, 1536] : [0, 247, 487, 723, 975, 1233, 1536];
  const safeRow = Number.isFinite(row) ? Math.max(0, Math.min(5, Math.round(row))) : 0;
  // Exclude a direction-inconsistent bear frame and the unwanted push-up variant.
  const sourceFrame =
    gender === 'female' && safeRow === 0
      ? [1, 2, 3, 1][frame]
      : gender === 'female' && safeRow === 4
        ? [0, 0, 2, 3][frame]
        : frame;
  return {
    x: sourceFrame * 256,
    y: bounds[safeRow] + 2,
    width: 256,
    height: bounds[safeRow + 1] - bounds[safeRow] - 4,
  };
}
