import React, { useCallback, useRef, useState } from 'react';
import { AppState, Platform, Pressable, SectionList, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import type { InboxItem, NotificationInbox } from '../../shared/notifications';
import { formatDate } from '../../shared/format';
import { api } from './api';
import { useSession } from './session';
import { Button, Sheet } from './design/components';
import { Banner, EmptyState, Skeleton } from './design/states';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
export function NotificationCentre({ onOpen }: { onOpen: (target: InboxItem['target']) => void }) {
  const { data } = useSession();
  const { colors: C } = useTheme();
  const [inbox, setInbox] = useState<NotificationInbox>(
    data?.inbox ?? { items: [], unreadCount: 0, nextCursor: null },
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
        ],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load older updates.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications${inbox.unreadCount ? `, ${inbox.unreadCount} unread` : ''}`}
        onPress={() => {
          setOpen(true);
          void load();
        }}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        {Platform.OS === 'ios' ? (
          <SymbolView name="bell" tintColor={C.lime} style={{ width: 24, height: 24 }} />
        ) : (
          <Text style={{ color: C.lime, fontSize: 22 }}>♧</Text>
        )}
        {inbox.unreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.onAccent, fontSize: 10 }}>
              {inbox.unreadCount > 99 ? '99+' : inbox.unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
      {open && (
        <Sheet title="Updates" fullScreen scrollable={false} onClose={() => setOpen(false)}>
          {error && (
            <Banner
              kind="error"
              message={error}
              action={{ label: 'Retry', onPress: () => void load() }}
            />
          )}
          <Button
            title="Mark all as read"
            secondary
            disabled={busy || inbox.unreadCount === 0}
            onPress={() => void read()}
          />
          {busy && inbox.items.length === 0 ? (
            <Skeleton shape="card" />
          ) : (
            <SectionList
              sections={[{ title: 'Updates', data: inbox.items }]}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.readAt ? 'Read' : 'Unread'}. ${item.title}. ${item.body}`}
                  disabled={busy}
                  onPress={() => void read(item)}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line, gap: 6 }}
                >
                  <Text
                    style={{
                      color: item.readAt ? C.text : C.lime,
                      fontWeight: item.readAt ? '400' : '600',
                      fontSize: 17,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text numberOfLines={3} style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
                    {item.body}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {formatDate(item.createdAt, {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <EmptyState
                  title="Nothing here yet."
                  description="Approvals and updates will appear here."
                />
              }
              ListFooterComponent={
                inbox.nextCursor ? (
                  <Button
                    title="Older updates"
                    secondary
                    disabled={busy}
                    onPress={() => void more()}
                  />
                ) : undefined
              }
            />
          )}
        </Sheet>
      )}
    </>
  );
}
