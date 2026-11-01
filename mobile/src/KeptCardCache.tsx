import { useEffect } from 'react';
import { Image } from 'react-native';
import { cardsToKeep } from '../../shared/kept-cards';
import { fitnessMedia } from '../../shared/fitness-guides';
import type { MobileProfile } from '../../shared/mobile';
import type { Demonstrator } from '../../shared/movement-viewer';
import { usePaneState } from './pane-state';
import { fitnessAtlases } from './fitness-media';
import { cindyFrameRow } from './cindy-frames';
import { useSession } from './session';

function sourcesForCard(cardId: string, gender: Demonstrator) {
  const media = fitnessMedia[cardId];
  if (!media) return [];
  if (media.atlas === 'cindy') return [...cindyFrameRow(gender, media.row)];
  const atlas = fitnessAtlases[media.atlas]?.[gender];
  return atlas ? [atlas] : [];
}

/** Warm the top cards, Home, and liked or added cards. Everything else waits until it is opened. */
export function KeptCardCache() {
  const { data } = useSession();
  const [gender] = usePaneState<Demonstrator>('movementDemonstrator', 'male', 'account');
  const profile: MobileProfile | undefined = data?.profile;
  const kept = profile ? cardsToKeep(profile).join('\n') : '';
  useEffect(() => {
    if (!profile) return;
    const sources = new Set<number>();
    for (const id of cardsToKeep(profile)) {
      for (const source of sourcesForCard(id, gender)) sources.add(source);
    }
    for (const source of sources) {
      const uri = Image.resolveAssetSource(source)?.uri;
      if (uri?.startsWith('http')) void Image.prefetch(uri).catch(() => {});
    }
  }, [kept, gender, profile]);
  return null;
}
