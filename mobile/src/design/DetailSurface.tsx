import React, { createContext, useCallback, useContext } from 'react';
import { BackHandler, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView as NativeTabSafeAreaView } from 'react-native-screens/experimental';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useTheme } from './theme';

const InlineDetailDepth = createContext(0);
const focusedInlineLayers = new Set<{ depth: number }>();

/** True while an inline detail is covering the focused tab, so a repeated tab tap should close that first. */
export function hasFocusedInlineDetail() {
  return focusedInlineLayers.size > 0;
}

/** Browsing details stay inside the tab scene; native dialogs remain genuinely modal. */
export function DetailSurface({
  children,
  onClose,
  fullScreen,
  presentation,
  safeArea = true,
}: {
  children: React.ReactNode;
  onClose: () => void;
  fullScreen: boolean;
  presentation?: 'inline' | 'modal';
  /** False when the content handles the safe area itself (a full-screen page with its own header). */
  safeArea?: boolean;
}) {
  const parentDepth = useContext(InlineDetailDepth);
  const inline = presentation ? presentation === 'inline' : parentDepth > 0;
  const depth = inline ? parentDepth + 1 : 0;
  const { colors: C } = useTheme();
  const navigation = useNavigation<{
    addListener: (event: 'tabPress', handler: () => void) => () => void;
    isFocused: () => boolean;
  }>();
  useFocusEffect(
    useCallback(() => {
      if (!inline) return;
      const layer = { depth };
      focusedInlineLayers.add(layer);
      const back = BackHandler.addEventListener('hardwareBackPress', () => {
        // Effect-registration order must not let a parent consume a nested info panel's Back.
        if ([...focusedInlineLayers].some(other => other.depth > depth)) return false;
        onClose();
        return true;
      });
      // Re-selecting the active bottom tab dismisses its detail, preserving the list/category.
      // Nested info panels must not each consume the same tab event.
      const removeTabPress =
        depth === 1
          ? navigation.addListener('tabPress', () => {
              if (!navigation.isFocused()) return;
              onClose();
            })
          : undefined;
      return () => {
        focusedInlineLayers.delete(layer);
        back.remove();
        removeTabPress?.();
      };
    }, [inline, depth, onClose, navigation]),
  );

  if (inline)
    return (
      <InlineDetailDepth.Provider value={depth}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, zIndex: 20 }]}>
          {Platform.OS === 'ios' && !parentDepth ? (
            // NativeTabs' floating bar is an interface inset, not just the home-indicator inset.
            <NativeTabSafeAreaView edges={{ top: true, bottom: true, left: true, right: true }}>
              {children}
            </NativeTabSafeAreaView>
          ) : (
            <SafeAreaView edges={parentDepth ? [] : ['top', 'bottom']} style={{ flex: 1 }}>
              {children}
            </SafeAreaView>
          )}
        </View>
      </InlineDetailDepth.Provider>
    );
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={fullScreen ? 'fullScreen' : 'pageSheet'}
      onRequestClose={onClose}
    >
      <InlineDetailDepth.Provider value={0}>
        <SafeAreaProvider initialMetrics={fullScreen ? initialWindowMetrics : undefined}>
          {safeArea ? (
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>{children}</SafeAreaView>
          ) : (
            <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>
          )}
        </SafeAreaProvider>
      </InlineDetailDepth.Provider>
    </Modal>
  );
}
