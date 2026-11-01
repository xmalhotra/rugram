import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  frameReviewChecks,
  frameSequenceQuality,
  type FrameSequence,
} from '../shared/frame-quality';
import {
  movementAssetHashes,
  movementGuideSnapshot,
  movementPlaybackQuality,
  movementStoryboards,
  reviewedMovementSequences,
} from '../shared/movement-quality';
import { animalMovementFlows } from '../shared/animal-movements';

const hash = 'a'.repeat(64);
// Synthetic metadata fixture only. No real asset or human review is approved by this test.
function fixture(): FrameSequence {
  return {
    kind: 'movement',
    goal: 'Explain one controlled step',
    successCheck: 'Identify the changed support pair',
    assetHash: hash,
    sourceUrls: ['https://example.org/primary-procedure'],
    frames: ['Start', 'First pair', 'Other pair', 'Finish'].map((label, index) => ({
      assetFrame: index,
      pixelWidth: 1024,
      pixelHeight: 1024,
      role: index === 0 ? 'start' : index === 3 ? 'check' : 'action',
      label,
      cue: `Observe phase ${index + 1}`,
      subject: 'same-adult-outfit',
      camera: 'locked-side-view',
      floorY: 0.85,
      subjectScale: 0.65,
      margin: 0.1,
    })),
    review: {
      status: 'approved',
      assetHash: hash,
      reviewer: 'TEST FIXTURE ONLY',
      qualification: 'Synthetic fixture, not a real credential',
      reviewedAt: '2020-01-01',
      checks: Object.fromEntries(frameReviewChecks.map(check => [check, true])),
      comprehension: { tested: 3, understood: 3 },
      notes: 'Synthetic test',
    },
  };
}

test('missing, pending, rejected or stale reviews fail closed', () => {
  assert.equal(frameSequenceQuality(undefined, hash).playable, false);
  for (const status of ['pending', 'rejected'] as const) {
    const s = fixture();
    s.review.status = status;
    assert.equal(frameSequenceQuality(s, hash).playable, false);
  }
  const s = fixture();
  assert.equal(frameSequenceQuality(s, hash).playable, true);
  assert.equal(frameSequenceQuality(s, 'b'.repeat(64)).playable, false);
  s.review.assetHash = 'b'.repeat(64);
  assert.equal(frameSequenceQuality(s, hash).playable, false);
});

test('every review check, reviewer identity, qualification and date is mandatory', () => {
  for (const check of frameReviewChecks) {
    const s = fixture();
    delete s.review.checks[check];
    assert.equal(frameSequenceQuality(s, hash).playable, false, check);
  }
  for (const field of ['reviewer', 'qualification', 'reviewedAt'] as const) {
    const s = fixture();
    s.review[field] = '';
    assert.equal(frameSequenceQuality(s, hash).playable, false, field);
  }
  const s = fixture();
  s.review.reviewedAt = '2999-01-01';
  assert.equal(frameSequenceQuality(s, hash).playable, false);
});

test('a sequence needs goal, action and outcome rather than four similar labelled poses', () => {
  for (const mutate of [
    (s: FrameSequence) => {
      s.goal = '';
    },
    (s: FrameSequence) => {
      s.successCheck = '';
    },
    (s: FrameSequence) => {
      s.frames[0].role = 'action';
    },
    (s: FrameSequence) => {
      s.frames[3].role = 'action';
    },
    (s: FrameSequence) => {
      s.frames[1].assetFrame = 0;
    },
    (s: FrameSequence) => {
      s.frames[1].cue = '';
    },
    (s: FrameSequence) => {
      s.frames[1].label = 'Start';
    },
    (s: FrameSequence) => {
      s.sourceUrls = [];
    },
    (s: FrameSequence) => {
      s.frames = [];
    },
  ]) {
    const s = fixture();
    mutate(s);
    assert.equal(frameSequenceQuality(s, hash).playable, false);
  }
  const reset = fixture();
  reset.frames[2].role = 'reset';
  reset.frames[2].assetFrame = 0;
  assert.equal(
    frameSequenceQuality(reset, hash).playable,
    true,
    'An intentional return to start can be shown',
  );
});

test('framing rejects camera/appearance changes, floor drift, auto zoom and cropped limbs', () => {
  for (const patch of [
    { camera: 'new-camera' },
    { subject: 'other-person' },
    { floorY: 0.89 },
    { subjectScale: 0.74 },
    { margin: 0.079 },
    { floorY: NaN },
    { subjectScale: -1 },
    { assetFrame: 0.2 },
  ]) {
    const s = fixture();
    Object.assign(s.frames[1], patch);
    assert.equal(frameSequenceQuality(s, hash).playable, false, JSON.stringify(patch));
  }
});

