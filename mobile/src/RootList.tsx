import React, { createContext, useCallback, useContext, useRef } from 'react';
import { FlatList, RefreshControl, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePaneState } from './pane-state';
import { useTheme } from './design/theme';
const RootListNavigation = createContext(() => {});
export const useRootListNavigation = () => useContext(RootListNavigation);
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
}: {
  children: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  updatedAt: Date | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  inset?: 'automatic' | 'never';
  staticContent?: boolean;
}) {
  const { colors: C } = useTheme();
  const [offset, setOffset] = usePaneState('scrollOffset', 0);
  const list = useRef<FlatList<React.ReactNode>>(null);
  const restored = useRef(false);
  const items = rows(children);
  const resetScroll = useCallback(() => {
    setOffset(0);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [setOffset]);
  return (
    <RootListNavigation.Provider value={resetScroll}>
      {staticContent ? (
        <View style={{ flex: 1 }}>{items}</View>
      ) : (
        <FlatList
          ref={list}
          style={{ flex: 1 }}
          data={items}
          contentInsetAdjustmentBehavior={inset}
          contentContainerStyle={contentContainerStyle}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lime} />
          }
        />
      )}
    </RootListNavigation.Provider>
  );
}
