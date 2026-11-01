import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  MovementPositionBar,
  type MovementPositionState,
  type MovementPositionUpdate,
} from './MovementPositionBar';
import type { HabitFlow } from '../../shared/mobile';
import {
  heldMovementFrame,
  movementCrop,
  movementFrame,
  movementStageFit,
  type Demonstrator,
} from '../../shared/movement-viewer';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
import { Button, Sheet } from './design/components';
import { useMovementTilt } from './useMovementTilt';
import { domainStill } from './morning-stills';
import { usePaneState } from './pane-state';
import { MovementControls } from './MovementControls';
import { movementPlaybackQuality, reviewedMovementSequences } from '../../shared/movement-quality';
import { fitnessMedia } from '../../shared/fitness-guides';
import {
  fitnessAtlasLayouts,
  fitnessCrop,
  fitnessFrameCount,
} from '../../shared/fitness-media-layout';
import { useAtlasImage } from './useAtlasImage';
import { fitnessAtlases } from './fitness-media';
import { cindyFrameRow } from './cindy-frames';
import { poseFrameRow } from './pose-frames';
import { MovementBenefits } from './MovementBenefits';
import { LogoLoader } from './motion';
import { codingCard } from '../../shared/coding-flows';
import { CodingBenefits } from './CodingBenefits';

