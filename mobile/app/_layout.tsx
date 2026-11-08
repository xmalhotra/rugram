import { ToastProvider, EmptyState } from '../src/design/states';
import { PaneStateProvider } from '../src/pane-state';
import { OutboundProvider } from '../src/OutboundLink';
import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { ScreenBackground } from '../src/design/ScreenBackground';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../src/session';
import { useTheme, AppearancePreferenceContext } from '../src/design/theme';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { FontReadyContext } from '../src/design/Text';
import { LaunchReveal, useLaunchReady } from '../src/LaunchReveal';
export default function RootLayout() {
  const { colors: C } = useTheme();
  const [ready, error] = useFonts({
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
  });
  // The launch mark covers the screen until the first real screen is ready.
  return (
    <LaunchReveal>
      {!ready && !error ? (
        <View style={{ flex: 1, backgroundColor: C.bg }} />
      ) : (
        <FontReadyContext.Provider value={ready}>
          <SafeAreaProvider>
            <SessionProvider>
              <Navigator />
            </SessionProvider>
          </SafeAreaProvider>
        </FontReadyContext.Provider>
      )}
    </LaunchReveal>
  );
}
function Navigator() {
  const { data } = useSession();
  return (
    <AppearancePreferenceContext.Provider value={data?.profile.appearance ?? 'system'}>
      <ToastProvider>
        <PaneStateProvider key={data?.user.id ?? 'signed-out'}>
          <OutboundProvider>
            <NavigationContent />
          </OutboundProvider>
        </PaneStateProvider>
      </ToastProvider>
    </AppearancePreferenceContext.Provider>
  );
}
function NavigationContent() {
  const { loading, data, bootstrapFailed, error, refresh, logout } = useSession();
  const { colors: C, scheme } = useTheme();
  useLaunchReady(!loading);
  // The launch mark is on top while the session loads.
  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ScreenBackground />
      </View>
    );
  if (!data && bootstrapFailed)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.bg }}>
        <EmptyState
          title="Could not load Qram"
          description={error || 'Check your connection and try again.'}
          action={{ label: 'Retry', onPress: () => void refresh() }}
        />
        <EmptyState
          title=""
          action={{ label: 'Sign out on this device', onPress: () => void logout() }}
        />
      </View>
    );
  // Expo Go uses application-level status-bar styling. Setting the native stack's
  // statusBarStyle requires a different, build-time Info.plist setting and logs an
  // iOS error in Expo Go. Keep expo-status-bar as the single owner instead.
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={!data}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={data?.user.role === 'admin'}>
          <Stack.Screen name="management" />
          <Stack.Screen name="design-system" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(data)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="member/[id]" />
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="flow/[id]" />
        <Stack.Screen name="pick/[id]" />
        <Stack.Screen name="event/[id]" />
      </Stack>
    </>
  );
}
