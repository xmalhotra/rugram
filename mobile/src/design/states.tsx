import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { useTheme, statusTone } from './theme';
import { LoadingPulse } from '../motion';

export function IconButton({
  label,
  onPress,
  children,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={C.lime} /> : children}
    </Pressable>
  );
}
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
          height: shape === 'line' ? 16 : shape === 'block' ? 80 : 160,
          borderRadius: shape === 'line' ? 8 : 20,
          backgroundColor: C.line,
          marginVertical: 8,
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
    <View style={{ padding: 24, gap: 12, alignItems: 'center' }}>
      {illustration}
      <Text
        accessibilityRole="header"
        style={{ fontSize: 22, fontWeight: '600', color: C.text, textAlign: 'center' }}
      >
        {title}
      </Text>
      {description && (
        <Text style={{ color: C.muted, textAlign: 'center', fontSize: 17 }}>{description}</Text>
      )}
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 20 }}
        >
          <Text style={{ color: C.lime, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
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
        borderWidth: 1,
        borderColor: kind === 'error' ? C.danger : C.line,
        borderRadius: 14,
        backgroundColor: C.card,
        padding: 12,
        gap: 8,
      }}
    >
      <Text style={{ color: kind === 'error' ? C.danger : C.muted, fontSize: 15 }}>{message}</Text>
      {action && (
        <IconButton label={action.label} onPress={action.onPress}>
          <Text style={{ color: C.lime }}>{action.label}</Text>
        </IconButton>
      )}
      {onDismiss && (
        <IconButton label="Dismiss message" onPress={onDismiss}>
          <Text style={{ color: C.muted }}>Dismiss</Text>
        </IconButton>
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
        borderRadius: 20,
        borderWidth: 1,
        borderColor:
          item.kind === 'error' ? C.danger : item.kind === 'success' ? C.success : C.info,
        padding: 16,
        gap: 8,
      }}
    >
      <Text style={{ color: C.text, fontSize: 16 }}>{item.message}</Text>
      {item.undo && (
        <IconButton
          label="Undo"
          onPress={() => {
            item.undo?.();
            onDismiss();
          }}
        >
          <Text style={{ color: C.lime }}>Undo</Text>
        </IconButton>
      )}
      <IconButton label="Dismiss notification" onPress={onDismiss}>
        <Text style={{ color: C.muted }}>Dismiss</Text>
      </IconButton>
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
            bottom: insets.bottom + 88,
            left: 16,
            right: 16,
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
    <View style={{ gap: 6 }}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={{
          minHeight: 48,
          backgroundColor: C.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? C.danger : C.line,
          padding: 12,
          color: C.text,
          fontSize: 17,
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
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
      contentContainerStyle={{ gap: 8 }}
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
              borderRadius: 14,
              paddingHorizontal: 16,
              minHeight: 48,
              justifyContent: 'center',
              backgroundColor: active ? C.lime : C.card,
              borderWidth: 1,
              borderColor: active ? C.lime : C.line,
              opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
            })}
          >
            <Text style={{ color: active ? C.onAccent : C.text }}>{option.label}</Text>
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
        padding: 16,
        paddingBottom: Math.max(16, insets.bottom),
        backgroundColor: C.bg,
        borderTopWidth: 1,
        borderColor: C.line,
        gap: 4,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primary.label}
        accessibilityState={{ disabled: busy || primary.disabled, busy }}
        disabled={busy || primary.disabled}
        onPress={primary.onPress}
        style={({ pressed }) => ({
          backgroundColor: C.lime,
          borderRadius: 14,
          minHeight: 52,
          padding: 14,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy || primary.disabled ? 0.45 : pressed ? 0.65 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color={C.onAccent} />
        ) : (
          <Text style={{ color: C.onAccent, fontWeight: '600', fontSize: 17 }}>
            {primary.label}
          </Text>
        )}
      </Pressable>
      {secondary && (
        <IconButton label={secondary.label} disabled={busy} onPress={secondary.onPress}>
          <Text style={{ color: C.lime }}>{secondary.label}</Text>
        </IconButton>
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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: '600' }}>{status}</Text>
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
      contentContainerStyle={{ gap: 8 }}
    >
      {days.map(day => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          accessibilityLabel={`${day.label}, ${day.done} done`}
          accessibilityState={{ selected: selected === day.id }}
          onPress={() => onSelect(day.id)}
          style={{
            minWidth: 48,
            minHeight: 64,
            borderRadius: 14,
            padding: 8,
            backgroundColor: selected === day.id ? C.lime : C.card,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Text style={{ color: selected === day.id ? C.onAccent : C.text }}>{day.label}</Text>
          <Text variant="numeric" style={{ color: selected === day.id ? C.onAccent : C.muted }}>
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
  const radius = (size - 8) / 2;
  const length = 2 * Math.PI * radius;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} of ${total}`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} accessible={false}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.line}
          strokeWidth={4}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.lime}
          strokeWidth={4}
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
        borderRadius: size / 2,
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
    <View accessible accessibilityLabel={`Step ${step} of ${total}, ${label}`} style={{ gap: 8 }}>
      <Text style={{ color: C.muted }}>
        {label} · {step}/{total}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: Math.max(0, Math.min(total, 12)) }, (_, index) => (
          <View
            key={index}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              backgroundColor: index < step ? C.lime : C.line,
            }}
          />
        ))}
      </View>
    </View>
  );
}
export function ReasonLine({ children }: { children: React.ReactNode }) {
  const { colors: C } = useTheme();
  return <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{children}</Text>;
}
