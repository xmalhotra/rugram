import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from './design/Text';
import { radius, space, stroke, useTheme } from './design/theme';
import { otpDigits } from '../../shared/otp-input';

/** One native input keeps paste, SMS autofill and screen-reader editing atomic. */
export function OtpCodeInput({
  value,
  onChange,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  length?: 4 | 6;
}) {
  const { colors: C } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ minHeight: 64 }}>
      <Pressable
        accessible={false}
        disabled={disabled}
        onPress={() => input.current?.focus()}
        style={{ flexDirection: 'row', gap: space.sm }}
      >
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            accessible={false}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 60,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.small,
              borderWidth: focused && index === Math.min(value.length, length - 1) ? stroke.active : 1,
              borderColor:
                focused && index === Math.min(value.length, length - 1) ? C.lime : C.line,
              backgroundColor: C.card,
            }}
          >
            <Text variant="title" style={{ color: C.text }}>{value[index] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        accessibilityLabel={`${length}-digit verification code`}
        accessibilityHint="Type or paste your code. The next box fills automatically."
        value={value}
        onChangeText={text => onChange(otpDigits(text, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        editable={!disabled}
        caretHidden
        selection={{ start: value.length, end: value.length }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 64,
          opacity: 0.02,
          color: 'transparent',
        }}
      />
    </View>
  );
}
