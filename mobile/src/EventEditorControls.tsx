import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from './design/Text';
import { Sheet } from './design/components';
import { radius, size, space, stroke, textRoles, useTheme } from './design/theme';
export function EventTextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numeric = false,
  link = false,
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  link?: boolean;
  maxLength?: number;
}) {
  const { colors: C } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={numeric ? 'decimal-pad' : link ? 'url' : 'default'}
        autoCapitalize={link ? 'none' : 'sentences'}
        autoCorrect={!link}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.lime}
        style={{
          color: C.text,
          fontSize: textRoles.callout.fontSize,
          lineHeight: textRoles.callout.lineHeight,
          minHeight: multiline ? 110 : size.button,
          textAlignVertical: multiline ? 'top' : 'center',
          paddingHorizontal: space.md,
          paddingVertical: space.ms,
          borderWidth: stroke.line,
          borderColor: focused ? C.lime : C.line,
          borderRadius: radius.control,
          backgroundColor: C.card,
        }}
      />
    </View>
  );
}
export function EventSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const { colors: C } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open, disabled: options.length <= 1 }}
        disabled={options.length <= 1}
        onPress={() => setOpen(true)}
        style={{
          minHeight: size.button,
          borderWidth: stroke.line,
          borderColor: C.line,
          borderRadius: radius.control,
          backgroundColor: C.card,
          paddingHorizontal: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.ms,
        }}
      >
        <Text variant="footnote" style={{ color: C.muted, flex: 1 }}>{label}</Text>
        <Text variant="subhead" style={{ color: C.text, flexShrink: 1 }}>{value}</Text>
        {options.length > 1 && <Text style={{ color: C.lime }}>⌄</Text>}
      </Pressable>
      {open && (
        <Sheet title={label} onClose={() => setOpen(false)}>
          {options.map(option => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: value === option }}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={{
                minHeight: size.button,
                padding: space.md,
                borderBottomWidth: stroke.line,
                borderColor: C.line,
                flexDirection: 'row',
                gap: space.ms,
              }}
            >
              <Text variant="callout" style={{ flex: 1, color: C.text }}>{option}</Text>
              <Text style={{ color: C.lime }}>{value === option ? '●' : '○'}</Text>
            </Pressable>
          ))}
        </Sheet>
      )}
    </>
  );
}
