import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Text } from './Text';
import { useTheme, statusTone, hit, layout, opacity, radius, space, stroke, textRoles } from './theme';
import { Button, ProgressSteps } from './parts';
import { LoadingPulse } from '../motion';
export { IconButton } from './parts';

export function Skeleton({
  shape = 'line',
  width = '100%',
}: {
  shape?: 'line' | 'block' | 'card';
  width?: ViewStyle['width'];
}) {
  const { colors: C } = useTheme();
  return (
    <LoadingPulse>
      <View
        accessible
        accessibilityLabel="Loading"
        style={{
          width,
          // Heights are the shapes themselves, not spacing.
          height: shape === 'line' ? space.md : shape === 'block' ? 80 : 160,
          borderRadius: shape === 'line' ? radius.pill : radius.card,
          backgroundColor: C.line,
          marginVertical: space.sm,
        }}
      />
    </LoadingPulse>
  );
}
export function EmptyState({
  title,
  description,
  illustration,
  action,
}: {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ padding: space.xl, gap: space.ms, alignItems: 'center' }}>
      {illustration}
      <Text accessibilityRole="header" variant="heading" style={{ color: C.text, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text variant="body" style={{ color: C.muted, textAlign: 'center' }}>
          {description}
        </Text>
      )}
      {action && (
        <View style={{ alignItems: 'center' }}>
          <Button variant="text" title={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}
export function Banner({
  kind = 'info',
  message,
  onDismiss,
  action,
}: {
  kind?: 'offline' | 'demo' | 'info' | 'error';
  message: string;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const { colors: C } = useTheme();
  return (
    <View
      accessibilityRole={kind === 'error' ? 'alert' : undefined}
      style={{
        borderWidth: stroke.line,
        borderColor: kind === 'error' ? C.danger : C.line,
        borderRadius: radius.control,
        backgroundColor: C.card,
        padding: space.ms,
        gap: space.sm,
      }}
    >
      <Text variant="subhead" style={{ color: kind === 'error' ? C.danger : C.muted }}>
        {message}
      </Text>
      {(action || onDismiss) && (
        <View style={{ flexDirection: 'row', gap: space.md }}>
          {action && <Button variant="text" size="regular" title={action.label} onPress={action.onPress} />}
          {onDismiss && (
            <Button
              variant="text"
              size="regular"
              title="Dismiss"
              accessibilityLabel="Dismiss message"
              onPress={onDismiss}
            />
          )}
        </View>
      )}
    </View>
  );
}
type ToastMessage = {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
  undo?: () => void;
};
type ToastInput = Omit<ToastMessage, 'id'>;
const ToastContext = createContext<((message: ToastInput) => void) | null>(null);
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('ToastProvider is required.');
  return value;
}
export function Toast({ item, onDismiss }: { item: ToastMessage; onDismiss: () => void }) {
  const { colors: C } = useTheme();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(item.message);
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [item.id, item.message, onDismiss]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: C.card,
        borderRadius: radius.card,
        borderWidth: stroke.line,
        borderColor:
          item.kind === 'error' ? C.danger : item.kind === 'success' ? C.success : C.info,
        padding: layout.inset,
        gap: space.sm,
      }}
    >
      <Text variant="callout" style={{ color: C.text }}>
        {item.message}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {item.undo && (
          <Button
            variant="text"
            size="regular"
            title="Undo"
            onPress={() => {
              item.undo?.();
              onDismiss();
            }}
          />
        )}
        <Button
          variant="text"
          size="regular"
          title="Dismiss"
          accessibilityLabel="Dismiss notification"
          onPress={onDismiss}
        />
      </View>
    </View>
  );
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const dismiss = React.useCallback(() => setQueue(current => current.slice(1)), []);
  const show = React.useCallback(
    (item: ToastInput) =>
      setQueue(current => [...current, { ...item, id: Date.now() + Math.random() }].slice(0, 8)),
    [],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      {queue[0] && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            // Clears the tab bar. P3 replaces this with the shared floating insets.
            bottom: insets.bottom + 88,
            left: layout.margin,
            right: layout.margin,
            zIndex: 100,
          }}
        >
          <Toast item={queue[0]} onDismiss={dismiss} />
        </View>
      )}
    </ToastContext.Provider>
  );
}
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
  autoFocus = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  error?: string;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={{
          minHeight: hit,
          backgroundColor: C.card,
          borderRadius: radius.control,
          borderWidth: stroke.line,
          borderColor: error ? C.danger : C.line,
          padding: space.ms,
          color: C.text,
          fontSize: textRoles.body.fontSize,
        }}
      />
      {error && (
        <Text accessibilityRole="alert" variant="footnote" style={{ color: C.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
type Option = { id: string; label: string };
export function FilterChips({
  options,
  selected,
  onChange,
  multiple = false,
  disabled = false,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm }}
    >
      {options.map(option => {
        const active = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() =>
              onChange(
                multiple
                  ? active
                    ? selected.filter(id => id !== option.id)
                    : [...selected, option.id]
                  : [option.id],
              )
            }
            style={({ pressed }) => ({
              borderRadius: radius.control,
              paddingHorizontal: space.md,
              minHeight: hit,
              justifyContent: 'center',
              backgroundColor: active ? C.lime : C.card,
              borderWidth: stroke.line,
              borderColor: active ? C.lime : C.line,
              opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
            })}
          >
            <Text variant="callout" style={{ color: active ? C.onAccent : C.text }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <FilterChips
      options={options}
      selected={[value]}
      disabled={disabled}
      onChange={ids => onChange(ids[0])}
    />
  );
}
export function StickyActionBar({
  primary,
  secondary,
  busy = false,
}: {
  primary: { label: string; onPress: () => void; disabled?: boolean };
  secondary?: { label: string; onPress: () => void };
  busy?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        padding: layout.margin,
        paddingBottom: Math.max(layout.margin, insets.bottom),
        backgroundColor: C.bg,
        borderTopWidth: stroke.line,
        borderColor: C.line,
        gap: space.xs,
      }}
    >
      <Button title={primary.label} onPress={primary.onPress} disabled={primary.disabled} busy={busy} />
      {secondary && (
        <View style={{ alignItems: 'center' }}>
          <Button variant="text" title={secondary.label} disabled={busy} onPress={secondary.onPress} />
        </View>
      )}
    </View>
  );
}
export function StatusPill({ status }: { status: keyof typeof statusTone }) {
  const { colors: C } = useTheme();
  const color = C[statusTone[status]];
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${status}`}
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        borderWidth: stroke.line,
        borderColor: color,
        paddingHorizontal: space.ms,
        paddingVertical: space.xs,
      }}
    >
      <Text variant="footnote" style={{ color, fontWeight: '600' }}>
        {status}
      </Text>
    </View>
  );
}
export function WeekStrip({
  days,
  selected,
  onSelect,
}: {
  days: { id: string; label: string; done: number }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm }}
    >
      {days.map(day => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          accessibilityLabel={`${day.label}, ${day.done} done`}
          accessibilityState={{ selected: selected === day.id }}
          onPress={() => onSelect(day.id)}
          style={({ pressed }) => ({
            minWidth: hit,
            minHeight: hit + space.md,
            borderRadius: radius.control,
            padding: space.sm,
            backgroundColor: selected === day.id ? C.lime : C.card,
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.xs,
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <Text variant="subhead" style={{ color: selected === day.id ? C.onAccent : C.text }}>
            {day.label}
          </Text>
          <Text variant="subhead" numeric style={{ color: selected === day.id ? C.onAccent : C.muted }}>
            {day.done || '·'}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function ProgressRing({
  value,
  total,
  label,
  size = 52,
}: {
  value: number;
  total: number;
  label: string;
  size?: number;
}) {
  const { colors: C } = useTheme();
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const ring = space.xs;
  const r = (size - 2 * ring) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} of ${total}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} accessible={false}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={ring} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.lime}
          strokeWidth={ring}
          fill="none"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - ratio)}
          rotation={-90}
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
    </View>
  );
}
export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const { colors: C } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri && !failed ? (
        <Image
          accessible={false}
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
        />
      ) : (
        // The initial scales with the avatar, so its size is worked out rather than a role.
        <Text style={{ color: C.lime, fontSize: Math.round(size * 0.4), fontWeight: '600' }}>
          {name.trim().slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
export function Stepper({ step, total, label }: { step: number; total: number; label: string }) {
  const { colors: C } = useTheme();
  return (
    <View accessible accessibilityLabel={`Step ${step} of ${total}, ${label}`} style={{ gap: space.sm }}>
      <Text variant="subhead" style={{ color: C.muted }}>
        {label} · {step}/{total}
      </Text>
      <ProgressSteps total={total} filled={step} />
    </View>
  );
}
export function ReasonLine({ children }: { children: React.ReactNode }) {
  const { colors: C } = useTheme();
  return (
    <Text variant="footnote" style={{ color: C.muted }}>
      {children}
    </Text>
  );
}