test('comprehension cannot be signed off with zero, partial or fractional reviewers', () => {
  for (const comprehension of [
    { tested: 0, understood: 0 },
    { tested: 2, understood: 2 },
    { tested: 3, understood: 2 },
    { tested: 3, understood: 4 },
    { tested: 3.5, understood: 3.5 },
  ]) {
    const s = fixture();
    s.review.comprehension = comprehension;
    assert.equal(frameSequenceQuality(s, hash).playable, false);
  }
});

test('habit instructions use the same framing contract without claiming movement certification', () => {
  const s = fixture();
  s.kind = 'habit';
  assert.equal(frameSequenceQuality(s, hash).playable, true);
});

test('exact framing thresholds are inclusive, not sensitive to floating point error', () => {
  const s = fixture();
  Object.assign(s.frames[1], { floorY: 0.87, subjectScale: 0.7, margin: 0.08 });
  assert.equal(frameSequenceQuality(s, hash).playable, true);
});

test('movement reviews bind the actual displayed crops and written guide, not just a status flag', () => {
  const flow = animalMovementFlows[0];
  const s = fixture();
  s.assetHash = movementAssetHashes.male;
  s.review.assetHash = movementAssetHashes.male;
  reviewedMovementSequences[flow.id] = {
    male: { ...s, guideSnapshot: movementGuideSnapshot(flow) },
  };
  try {
    const legacy = movementPlaybackQuality(flow, 'male');
    assert.equal(
      legacy.playable,
      false,
      'Old non-square atlas crops cannot be relabelled as square images',
    );
    assert.ok(legacy.issues.some(issue => issue.includes('actual displayed atlas crops')));
    assert.equal(
      movementPlaybackQuality(flow, 'female').playable,
      false,
      'Approval is variant-specific',
    );
    assert.equal(
      movementPlaybackQuality({ ...flow, guidance: 'Changed instruction' }, 'male').playable,
      false,
    );
    assert.ok(
      movementPlaybackQuality({ ...flow, guidance: 'Changed instruction' }, 'male').issues.includes(
        'Written guidance changed since the visual review.',
      ),
    );
    reviewedMovementSequences[flow.id].male!.frames[1].assetFrame = 8;
    assert.equal(
      movementPlaybackQuality(flow, 'male').playable,
      false,
      'Cannot approve a different crop',
    );
  } finally {
    delete reviewedMovementSequences[flow.id];
  }
});

test('current atlas hashes match files and no movement or appearance inherits approval', () => {
  assert.deepEqual(Object.keys(reviewedMovementSequences), []);
  for (const gender of ['male', 'female'] as const) {
    const actual = createHash('sha256')
      .update(readFileSync(`mobile/assets/movements/${gender}-v1.jpg`))
      .digest('hex');
    assert.equal(actual, movementAssetHashes[gender]);
    for (const flow of animalMovementFlows) {
      assert.equal(movementPlaybackQuality(flow, gender).playable, false, `${flow.id}/${gender}`);
      assert.ok(movementStoryboards[flow.id].phases.length >= 4);
    }
  }
  assert.equal(
    movementPlaybackQuality({ ...animalMovementFlows[0], id: 'unknown' }, 'male').playable,
    false,
  );
});

test('frames and controls remain visible while review and written details stay under info', () => {
  const source = readFileSync('mobile/src/AnimalMovementViewer.tsx', 'utf8');
  assert.doesNotMatch(
    source,
    /MovementTechniqueFallback|playbackAllowed|imageReady && quality.playable/,
  );
  assert.match(source, /active && !infoOpen && imageReady/);
  assert.match(source, /const imageReady = .*image\.ready/);
  assert.match(source, /onLoad=\{image.onLoad\}/);
  const infoStart = source.indexOf('{infoOpen &&');
  assert.ok(source.indexOf('<Image') < infoStart, 'Frame is the primary card content');
  assert.ok(
    source.indexOf('<MovementPositionBar') < infoStart,
    'Standalone scrubbing remains below the frame, outside information',
  );
  for (const detail of [
    'Preview quality',
    'unreviewed visual preview',
    'Technique & easier options',
    'guide.cards.map',
    'Safety & sources',
    'flow.sources?.map',
  ])
    assert.ok(source.indexOf(detail) > infoStart, `${detail} is only in info`);
  assert.doesNotMatch(
    source.slice(0, infoStart),
    /reviewedPhase\?\.(label|cue)/,
    'No blank cue panel steals frame space',
  );
  const controls = readFileSync('mobile/src/MovementControls.tsx', 'utf8');
  assert.doesNotMatch(controls, /playbackAllowed|>Guide</);
  assert.doesNotMatch(
    readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8'),
    /movementPlaybackQuality/,
  );
  assert.match(controls, /\['tilt', 'slider'\]/);
});
