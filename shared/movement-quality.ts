import { frameSequenceQuality, type FrameSequence } from './frame-quality';
import { movementCrop, movementRows, type Demonstrator } from './movement-viewer';
import type { HabitFlow } from './mobile';
import { flowFrameSequences } from './flow-frame-sequences';

/** These hashes are checked against the actual bundled atlas images in the test suite. */
export const movementAssetHashes: Record<Demonstrator, string> = {
  male: '590f36d50d8153ce04a165fadfd7ce2b66fd693e32408a10bbfa906a4012b62c',
  female: '20535db0f1ad96f656e853edffae944b564b9f5c40cb87fce7c990e8362452e0',
};

/** Acceptance storyboards only. They describe the next asset, NOT the existing PNG poses.
 * Each needs source/coach review before generation and actual-asset review afterwards. */
export const movementStoryboards: Record<
  string,
  { goal: string; phases: string[]; outcome: string }
> = {
  ...Object.fromEntries(
    (
      [
        ['workout-animal-lateral-bear', flowFrameSequences.lateralBear],
        ['workout-animal-crab-toe-touch', flowFrameSequences.crabToeTouch],
        ['workout-animal-sit-through', flowFrameSequences.sitThrough],
        ['workout-animal-duck', flowFrameSequences.duckWalk],
      ] as const
    ).map(([id, storyboard]) => {
      return [
        id,
        { goal: storyboard.benefit, phases: [...storyboard.frames], outcome: storyboard.scene },
      ];
    }),
  ),
  'workout-animal-bear': {
    goal: 'Make the opposite-hand/opposite-foot pattern unmistakable.',
    phases: [
      'Stable hover',
      'First diagonal pair advances',
      'Opposite pair advances',
      'Stable hover after both sides',
    ],
    outcome: 'Both diagonal pairs have moved; body alignment remains controlled.',
  },
  'workout-animal-crab': {
    goal: 'Show small alternating steps from a supported face-up position.',
    phases: [
      'Supported face-up start',
      'First small step',
      'Alternate support and step',
      'Supported finish',
    ],
    outcome: 'Travel is visible without a change of camera or an unexplained pose jump.',
  },
  'workout-animal-ape': {
    goal: 'Show a small sideways hand-supported transfer.',
    phases: [
      'Controlled squat',
      'Hands placed to the side',
      'Feet relocate sideways',
      'Controlled squat at destination',
    ],
    outcome: 'The sideways transfer and return of support are clear.',
  },
  'workout-animal-frog': {
    goal: 'Show hands moving forward followed by feet, without an unexplained jump.',
    phases: [
      'Comfortable squat',
      'Hands reach forward',
      'Feet follow with control',
      'Squat reset ahead',
    ],
    outcome: 'The order of hand placement and foot movement is visible.',
  },
  'workout-animal-inchworm': {
    goal: 'Show the walkout and return, not a push-up.',
    phases: ['Hinge to floor', 'Hands walk out', 'Controlled plank', 'Hands return and finish'],
    outcome: 'The return is shown; no push-up is substituted for the hand walk.',
  },
  'workout-animal-bird-dog': {
    goal: 'Show opposite arm/leg reach, reset and opposite-side reach.',
    phases: [
      'All-fours start',
      'First opposite arm and leg reach',
      'All-fours reset',
      'Other opposite pair reaches',
    ],
    outcome: 'The viewer can identify both opposite pairs and the reset between them.',
  },
};

/** Release-owned approvals, not CMS-editable flags. No current atlas has been approved.
 * Add a complete, hash-bound record ONLY after the checklist and comprehension review.
 * Setup/move/scale/watch editorial cards are not image-phase annotations. */
export const reviewedMovementSequences: Record<
  string,
  Partial<Record<Demonstrator, FrameSequence & { guideSnapshot: string }>>
> = {};

/** Exact snapshot prevents later CMS edits from silently inheriting media sign-off. */
export function movementGuideSnapshot(flow: HabitFlow) {
  return JSON.stringify({
    title: flow.title,
    guide: flow.sessionGuide,
    sources: flow.sources,
    guidance: flow.guidance,
  });
}

export function movementPlaybackQuality(flow: HabitFlow, demonstrator: Demonstrator) {
  const sequence = reviewedMovementSequences[flow.id]?.[demonstrator];
  const quality = frameSequenceQuality(sequence, movementAssetHashes[demonstrator]);
  const row = movementRows[flow.id];
  if (sequence && sequence.guideSnapshot !== movementGuideSnapshot(flow)) {
    quality.issues.push('Written guidance changed since the visual review.');
    quality.playable = false;
  }
  if (
    sequence &&
    (row === undefined ||
      sequence.kind !== 'movement' ||
      sequence.frames.length !== 4 ||
      sequence.frames.some((frame, index) => {
        const crop = movementCrop(row, index / 3, demonstrator);
        return (
          frame.assetFrame !== crop.x / 256 ||
          frame.pixelWidth !== crop.width ||
          frame.pixelHeight !== crop.height
        );
      }))
  ) {
    quality.issues.push(
      'Review must describe the four actual displayed atlas crops, not a proposed storyboard.',
    );
    quality.playable = false;
  }
  return quality;
}
