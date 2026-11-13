import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

/** The plain background behind every screen. */
export function ScreenBackground() {
  const { colors: C } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />;
}
