import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../src/design/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { AdminWorkspace } from '../src/AdminWorkspace';
import { Button, Sheet } from '../src/design/components';
import { useTheme } from '../src/design/theme';
import { useSession } from '../src/session';
import { NeonBackdrop } from '../src/design/NeonBackdrop';
import { api } from '../src/api';
import type { CityEvent, MobilePayload } from '../../shared/mobile';
import { NotificationCentre } from '../src/NotificationCentre';
import { EventRegistrationPanel } from '../src/EventRegistrationPanel';

export default function ManagementScreen() {
  const router = useRouter();
  const { data, busy, error, setError, setBusy, setData, refresh, logout } = useSession();
  const { colors: C } = useTheme();
  const [notificationEvent, setNotificationEvent] = useState<CityEvent | null>(null);
  if (!data) return <Redirect href="/" />;
  if (data.user.role !== 'admin') return <Redirect href="/(tabs)" />;
  async function reload() {
    setData(await api<MobilePayload>('/api/mobile'));
  }
  async function policy(creatorHandle: string, limit: number) {
    setBusy(true);
    setError('');
    try {
      await api('/api/mobile', { action: 'creator-event-limit', creatorHandle, limit });
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update creator permissions.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    try {
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log out. Please try again.');
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <NeonBackdrop />
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderColor: C.line,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: C.text, flex: 1, minWidth: 0 }}>
            Qram · Admin
          </Text>
          <NotificationCentre
            key={data.user.id}
            onOpen={target => {
              const event = data.events.find(item => item.id === target.id);
              if (event) setNotificationEvent(event);
              else void refresh();
            }}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.muted }}>
            {data.user.name} · @{data.user.handle}
          </Text>
          <Button
            title="Design system preview"
            secondary
            onPress={() => router.push('/design-system')}
          />
          <Button
            title="Log out"
            secondary
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Log out of admin?',
                'Sign in with a user account to explore the user app.',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Log out', onPress: () => void signOut() },
                ],
              )
            }
          />
        </View>
      </View>
      {notificationEvent && (
        <Sheet title={notificationEvent.title} onClose={() => setNotificationEvent(null)}>
          <EventRegistrationPanel event={notificationEvent} />
        </Sheet>
      )}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={() => void refresh()} tintColor={C.lime} />
        }
      >
        {error ? (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
        <AdminWorkspace data={data} onChanged={reload} onPolicy={policy} />
      </ScrollView>
    </SafeAreaView>
  );
}
