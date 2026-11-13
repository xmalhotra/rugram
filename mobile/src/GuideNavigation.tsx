import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Switch, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Gyroscope } from 'expo-sensors';
import { useFocusEffect } from 'expo-router';
import { initialTiltState, tiltNavigation } from '../../shared/tilt-navigation';
import { Text } from './design/Text';
import { hit, space, useTheme } from './design/theme';

export function GuideNavigation({
  index,
  count,
  onChange,
}: {
  index: number;
  count: number;
  onChange: (index: number) => void;
}) {
  const { colors: C } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef(false);
  const requesting = useRef(false);
  const stop = useRef<() => void>(() => {});
  const current = useRef({ index, count, onChange });
  current.current = { index, count, onChange };
  useFocusEffect(
    useCallback(() => {
      live.current = true;
      return () => {
        live.current = false;
        stop.current();
        setEnabled(false);
      };
    }, []),
  );
  useEffect(() => {
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        stop.current();
        setEnabled(false);
      }
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) {
        stop.current();
        setEnabled(false);
      }
    });
    return () => {
      app.remove();
      motion.remove();
      stop.current();
    };
  }, []);
  useEffect(() => {
    if (!enabled || !live.current) return;
    let state = initialTiltState();
    try {
      Gyroscope.setUpdateInterval(100);
      const listener = Gyroscope.addListener(sample => {
        if (!live.current || AppState.currentState !== 'active') return;
        const next = tiltNavigation(state, sample.z, Date.now());
        state = next.state;
        if (next.step) {
          const latest = current.current;
          const target = Math.max(0, Math.min(latest.count - 1, latest.index + next.step));
          if (target !== latest.index) latest.onChange(target);
        }
      });
      stop.current = () => listener.remove();
      return () => listener.remove();
    } catch {
      setEnabled(false);
      setMessage('Tilt could not start. Use the slider instead.');
    }
  }, [enabled]);
  async function toggle(value: boolean) {
    if (!value) {
      stop.current();
      setEnabled(false);
      return;
    }
    if (requesting.current) return;
    requesting.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (await AccessibilityInfo.isReduceMotionEnabled()) {
        if (live.current) setMessage('Reduce Motion is on. Use the slider instead.');
        return;
      }
      if (!(await Gyroscope.isAvailableAsync())) {
        if (live.current) setMessage('Tilt is unavailable here. The slider still works.');
        return;
      }
      let permission = await Gyroscope.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain)
        permission = await Gyroscope.requestPermissionsAsync();
      if (!permission.granted) {
        if (live.current)
          setMessage('Motion access is off. Use the slider or allow access in Settings.');
        return;
      }
      if (live.current && AppState.currentState === 'active') setEnabled(true);
    } catch {
      if (live.current) setMessage('Tilt could not start. Use the slider instead.');
    } finally {
      requesting.current = false;
      if (live.current) setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.xxs }}>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(1, count - 1)}
        step={1}
        value={index}
        disabled={count < 2}
        accessibilityLabel="Guide card"
        accessibilityValue={{
          min: 1,
          max: count,
          now: index + 1,
          text: `Card ${index + 1} of ${count}`,
        }}
        minimumTrackTintColor={C.lime}
        maximumTrackTintColor={C.line}
        thumbTintColor={C.lime}
        onSlidingStart={() => {
          stop.current();
          setEnabled(false);
        }}
        onValueChange={onChange}
        style={{ width: '100%', height: hit }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.ms,
          minHeight: hit,
        }}
      >
        <Text variant="footnote" style={{ color: C.muted, flexShrink: 1 }}>
          {enabled ? 'Gently roll your phone left or right' : 'Tilt to change cards'}
        </Text>
        <Switch
          value={enabled}
          disabled={busy || count < 2}
          onValueChange={value => void toggle(value)}
          accessibilityLabel="Tilt to change cards"
          trackColor={{ true: C.lime }}
        />
      </View>
      {!!message && (
        <Text accessibilityLiveRegion="polite" variant="caption" style={{ color: C.muted }}>
          {message}
        </Text>
      )}
    </View>
  );
}