const atlases = {
  // Metro needs static requires to bundle native image assets.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  male: require('../assets/movements/male-v1.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  female: require('../assets/movements/female-v1.jpg'),
};
export function AnimalMovementViewer({
  flow,
  row,
  active = true,
  onLink,
  onLean,
  controls,
}: {
  flow: HabitFlow;
  row: number;
  active?: boolean;
  controls?: {
    mode: 'tilt' | 'slider';
    infoOpen: boolean;
    onCloseInfo: () => void;
    context?: { title: string; description: string };
    information?: React.ReactNode;
    position?: { value: MovementPositionState; onChange: MovementPositionUpdate };
  };
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onHome: () => void;
  onRemove: () => void;
  onLink: (url: string) => void;
  onLean?: (lean: number) => void;
}) {
  const { colors: C } = useTheme();
  const [gender] = usePaneState<Demonstrator>('movementDemonstrator', 'male', 'account');
  const media = flow.visualCard?.media ?? fitnessMedia[flow.id];
  const isDrink = media?.atlas === 'morning';
  const still = domainStill(flow.id);
  const isSupplement = media?.atlas === 'supplements';
  const coding = codingCard(flow.id);
  const visualCard = flow.visualCard;
  const frameTerm = isDrink || isSupplement || coding || visualCard ? 'Frame' : 'Pose';
  const atlasLayout = media ? fitnessAtlasLayouts[media.atlas][gender] : null;
  const poseRow =
    poseFrameRow(flow.id, gender) ??
    (media?.atlas === 'flow-fitness' && media.row === 3 ? poseFrameRow('jump-rope', gender) : null);
  const cindyRow = !poseRow && media?.atlas === 'cindy' ? cindyFrameRow(gender, media.row) : null;
  const stacked = poseRow ?? cindyRow;
  const frameCount = stacked ? stacked.length : media ? fitnessFrameCount(media, gender) : 4;
  const atlasSource = media ? fitnessAtlases[media.atlas][gender] : atlases[gender];
  const quality = movementPlaybackQuality(flow, gender);
  const [localInfoOpen, setLocalInfoOpen] = useState(false);
  const infoOpen = controls?.infoOpen ?? localInfoOpen;
  const [localProgress, setLocalProgress] = useState(0);
  const [localPhase, setLocalPhase] = useState(0);
  const progress = controls?.position?.value.progress ?? localProgress;
  const phase = controls?.position?.value.phase ?? localPhase;
  const positionChange = controls?.position?.onChange;
  const setProgress = useCallback(
    (value: number) => {
      if (positionChange) positionChange(flow.id, 'progress', value);
      else setLocalProgress(value);
    },
    [positionChange, flow.id],
  );
  const setPhase = useCallback(
    (value: number) => {
      if (positionChange) positionChange(flow.id, 'phase', value);
      else setLocalPhase(value);
    },
    [positionChange, flow.id],
  );
  const [localMode, setControlMode] = useState<'tilt' | 'slider'>('tilt');
  const controlMode = controls?.mode ?? localMode;
  const candidate =
    controlMode === 'tilt'
      ? heldMovementFrame(phase, progress, frameCount)
      : movementFrame(progress, frameCount);
  useEffect(() => {
    // A brief, sustained intent is required; sensor noise never flashes another pose.
    const timer = setTimeout(() => setPhase(candidate), controlMode === 'tilt' ? 140 : 0);
    return () => clearTimeout(timer);
  }, [candidate, controlMode, setPhase]);
  const [width, setWidth] = useState(0);
  const [viewerHeight, setViewerHeight] = useState(0);
  const [readyFrames, setReadyFrames] = useState<Record<string, boolean>>({});
  const displayedPhase = Math.min(frameCount - 1, phase);
  const frameKey = stacked ? String(stacked[displayedPhase]) : '';
  useEffect(() => {
    setReadyFrames({});
  }, [flow.id, gender, stacked?.length]);
  const image = useAtlasImage(
    still ?? (stacked ? stacked[0] : atlasSource),
    still ? `still:${flow.id}` : stacked ? `pose:${flow.id}:${gender}` : `${media?.atlas ?? 'legacy'}:${gender}`,
  );
  const imageReady = Boolean(still || (stacked ? readyFrames[frameKey] : image.ready));
  const tilt = useMovementTilt(
    progress,
    setProgress,
    controlMode === 'tilt' && active && !infoOpen && imageReady && !still,
  );
  const crop = media
    ? fitnessCrop(media, gender, displayedPhase / (frameCount - 1))
    : movementCrop(row, phase / 3, gender);
  const imageFit = movementStageFit(crop, width, viewerHeight);
  const edgeLean =
    controlMode === 'tilt' && tilt.enabled && !infoOpen && !still ? tilt.lean : 0;
  useEffect(() => {
    onLean?.(edgeLean);
  }, [edgeLean, onLean]);
  const { scale } = imageFit;
  const guide = flow.sessionGuide!;
  const reviewedPhase = reviewedMovementSequences[flow.id]?.[gender]?.frames[phase];
  return (
    <View style={{ flex: 1, minHeight: 0, gap: 8 }}>
      {!controls && (
        <MovementControls
          informationLabel={
            visualCard
              ? 'Card benefits'
              : coding
                ? 'Coding benefits'
                : isSupplement
                  ? 'Supplement information'
                  : isDrink
                    ? 'Drink information'
                    : undefined
          }
          controlMode={controlMode}
          setControlMode={setControlMode}
          onInfo={() => setLocalInfoOpen(true)}
        />
      )}
      <View style={{ flex: 1, minHeight: 0 }}>
        <View
          onLayout={event => {
            setWidth(event.nativeEvent.layout.width);
            setViewerHeight(event.nativeEvent.layout.height);
          }}
          style={{ width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}
          accessibilityLabel={
            still
              ? flow.title
              : `${flow.title}, illustrated ${visualCard ? 'habit frame' : coding ? 'workflow frame' : isDrink ? 'preparation frame' : isSupplement ? 'assessment frame' : 'movement phase'} ${displayedPhase + 1} of ${frameCount}`
          }
          accessible
          accessibilityRole="image"
        >
          {still ? (
            <Image
              source={still}
              accessible={false}
              resizeMode="cover"
              fadeDuration={0}
              style={{ width: '100%', height: '100%' }}
            />
          ) : stacked ? (
            stacked.map((source, index) => (
              <Image
                key={String(source)}
                source={source}
                accessible={false}
                resizeMode="cover"
                fadeDuration={0}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: index === displayedPhase ? 1 : 0,
                }}
                onLoad={() =>
                  setReadyFrames(current =>
                    current[String(source)] ? current : { ...current, [String(source)]: true },
                  )
                }
              />
            ))
          ) : (
            width > 0 && (
              <View
                style={{
                  position: 'absolute',
                  left: imageFit.offsetX,
                  top: imageFit.offsetY,
                  width: imageFit.imageWidth,
                  height: imageFit.imageHeight,
                  overflow: 'hidden',
                }}
              >
                <Image
                  key={image.key}
                  source={atlasSource}
                  onLoad={image.onLoad}
                  onError={image.onError}
                  accessible={false}
                  resizeMode="stretch"
                  fadeDuration={0}
                  style={{
                    position: 'absolute',
                    width: (atlasLayout?.width ?? 1024) * scale,
                    height: (atlasLayout?.height ?? 1536) * scale,
                    left: -crop.x * scale,
                    top: -crop.y * scale,
                  }}
                />
              </View>
            )
          )}
            {!still && !(stacked ? readyFrames[frameKey] : image.ready) && (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: C.bg,
                }}
              >
                {image.failed ? (
                  <Text style={{ color: C.muted }}>Image could not load</Text>
                ) : (
                  <LogoLoader />
                )}
                {(image.failed || (!stacked && image.slow)) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      coding || visualCard ? 'Retry preview image' : 'Retry movement image'
                    }
                    onPress={image.retry}
                    style={{
                      minHeight: 44,
                      minWidth: 80,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: C.lime }}>Retry</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        {!controls?.position && (
          <MovementPositionBar
            progress={progress}
            phase={displayedPhase}
            frameCount={frameCount}
            frameTerm={frameTerm}
            controlMode={controlMode}
            onProgress={setProgress}
            onScrub={tilt.scrub}
            accessibilityLabel={
              coding || visualCard
                ? 'Workflow frame'
                : isDrink
                  ? 'Preparation frame'
                  : isSupplement
                    ? 'Assessment frame'
                    : 'Movement phase'
            }
          />
        )}
      </View>
      {(coding || visualCard) && !still && (
        <Text
          numberOfLines={2}
          accessibilityLiveRegion="polite"
          style={{ color: C.muted, fontSize: 13, lineHeight: 18, minHeight: 36 }}
        >
          {visualCard?.frames[displayedPhase] ?? coding?.frames[displayedPhase]}
        </Text>
      )}
      {infoOpen && controls?.information}
      {infoOpen && !visualCard && coding && (
        <CodingBenefits
          flow={flow}
          onLink={onLink}
          onClose={() => (controls ? controls.onCloseInfo() : setLocalInfoOpen(false))}
        />
      )}
      {infoOpen && !visualCard && !coding && !isDrink && !isSupplement && (
        <MovementBenefits
          onLink={onLink}
          flow={flow}
          onClose={() => (controls ? controls.onCloseInfo() : setLocalInfoOpen(false))}
        />
      )}
      {infoOpen && !visualCard && (isDrink || isSupplement) && (
        <Sheet
          title={isDrink ? 'Drink details' : isSupplement ? 'Supplement guide' : 'Movement details'}
          navigation="back"
          onClose={() => (controls ? controls.onCloseInfo() : setLocalInfoOpen(false))}
        >
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '600' }}>{guide.format}</Text>
          <Text style={{ color: C.muted }}>{flow.description}</Text>
          <Text style={{ color: C.muted }}>{guide.equipment}</Text>
          {controls?.context && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{controls.context.title}</Text>
              <Text style={{ color: C.muted, lineHeight: 21 }}>{controls.context.description}</Text>
            </View>
          )}
          <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>
            Tilt right to play through to the last pose, or left to play back to the first.
            Returning to neutral does not pause playback. Choose Slider to inspect a middle pose.
            Recenter only resets the phone's neutral angle.
          </Text>
          <Disclosure title="Preview quality">
            <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>
              {quality.playable
                ? 'This image sequence has a recorded framing and technique review.'
                : 'This is an unreviewed visual preview made with generated images, not filmed instructional footage. Details may be incomplete or inconsistent; use the written guidance and sources below.'}
            </Text>
          </Disclosure>
          {quality.playable && reviewedPhase && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{reviewedPhase.label}</Text>
              <Text style={{ color: C.muted }}>{reviewedPhase.cue}</Text>
            </View>
          )}
          <Disclosure
            title={
              isDrink
                ? 'Preparation & choices'
                : isSupplement
                  ? 'Evidence, suitability & questions'
                  : 'Technique & easier options'
            }
          >
            {guide.cards.map(card => (
              <View key={card.id} style={{ gap: 4, paddingVertical: 8 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{card.title}</Text>
                <Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>{card.body}</Text>
              </View>
            ))}
          </Disclosure>
          <Disclosure title="Safety & sources">
            <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>{flow.guidance}</Text>
            {flow.sources?.map(source => (
              <Button
                key={source.url}
                secondary
                title={`${source.title} ↗`}
                onPress={() => onLink(source.url)}
              />
            ))}
          </Disclosure>
          <Disclosure title="About this illustration">
            <Text style={{ color: C.muted }}>
              {isSupplement
                ? 'AI-generated assessment illustration · not filmed or clinically reviewed'
                : isDrink
                  ? 'AI-generated preparation illustration · not filmed or independently reviewed'
                  : 'AI-generated movement study · not filmed or coach-verified'}
            </Text>
          </Disclosure>
          {controlMode === 'tilt' && (
            <>
              {tilt.status && (
                <>
                  <Text style={{ color: C.muted }}>{tilt.status}</Text>
                  <Button
                    title="Try tilt again"
                    secondary
                    onPress={() => (controls ? controls.onCloseInfo() : setLocalInfoOpen(false))}
                  />
                </>
              )}
              <Button title="Recenter tilt" secondary onPress={tilt.calibrate} />
            </>
          )}
        </Sheet>
      )}
    </View>
  );
}
