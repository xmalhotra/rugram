import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { useFocusEffect } from 'expo-router';
import {
  advanceMovement,
  smoothMovement,
  portraitTiltRoll,
  tiltProgress,
  tiltPlaybackIntent,
  type TiltPlaybackIntent,
} from '../../shared/movement-viewer';

export function useMovementTilt(
  progress: number,
  change: (value: number) => void,
  selected = true,
) {
  const [enabled, setEnabled] = useState(false);
  // Normal startup/resume is silent; only actionable diagnostics belong in the info panel.
  const [status, setStatus] = useState<string | null>(null);
  const [lean, setLean] = useState(0);
  const active = useRef(false),
    paused = useRef(false),
    requesting = useRef(false);
  const latest = useRef({ progress, change });
  const manuallyDisabled = useRef(false);
  const selectedMode = useRef(selected);
  selectedMode.current = selected;
  latest.current = { progress, change };
  const baseline = useRef<{
    gamma: number;
    roll: number;
    progress: number;
    axis: 'roll' | 'gamma';
  } | null>(null);
  const stop = useRef<() => void>(() => {});
  const start = useCallback(async (request: boolean) => {
    if (requesting.current || !selectedMode.current) return;
    requesting.current = true;
    try {
      if (await AccessibilityInfo.isReduceMotionEnabled()) {
        if (active.current) setStatus('Reduce Motion is on');
        return;
      }
      if (!(await DeviceMotion.isAvailableAsync())) {
        if (active.current) setStatus('Tilt unavailable · use slider');
        return;
      }
      let permission = await DeviceMotion.getPermissionsAsync();
      if (!permission.granted && request && permission.canAskAgain)
        permission = await DeviceMotion.requestPermissionsAsync();
      if (
        !active.current ||
        !selectedMode.current ||
        manuallyDisabled.current ||
        AppState.currentState !== 'active'
      )
        return;
      if (!permission.granted) {
        setStatus(request ? 'Allow Motion in Settings' : 'Enable tilt');
        return;
      }
      baseline.current = null;
      setEnabled(true);
      setStatus(null);
    } catch {
      if (active.current) setStatus('Tilt unavailable · use slider');
    } finally {
      requesting.current = false;
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      if (selected) void start(true);
      return () => {
        active.current = false;
        stop.current();
        setEnabled(false);
      };
    }, [start, selected]),
  );
  useEffect(() => {
    const app = AppState.addEventListener('change', value => {
      if (value !== 'active') {
        stop.current();
        setEnabled(false);
        setStatus('Enable tilt');
      } else if (active.current && !manuallyDisabled.current) void start(false);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (value) {
        stop.current();
        setEnabled(false);
        setStatus('Reduce Motion is on');
      }
    });
    return () => {
      app.remove();
      motion.remove();
      stop.current();
    };
  }, [start]);
  useEffect(() => {
    if (!enabled) return;
    let received = false;
    let previousTime = Date.now();
    let playbackTime = Date.now();
    let filtered = latest.current.progress;
    let filteredLean = 0;
    let intent: TiltPlaybackIntent = { direction: 0, candidate: 0, since: 0 };
    let animationFrame = 0;
    const tick = () => {
      const now = Date.now();
      if (
        active.current &&
        selectedMode.current &&
        !paused.current &&
        AppState.currentState === 'active'
      ) {
        filtered = advanceMovement(filtered, intent.direction, now - playbackTime);
        if (
          Math.abs(filtered - latest.current.progress) > 0.004 ||
          ((filtered === 0 || filtered === 1) && filtered !== latest.current.progress)
        )
          latest.current.change(filtered);
      }
      playbackTime = now;
      animationFrame = requestAnimationFrame(tick);
    };
    try {
      DeviceMotion.setUpdateInterval(16);
      const listener = DeviceMotion.addListener(sample => {
        if (
          !active.current ||
          !selectedMode.current ||
          paused.current ||
          AppState.currentState !== 'active' ||
          !sample.rotation
        )
          return;
        const gamma = sample.rotation.gamma;
        const gravity = sample.accelerationIncludingGravity;
        const roll = portraitTiltRoll(gravity.x, gravity.y);
        if (!Number.isFinite(gamma) || !Number.isFinite(roll)) return;
        if (!received) {
          received = true;
          setStatus(null);
        }
        const now = Date.now();
        if (!baseline.current) {
          // Lock the axis until recentered: switching axes mid-gesture causes jumps.
          baseline.current = {
            gamma,
            roll,
            progress: latest.current.progress,
            axis: Math.hypot(gravity.x, gravity.y) > 3 ? 'roll' : 'gamma',
          };
          filtered = latest.current.progress;
          filteredLean = 0;
          previousTime = now;
        }
        const leanTarget = tiltProgress(gamma, roll, { ...baseline.current, progress: 0.5 });
        filteredLean =
          smoothMovement((filteredLean + 1) / 2, leanTarget, now - previousTime) * 2 - 1;
        // The portrait gravity sign is opposite the side the phone is lowered toward.
        const currentLean = -filteredLean;
        setLean(previous => (Math.abs(previous - currentLean) > 0.025 ? currentLean : previous));
        // Once triggered, finish the sequence even if the phone returns to neutral.
        intent = tiltPlaybackIntent(intent, currentLean, now);
        previousTime = now;
      });
      animationFrame = requestAnimationFrame(tick);
      const watchdog = setTimeout(() => {
        if (!received && active.current) setStatus('No motion readings · use slider');
      }, 2500);
      const remove = () => {
        cancelAnimationFrame(animationFrame);
        clearTimeout(watchdog);
        listener.remove();
      };
      stop.current = remove;
      return remove;
    } catch {
      setEnabled(false);
      setStatus('Tilt unavailable · use slider');
    }
  }, [enabled]);
  return {
    enabled,
    lean,
    status,
    toggle: () => {
      if (enabled) {
        manuallyDisabled.current = true;
        stop.current();
        setEnabled(false);
        setStatus('Enable tilt');
      } else {
        manuallyDisabled.current = false;
        void start(true);
      }
    },
    calibrate: () => {
      setLean(0);
      baseline.current = null;
    },
    scrub: (value: boolean) => {
      paused.current = value;
      baseline.current = null;
    },
  };
}
