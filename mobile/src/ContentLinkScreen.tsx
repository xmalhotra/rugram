import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { CityEvent, HabitFlow, Product } from '../../shared/mobile';
import type { SharedKind } from '../../shared/sharing';
import { PhoneSignIn } from './PhoneSignIn';
import { useSession } from './session';
import { api } from './api';
import { ApiError } from '../../shared/api-response';
import { EmptyState, Skeleton } from './design/states';
import { useTheme } from './design/theme';
export function ContentLinkScreen({ kind }: { kind: SharedKind }) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data, setData } = useSession();
  const userId = data?.user.id;
  const router = useRouter();
  const { colors: C } = useTheme();
  const [ready, setReady] = useState('');
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || !id) return;
    let active = true;
    setError('');
    setReady('');
    setUnavailable(false);
    void api<{ kind: SharedKind; item: HabitFlow | Product | CityEvent }>(
      `/api/mobile/item?kind=${kind}&id=${encodeURIComponent(id)}`,
    )
      .then(result => {
        if (!active) return;
        const field = kind === 'flow' ? 'flows' : kind === 'pick' ? 'products' : 'events';
        setData(previous =>
          previous?.user.id === userId
            ? {
                ...previous,
                [field]: [...previous[field].filter(item => item.id !== id), result.item],
              }
            : previous,
        );
        setReady(`${kind}:${id}`);
      })
      .catch(cause => {
        if (active) {
          setUnavailable(cause instanceof ApiError && cause.status === 404);
          setError(cause instanceof Error ? cause.message : 'Could not open this item.');
        }
      });
    return () => {
      active = false;
    };
  }, [userId, id, kind, retry, setData]);
  // Keeping this route mounted through OTP preserves the destination on cold start.
  if (!data) return <PhoneSignIn />;
  if (!id || error)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}>
        <EmptyState
          title={unavailable ? 'This item is no longer available.' : 'Could not open this item.'}
          description={error}
          action={{
            label: unavailable ? 'Browse related items' : 'Retry',
            onPress: () =>
              unavailable
                ? router.replace(
                    kind === 'flow'
                      ? '/(tabs)/flows'
                      : kind === 'pick'
                        ? '/(tabs)/picks'
                        : '/(tabs)/events',
                  )
                : setRetry(value => value + 1),
          }}
        />
      </View>
    );
  if (ready !== `${kind}:${id}`)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' }}>
        <Skeleton shape="card" />
      </View>
    );
  // Enter the actual tab scene after resolving the item, rather than a tab-less detail copy.
  return (
    <Redirect
      href={{
        pathname:
          kind === 'flow' ? '/(tabs)/flows' : kind === 'pick' ? '/(tabs)/picks' : '/(tabs)/events',
        params: { detailKind: kind, detailId: id },
      }}
    />
  );
}
