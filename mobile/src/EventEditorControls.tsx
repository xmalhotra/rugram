import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from './design/Text';
import { Sheet } from './design/components';
import { useTheme } from './design/theme';
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
    <View style={{ gap: 7 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
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
          fontSize: 16,
          lineHeight: 23,
          minHeight: multiline ? 110 : 52,
          textAlignVertical: multiline ? 'top' : 'center',
          paddingHorizontal: 14,
          paddingVertical: 13,
          borderWidth: 1,
          borderColor: focused ? C.lime : C.line,
          borderRadius: 14,
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
          minHeight: 54,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 14,
          backgroundColor: C.card,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Text style={{ color: C.muted, fontSize: 13, flex: 1 }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 15, flexShrink: 1 }}>{value}</Text>
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
                minHeight: 52,
                padding: 14,
                borderBottomWidth: 1,
                borderColor: C.line,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{option}</Text>
              <Text style={{ color: C.lime }}>{value === option ? '●' : '○'}</Text>
            </Pressable>
          ))}
        </Sheet>
      )}
    </>
  );
}
