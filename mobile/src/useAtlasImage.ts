import { useEffect, useRef, useState } from 'react';
import { Image } from 'react-native';

type LoadStatus = 'loading' | 'ready' | 'slow' | 'error';
/** The request, not the card or pose, owns load state. Cached onLoad cannot be reset by an effect. */
export function useAtlasImage(source: number, identity: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${identity}:${attempt}`;
  const current = useRef(key);
  current.current = key;
  const [result, setResult] = useState<{ key: string; status: LoadStatus; reason?: string }>({
    key,
    status: 'loading',
  });
  const status = result.key === key ? result.status : 'loading';
  const settle = (next: LoadStatus, reason?: string) => {
    if (current.current === key) setResult({ key, status: next, reason });
  };
  useEffect(() => {
    // In Expo Go, warm the LAN asset cache for the current and adjacent mounted cards.
    // Installed resource/file assets need no network prefetch. This never gates rendering.
    const uri = Image.resolveAssetSource(source)?.uri;
    if (uri?.startsWith('http')) void Image.prefetch(uri).catch(() => {});
  }, [source, attempt]);
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      if (current.current !== key) return;
      setResult(previous =>
        previous.key === key && previous.status !== 'loading' ? previous : { key, status: 'slow' },
      );
    }, 30000);
    return () => clearTimeout(timer);
  }, [key, status]);
  return {
    key,
    ready: status === 'ready',
    failed: status === 'error',
    slow: status === 'slow',
    reason: result.key === key ? result.reason : undefined,
    onLoad: () => settle('ready'),
    onError: (event: { nativeEvent: { error: string } }) =>
      settle('error', event.nativeEvent.error),
    retry: () => setAttempt(value => value + 1),
  };
}
