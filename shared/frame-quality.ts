import { isMovementCanvas } from './movement-media';

/** Release policy, not an image classifier. Visual/technique checks require recorded human review. */
export const frameReviewChecks = [
  'anatomy-and-contact',
  'visible-phase-change',
  'correct-order-and-direction',
  'matches-written-cue',
  'no-morphing-or-teleporting',
  'understood-without-explanation',
  'source-and-safety',
] as const;
export type FrameReviewCheck = (typeof frameReviewChecks)[number];
export type SequenceFrame = {
  assetFrame: number;
  pixelWidth: number;
  pixelHeight: number;
  role: 'start' | 'action' | 'reset' | 'check';
  label: string;
  cue: string;
  /** Recorded during asset inspection; all coordinates are fractions of the same canvas. */
  subject: string;
  camera: string;
  floorY: number;
  subjectScale: number;
  margin: number;
};
export type FrameSequence = {
  kind: 'movement' | 'habit';
  goal: string;
  successCheck: string;
  assetHash: string;
  sourceUrls: string[];
  frames: SequenceFrame[];
  review: {
    status: 'pending' | 'rejected' | 'approved';
    assetHash: string;
    reviewer: string;
    reviewedAt: string;
    qualification: string;
    checks: Partial<Record<FrameReviewCheck, boolean>>;
    comprehension: { tested: number; understood: number };
    notes: string;
  };
};

/** Fail closed. Prompt compliance or an editorial reviewedOn date is never media approval. */
export function frameSequenceQuality(sequence: FrameSequence | undefined, bundledHash: string) {
  const issues: string[] = [];
  if (!sequence) return { playable: false, issues: ['No reviewed frame sequence.'] };
  const s = sequence;
  if (!s.goal.trim() || !s.successCheck.trim())
    issues.push('State one goal and an observable outcome.');
  if (
    !/^[a-f0-9]{64}$/.test(bundledHash) ||
    s.assetHash !== bundledHash ||
    s.review.assetHash !== bundledHash
  )
    issues.push('Review must match the exact bundled asset.');
  if (!s.sourceUrls.length || s.sourceUrls.some(url => !/^https:\/\//.test(url)))
    issues.push('A primary technique or procedure source is required.');
  if (s.frames.length < 3 || s.frames.length > 12) issues.push('Use 3–12 purposeful keyframes.');
  if (s.frames[0]?.role !== 'start' || s.frames.at(-1)?.role !== 'check')
    issues.push('Show a start, the action, then an outcome check.');
  if (!s.frames.some(frame => frame.role === 'action'))
    issues.push('The action itself is missing.');
  const labels = s.frames.map(frame => frame.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) issues.push('Phase labels must be distinct.');
  const first = s.frames[0];
  const used = new Set<number>();
  for (const frame of s.frames) {
    if (
      !Number.isInteger(frame.pixelWidth) ||
      !Number.isInteger(frame.pixelHeight) ||
      frame.pixelWidth <= 0 ||
      frame.pixelHeight <= 0 ||
      frame.pixelWidth !== first?.pixelWidth ||
      frame.pixelHeight !== first?.pixelHeight ||
      (s.kind === 'movement' && !isMovementCanvas(frame.pixelWidth, frame.pixelHeight))
    )
      issues.push('Every movement frame must use the same square 1:1 pixel canvas.');
    if (
      !frame.label.trim() ||
      !frame.cue.trim() ||
      frame.label.length > 60 ||
      frame.cue.length > 180
    )
      issues.push('Each phase needs a short label and one concrete cue.');
    if (!Number.isInteger(frame.assetFrame) || frame.assetFrame < 0)
      issues.push('Invalid asset frame reference.');
    if (
      used.has(frame.assetFrame) &&
      !(frame.role === 'reset' && frame.assetFrame === first?.assetFrame)
    )
      issues.push('Do not substitute duplicated poses for action phases.');
    used.add(frame.assetFrame);
    if (
      !frame.subject.trim() ||
      !frame.camera.trim() ||
      frame.subject !== first?.subject ||
      frame.camera !== first?.camera
    )
      issues.push('Lock demonstrator, appearance and camera across the sequence.');
    if (
      ![frame.floorY, frame.subjectScale, frame.margin].every(Number.isFinite) ||
      frame.floorY < 0 ||
      frame.floorY > 1 ||
      frame.subjectScale <= 0 ||
      frame.subjectScale > 1 ||
      Math.abs(frame.floorY - (first?.floorY ?? 0)) > 0.02 + 1e-9 ||
      Math.abs(frame.subjectScale - (first?.subjectScale ?? 0)) > 0.05 + 1e-9 ||
      frame.margin < 0.08 ||
      frame.margin > 0.5
    )
      issues.push(
        'Keep the floor within 2%, scale within 5%, and all limbs inside an 8% safe margin.',
      );
  }
  const review = s.review;
  if (review.status !== 'approved') issues.push('Visual sequence has not passed review.');
  if (
    !review.reviewer.trim() ||
    !review.qualification.trim() ||
    !review.notes.trim() ||
    !Number.isFinite(Date.parse(review.reviewedAt)) ||
    Date.parse(review.reviewedAt) > Date.now()
  )
    issues.push('Record the reviewer, relevant qualification and review date.');
  if (frameReviewChecks.some(check => review.checks[check] !== true))
    issues.push('Every visual, comprehension and safety check must pass.');
  const { tested, understood } = review.comprehension;
  if (
    !Number.isInteger(tested) ||
    !Number.isInteger(understood) ||
    tested < 3 ||
    understood !== tested
  )
    issues.push('At least three first-time viewers must correctly explain the action and outcome.');
  return { playable: issues.length === 0, issues: [...new Set(issues)] };
}
