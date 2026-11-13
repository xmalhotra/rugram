import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePaneState } from './pane-state';
import { useTheme } from './design/theme';
const RootListNavigation = createContext(() => {});
export const useRootListNavigation = () => useContext(RootListNavigation);
/** Space a screen that scrolls itself should leave for the glass header, so it scrolls beneath it. */
const RootListInset = createContext(0);
export const useRootListInset = () => useContext(RootListInset);
function rows(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap(child =>
    React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment
      ? rows(child.props.children)
      : [child],
  );
}
/** One vertical root list. Horizontal shelves retain their own fixed-size lists. */
export function RootList({
  children,
  refreshing,
  onRefresh,
  contentContainerStyle,
  inset = 'automatic',
  staticContent = false,
  topInset = 0,
  scrollY,
  scrollKey,
}: {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  updatedAt: Date | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  inset?: 'automatic' | 'never';
  staticContent?: boolean;
  /** Space reserved for an overlaid header that scrolls away. */
  topInset?: number;
  /** Receives the scroll offset on the native thread, for headers that hide on scroll. */
  scrollY?: Animated.Value;
  /** Keeps a separate vertical offset for each top tab. */
  scrollKey?: string;
}) {
  const { colors: C } = useTheme();
  const [offset, setOffset] = usePaneState(`scrollOffset:${scrollKey}`, 0);
  const list = useRef<FlatList<React.ReactNode>>(null);
  const restored = useRef(false);
  const seenKey = useRef(scrollKey);
  if (seenKey.current !== scrollKey) {
    seenKey.current = scrollKey;
    restored.current = false;
  }
  const items = rows(children);
  const onScroll = useMemo(
    () =>
      scrollY
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })
        : undefined,
    [scrollY],
  );
  const resetScroll = useCallback(() => {
    setOffset(0);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [setOffset]);
  return (
    <RootListNavigation.Provider value={resetScroll}>
      {staticContent ? (
        <RootListInset.Provider value={topInset}>
          <View style={{ flex: 1 }}>{items}</View>
        </RootListInset.Provider>
      ) : (
        <Animated.FlatList
          key={String(scrollKey)}
          ref={list as never}
          style={{ flex: 1 }}
          data={items}
          contentInsetAdjustmentBehavior={inset}
          contentContainerStyle={[
            contentContainerStyle,
            topInset ? { paddingTop: topInset } : null,
          ]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          onContentSizeChange={() => {
            if (!restored.current) {
              restored.current = true;
              if (offset > 0) list.current?.scrollToOffset({ offset, animated: false });
            }
          }}
          onMomentumScrollEnd={event => setOffset(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={event => setOffset(event.nativeEvent.contentOffset.y)}
          keyExtractor={(item, index) =>
            React.isValidElement(item) ? String(item.key ?? index) : String(index)
          }
          renderItem={({ item }) => <View>{item}</View>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.lime}
              progressViewOffset={topInset}
            />
          }
        />
      )}
    </RootListNavigation.Provider>
  );
}
