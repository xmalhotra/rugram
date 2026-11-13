import React from 'react';
import { NativeTabs } from 'expo-router/native-tabs';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Text } from '../../src/design/Text';
import { useSession } from '../../src/session';
import { useTheme } from '../../src/design/theme';
export default function TabLayout() {
  const { data } = useSession();
  const { colors: C } = useTheme();
  const admin = data?.user.role === 'admin';
  const creator = data?.user.role === 'creator';
  const attention = [...(data?.products ?? []), ...(data?.events ?? [])].filter(
    item => item.createdBy === data?.user.id && item.status === 'archived' && item.reviewNote,
  ).length;
  const pending = [...(data?.products ?? []), ...(data?.events ?? [])].filter(
    item => item.status === 'pending',
  ).length;
  // Android's native tabs support at most five destinations. Creators need six
  // in this roadmap; use the standard JS navigator rather than crashing there.
  if (Platform.OS === 'android' && creator)
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.lime,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: { backgroundColor: C.card },
          freezeOnBlur: true,
        }}
      >
        {(['index', 'flows', 'picks', 'events'] as const).map((name, index) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: ['Home', 'Flows', 'Picks', 'Events'][index],
              tabBarIcon: ({ color }) => (
                <Text variant="heading" style={{ color }}>{['⌂', '▱', '▢', '▦', '✎'][index]}</Text>
              ),
            }}
          />
        ))}
        <Tabs.Screen name="studio" options={{ href: null }} />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="you" options={{ href: null }} />
      </Tabs>
    );
  return (
    <NativeTabs
      tintColor={C.lime}
      backgroundColor={C.card}
      minimizeBehavior="never"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets hidden={admin}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="flows" disableAutomaticContentInsets hidden={admin}>
        <NativeTabs.Trigger.Label>Flows</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="view_agenda" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="picks" disableAutomaticContentInsets hidden={admin}>
        <NativeTabs.Trigger.Label>Picks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bag', selected: 'bag.fill' }} md="shopping_bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events" disableAutomaticContentInsets hidden={admin}>
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="studio" disableAutomaticContentInsets hidden>
        <NativeTabs.Trigger.Label>Studio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.and.pencil" md="edit" />
        {attention > 0 && <NativeTabs.Trigger.Badge>{String(attention)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="admin" hidden={!admin}>
        <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="admin_panel_settings" />
        {pending > 0 && <NativeTabs.Trigger.Badge>{String(pending)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      {/* Everyone else reaches You from Home's avatar; admins have no Home, so they keep the tab. */}
      <NativeTabs.Trigger name="you" disableAutomaticContentInsets hidden={!admin}>
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
