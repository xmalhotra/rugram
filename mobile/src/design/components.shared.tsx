import React, { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { DetailSurface } from './DetailSurface';
import { Checkbox, Host, Picker, TextInput, useNativeState } from '@expo/ui';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme, hit, layout, opacity, radius, space, stroke } from './theme';
import { ScreenBackground } from './ScreenBackground';
import { Button, IconButton } from './parts';
export type { ButtonProps } from './parts';
export { Button, IconButton, SectionHeader, Row, RowGroup, GlassSurface, TimerBar, ProgressSteps } from './parts';
export { DateTimeField } from './DateTimeField';

export function Chip({
  title,
  active,
  onPress,
  disabled = false,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        maxWidth: '100%',
        minHeight: hit,
        justifyContent: 'center',
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.control,
        borderWidth: stroke.line,
        borderColor: active ? C.lime : C.line,
        backgroundColor: active ? C.lime : C.card,
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <Text variant="callout" style={{ color: active ? C.onAccent : C.text, flexShrink: 1 }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.sm, marginBottom: space.md }}>
      <Text variant="footnote" style={{ color: C.muted, fontWeight: '600' }}>
        {eyebrow}
      </Text>
      <Text accessibilityRole="header" variant="display" style={{ color: C.text }}>
        {title}
      </Text>
      {copy && (
        <Text variant="body" style={{ color: C.muted }}>
          {copy}
        </Text>
      )}
    </View>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric = false,
  secure = false,
  multiline = false,
  maxLength,
  keyboardType = 'default',
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  secure?: boolean;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'url' | 'email-address' | 'number-pad' | 'decimal-pad';
  error?: string;
}) {
  const { colors: C, scheme } = useTheme();
  const state = useNativeState(value);
  useEffect(() => {
    if (state.get() !== value) state.set(value);
  }, [value, state]);
  return (
    <View style={{ gap: space.sm, marginVertical: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>
        {label}
      </Text>
      <Host colorScheme={scheme} seedColor={C.lime} matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <TextInput
          value={state}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          secureTextEntry={secure}
          multiline={!secure && multiline}
          numberOfLines={!secure && multiline ? 3 : undefined}
          keyboardType={numeric ? 'decimal-pad' : keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={secure ? 'current-password' : 'off'}
          maxLength={maxLength ?? (secure ? 256 : 200)}
          textStyle={{ color: C.text }}
          modifiers={[Platform.OS === 'ios' ? accessibilityLabel(label) : semantics({ contentDescription: label })]}
          style={{
            padding: space.ms,
            borderRadius: radius.control,
            backgroundColor: C.card,
            borderWidth: stroke.line,
            borderColor: C.line,
          }}
        />
      </Host>
      {error && (
        <Text accessibilityRole="alert" variant="footnote" style={{ color: C.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}

/** A card. With `onPress` the whole card is one button, so screens stop wrapping it in a Pressable. */
export function Card({
  children,
  onPress,
  accessibilityLabel: label,
  accessibilityHint,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}) {
  const { colors: C } = useTheme();
  const style = {
    backgroundColor: C.card,
    borderRadius: radius.card,
    borderWidth: stroke.line,
    borderColor: C.line,
    padding: layout.inset,
    gap: layout.inner,
    marginBottom: space.xs,
  };
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1 }]}
    >
      {children}
    </Pressable>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  const { colors: C } = useTheme();
  return (
    <Text variant="footnote" style={{ color: C.muted }}>
      {children}
    </Text>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const { colors: C, scheme } = useTheme();
  return (
    <View style={{ gap: space.sm, marginVertical: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>
        {label}
      </Text>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: hit }} colorScheme={scheme} seedColor={C.lime}>
        <Picker selectedValue={value} onValueChange={onChange} appearance="menu">
          {options.map(option => (
            <Picker.Item key={option} value={option} label={option} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}

export function HabitToggle({
  title,
  detail,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors: C, scheme } = useTheme();
  return (
    <View style={{ paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, gap: space.xs }}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: hit }} colorScheme={scheme} seedColor={C.lime}>
        <Checkbox label={title} value={checked} disabled={disabled} onValueChange={onChange} />
      </Host>
      <Text variant="footnote" style={{ color: C.muted }}>
        {detail}
      </Text>
    </View>
  );
}

export function Sheet({
  title,
  onClose,
  children,
  contentKey,
  scrollable = true,
  fullScreen = false,
  closeLabel = 'Done',
  navigation = 'close',
  headerAction,
  presentation,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  contentKey?: string;
  scrollable?: boolean;
  fullScreen?: boolean;
  closeLabel?: string;
  navigation?: 'back' | 'close';
  headerAction?: React.ReactNode;
  presentation?: 'inline' | 'modal';
}) {
  const { colors: C } = useTheme();
  return (
    <DetailSurface onClose={onClose} fullScreen={fullScreen} presentation={presentation}>
      <ScreenBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingHorizontal: layout.margin }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.ms, gap: space.ms }}>
          {navigation === 'back' && (
            <IconButton
              label="Go back"
              symbol="chevron.left"
              android="arrow_back"
              fallback="←"
              onPress={onClose}
            />
          )}
          <Text
            accessibilityRole="header"
            variant={fullScreen ? 'headline' : 'heading'}
            style={{ flex: 1, minWidth: 0, color: C.text }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {headerAction}
          {navigation === 'close' && (
            <Button
              variant="text"
              title={closeLabel}
              accessibilityLabel="Close details"
              onPress={onClose}
            />
          )}
        </View>
        {scrollable ? (
          <ScrollView
            key={contentKey}
            style={{ flex: 1, marginHorizontal: -layout.margin }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: layout.margin, paddingBottom: space.xxl, gap: space.sm }}
          >
            {children}
          </ScrollView>
        ) : (
          <View key={contentKey} style={{ flex: 1, minHeight: 0 }}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </DetailSurface>
  );
}
