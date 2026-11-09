import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { moveItem } from '../../shared/item-order';
import { useTheme } from './design/theme';

type Shared = {
  heights: Map<string, number>;
  offsets: Map<string, Animated.Value>;
  order: string[];
};

/** Three short lines: the handle you drag, like a map's stop list. */
function Handle({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path d="M5 8h14M5 12h14M5 16h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function Row<T>({
  item,
  itemKey,
  index,
  count,
  label,
  shared,
  render,
  onStart,
  onDrop,
  onStep,
}: {
  item: T;
  itemKey: string;
  index: number;
  count: number;
  label: string;
  shared: Shared;
  render: (item: T, index: number) => React.ReactNode;
  onStart: () => void;
  onDrop: (from: number, to: number) => void;
  onStep: (from: number, to: number) => void;
}) {
  const { colors: C } = useTheme();
  const lift = useRef(new Animated.Value(0)).current;
  // The held row draws above its neighbours.
  const [active, setActive] = useState(false);
  const lifted = useRef(new Animated.Value(0)).current;
  if (!shared.offsets.has(itemKey)) shared.offsets.set(itemKey, new Animated.Value(0));
  const offset = shared.offsets.get(itemKey)!;
  const latest = useRef({ index, onDrop, onStart, setActive });
  latest.current = { index, onDrop, onStart, setActive };

  const responder = useMemo(() => {
    let target = 0;
    const height = (key: string) => shared.heights.get(key) ?? 0;
    function targetFor(dy: number) {
      const from = latest.current.index;
      const keys = shared.order;
      let position = from;
      if (dy > 0) {
        let moved = 0;
        for (let next = from + 1; next < keys.length; next += 1) {
          if (dy > moved + height(keys[next]) / 2) {
            moved += height(keys[next]);
            position = next;
          } else break;
        }
      } else if (dy < 0) {
        let moved = 0;
        for (let next = from - 1; next >= 0; next -= 1) {
          if (-dy > moved + height(keys[next]) / 2) {
            moved += height(keys[next]);
            position = next;
          } else break;
        }
      }
      return position;
    }
    function shiftOthers(from: number, to: number) {
      const own = height(shared.order[from]);
      shared.order.forEach((key, index) => {
        if (index === from) return;
        const value = shared.offsets.get(key);
        if (!value) return;
        const shift = from < to && index > from && index <= to ? -own : from > to && index < from && index >= to ? own : 0;
        Animated.timing(value, { toValue: shift, duration: 120, useNativeDriver: true }).start();
      });
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        target = latest.current.index;
        latest.current.setActive(true);
        latest.current.onStart();
        Animated.timing(lifted, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gesture) => {
        lift.setValue(gesture.dy);
        const next = targetFor(gesture.dy);
        if (next !== target) {
          target = next;
          shiftOthers(latest.current.index, target);
        }
      },
      onPanResponderRelease: () => {
        const from = latest.current.index;
        shared.offsets.forEach(value => value.setValue(0));
        lift.setValue(0);
        lifted.setValue(0);
        latest.current.setActive(false);
        latest.current.onDrop(from, target);
      },
      onPanResponderTerminate: () => {
        shared.offsets.forEach(value => value.setValue(0));
        lift.setValue(0);
        lifted.setValue(0);
        latest.current.setActive(false);
        latest.current.onDrop(latest.current.index, latest.current.index);
      },
    });
  }, [shared, lift, lifted]);

  return (
    <Animated.View
      onLayout={event => shared.heights.set(itemKey, event.nativeEvent.layout.height)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: active ? 10 : 0,
        elevation: active ? 6 : 0,
        transform: [{ translateY: Animated.add(offset, lift) }, { scale: lifted.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
        opacity: lifted.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>{render(item, index)}</View>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Reorder ${label}, ${index + 1} of ${count}`}
        accessibilityHint="Drag up or down to change the order"
        accessibilityActions={[
          { name: 'moveUp', label: 'Move up' },
          { name: 'moveDown', label: 'Move down' },
          { name: 'increment', label: 'Move up' },
          { name: 'decrement', label: 'Move down' },
        ]}
        onAccessibilityAction={event => {
          const up = event.nativeEvent.actionName === 'moveUp' || event.nativeEvent.actionName === 'increment';
          onStep(index, up ? index - 1 : index + 1);
        }}
        hitSlop={8}
        style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Handle color={C.muted} />
      </View>
    </Animated.View>
  );
}

/**
 * A list you can reorder by dragging the ≡ handle on each row. `onDragging` lets the screen stop scrolling
 * while a row is held. The new order is reported once, when the row is dropped.
 */
export function DragList<T>({
  items,
  keyOf,
  labelOf,
  renderItem,
  onReorder,
  onDragging,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  labelOf: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  onDragging?: (dragging: boolean) => void;
}) {
  const shared = useRef<Shared>({ heights: new Map(), offsets: new Map(), order: [] }).current;
  shared.order = items.map(keyOf);
  const commit = (from: number, to: number) => {
    onDragging?.(false);
    if (to !== from && to >= 0 && to < items.length) onReorder(moveItem(items, from, to));
  };
  return (
    <View>
      {items.map((item, index) => (
        <Row
          key={keyOf(item)}
          item={item}
          itemKey={keyOf(item)}
          index={index}
          count={items.length}
          label={labelOf(item)}
          shared={shared}
          render={renderItem}
          onStart={() => onDragging?.(true)}
          onDrop={commit}
          onStep={(from, to) => {
            if (to >= 0 && to < items.length) onReorder(moveItem(items, from, to));
          }}
        />
      ))}
    </View>
  );
}
