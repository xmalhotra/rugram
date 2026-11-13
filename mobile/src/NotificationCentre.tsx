import { Glyph } from './design/Glyph';
import { DetailSurface } from './design/DetailSurface';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Platform, Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import type { InboxItem, NotificationInbox } from '../../shared/notifications';
import { formatDate } from '../../shared/format';
import { api } from './api';
import { useSession } from './session';
import { Button } from './design/components';
import { ScreenBackground } from './design/ScreenBackground';
import { Banner, EmptyState, Skeleton } from './design/states';
import { Text } from './design/Text';
import { useTheme, space, radius, hit, opacity, size } from './design/theme';
/** Lets a page cover its tab's content while the bottom menu stays visible. */
export const ScreenOverlay = createContext<((node: React.ReactNode) => void) | null>(null);

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d`;
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

function UpdateRow({ item, disabled, onPress }: { item: InboxItem; disabled: boolean; onPress: () => void }) {
  const { colors: C } = useTheme();
  const unread = !item.readAt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.readAt ? 'Read' : 'Unread'}. ${item.title}. ${item.body}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.ms,
        paddingVertical: space.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: C.line,
        opacity: pressed ? opacity.pressed : 1
      })}
    >
      <View style={{ width: 8, paddingTop: 7 }}>
        {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime }} /> : null}
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'baseline' }}>
          <Text variant="callout" numberOfLines={2} style={{ flex: 1, color: C.text, fontWeight: unread ? '600' : '400'}}>
            {item.title}
          </Text>
          <Text variant="footnote" style={{ color: C.muted }}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text variant="subhead" numberOfLines={2} style={{ color: C.muted }}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );
}

function UpdatesPage({
  inbox,
  busy,
  error,
  onBack,
  onRetry,
  onRead,
  onReadAll,
  onMore
}: {
  inbox: NotificationInbox;
  busy: boolean;
  error: string;
  onBack: () => void;
  onRetry: () => void;
  onRead: (item: InboxItem) => void;
  onReadAll: () => void;
  onMore: () => void;
}) {
  const { colors: C } = useTheme();
  const top = useSafeAreaInsets().top;
  return (
    <View style={{ flex: 1, paddingTop: top, backgroundColor: C.bg }}>
      <ScreenBackground />
      <View
        style={{
          minHeight: size.button,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: C.line
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={{ minWidth: hit, minHeight: hit, alignItems: 'center', justifyContent: 'center' }}
        >
          <Glyph name={{ ios: 'chevron.left', android: 'arrow_back' }} fallback="←" color={C.text} />
        </Pressable>
        <Text variant="headline" accessibilityRole="header" style={{ flex: 1, color: C.text }}>
          Updates
        </Text>
        {inbox.unreadCount > 0 ? (
          <Button
            variant="text"
            size="regular"
            title="Mark all read"
            accessibilityLabel="Mark all as read"
            disabled={busy}
            onPress={onReadAll}
          />
        ) : null}
      </View>
      {error ? <Banner kind="error" message={error} action={{ label: 'Retry', onPress: onRetry }} /> : null}
      {busy && inbox.items.length === 0 ? (
        <Skeleton shape="card" />
      ) : (
        <FlatList
          data={inbox.items}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: 128 }}
          renderItem={({ item }) => <UpdateRow item={item} disabled={busy} onPress={() => onRead(item)} />}
          ListEmptyComponent={
            <EmptyState title="Nothing here yet." description="Approvals and updates will appear here." />
          }
          ListFooterComponent={
            inbox.nextCursor ? <Button title="Older updates" secondary disabled={busy} onPress={onMore} /> : undefined
          }
        />
      )}
    </View>
  );
}

export function NotificationCentre({ onOpen }: { onOpen: (target: InboxItem['target']) => void }) {
  const { data } = useSession();
  const { colors: C } = useTheme();
  const [inbox, setInbox] = useState<NotificationInbox>(
    data?.inbox ?? { items: [], unreadCount: 0, nextCursor: null },
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const showOverlay = useContext(ScreenOverlay);
  const alive = useRef(false);
  const inflight = useRef(false);
  const load = useCallback(async () => {
    if (!alive.current || inflight.current || AppState.currentState !== 'active') return;
    inflight.current = true;
    try {
      const value = await api<NotificationInbox>('/api/mobile/notifications');
      if (alive.current) {
        setInbox(value);
        setError('');
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load updates.');
    } finally {
      inflight.current = false;
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void load();
      const timer = setInterval(() => void load(), 15000);
      const listener = AppState.addEventListener('change', state => {
        if (state === 'active') void load();
      });
      return () => {
        alive.current = false;
        clearInterval(timer);
        listener.remove();
      };
    }, [load]),
  );
  async function read(item?: InboxItem) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const value = await api<NotificationInbox>(
        '/api/mobile/notifications',
        item ? { action: 'read', id: item.id } : { action: 'read-all' },
      );
      setInbox(value);
      if (item) {
        setOpen(false);
        onOpen(item.target);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the inbox.');
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (busy || !inbox.nextCursor) return;
    setBusy(true);
    try {
      const value = await api<NotificationInbox>(
        `/api/mobile/notifications?cursor=${encodeURIComponent(inbox.nextCursor)}`,
      );
      setInbox(previous => ({
        ...value,
        items: [
          ...new Map([...previous.items, ...value.items].map(item => [item.id, item])).values(),
        ]
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load older updates.');
    } finally {
      setBusy(false);
    }
  }
  const page = (
    <UpdatesPage
      inbox={inbox}
      busy={busy}
      error={error}
      onBack={() => setOpen(false)}
      onRetry={() => void load()}
      onRead={item => void read(item)}
      onReadAll={() => void read()}
      onMore={() => void more()}
    />
  );
  // In a tab, the page covers the tab's content so the bottom menu stays in reach.
  useEffect(() => {
    if (showOverlay) showOverlay(open ? page : null);
    // `page` is rebuilt each render from these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOverlay, open, inbox, busy, error]);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications${inbox.unreadCount ? `, ${inbox.unreadCount} unread` : ''}`}
        onPress={() => {
          setOpen(true);
          void load();
        }}
        style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}
      >
        {Platform.OS === 'ios' ? (
          <SymbolView name="bell" tintColor={C.lime} style={{ width: 24, height: 24 }} />
        ) : (
          <Text variant="heading" style={{ color: C.lime }}>♧</Text>
        )}
        {inbox.unreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              borderRadius: radius.pill,
              minWidth: 18,
              height: 18,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text variant="caption" style={{ color: C.onAccent }}>
              {inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
      {!showOverlay ? (
        open ? (
          <DetailSurface presentation="modal" fullScreen safeArea={false} onClose={() => setOpen(false)}>
            {page}
          </DetailSurface>
        ) : null
      ) : null}
    </>
  );
}
