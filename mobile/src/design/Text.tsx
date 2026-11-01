import React, { createContext, useContext } from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
export const FontReadyContext = createContext(false);
export function Text({
  style,
  maxFontSizeMultiplier = 1.6,
  variant,
  ...props
}: TextProps & { variant?: 'display' | 'headline' | 'label' | 'numeric' }) {
  const ready = useContext(FontReadyContext);
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight ?? 400);
  const family =
    weight >= 700
      ? 'InterBold'
      : weight >= 600
        ? 'InterSemiBold'
        : weight >= 500
          ? 'InterMedium'
          : 'InterRegular';
  return (
    <NativeText
      {...props}
      maxFontSizeMultiplier={
        variant === 'display' ? Math.min(maxFontSizeMultiplier ?? 1.6, 1.3) : maxFontSizeMultiplier
      }
      style={[
        variant === 'numeric' ? { fontVariant: ['tabular-nums'] } : undefined,
        ready && !flat.fontFamily
          ? {
              fontFamily: family,
              fontWeight: 'normal',
              letterSpacing: (flat.fontSize ?? 16) >= 22 ? -0.6 : -0.15,
            }
          : undefined,
        style,
        ready && !flat.fontFamily ? { fontWeight: 'normal' } : undefined,
      ]}
    />
  );
}
