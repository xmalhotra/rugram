/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const storageKey = 'qram-run-sound';
let soundOn = true;
const listeners = new Set<(on: boolean) => void>();
void SecureStore.getItemAsync(storageKey)
  .then(value => {
    if (value === 'off') {
      soundOn = false;
      listeners.forEach(listener => listener(false));
    }
  })
  .catch(() => undefined);

/** Whether workout sounds are on, kept on this phone. */
export function useRunSound(): [boolean, () => void] {
  const [on, setOn] = useState(soundOn);
  useEffect(() => {
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  const toggle = () => {
    soundOn = !soundOn;
    listeners.forEach(listener => listener(soundOn));
    void SecureStore.setItemAsync(storageKey, soundOn ? 'on' : 'off').catch(() => undefined);
    if (soundOn) void playRestEnd();
  };
  return [on, toggle];
}

const sources = {
  rest: require('../assets/sounds/rest-end.wav'),
  tick: require('../assets/sounds/count-tick.wav'),
  go: require('../assets/sounds/count-go.wav'),
};
const players: Partial<Record<keyof typeof sources, AudioPlayer>> = {};

/** Plays one of the workout sounds. Over any music, even with the ringer off. Never throws. */
export async function playRunSound(name: keyof typeof sources) {
  if (!soundOn) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    const player = (players[name] ??= createAudioPlayer(sources[name]));
    await player.seekTo(0);
    player.play();
  } catch {
    // A missing sound must never interrupt a workout.
  }
}

/** The chime when rest ends. */
export function playRestEnd() {
  return playRunSound('rest');
}
