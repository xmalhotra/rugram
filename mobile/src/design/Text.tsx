import React, { createContext, useContext } from 'react';
import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';
import { textRoles, type TextRole } from './tokens';
export const FontReadyContext = createContext(false);

/**
 * `variant` takes a text role (size, line height and weight) or `numeric` (tabular figures only).
 * `numeric` as a prop adds tabular figures to any role. A size or weight in `style` still wins,
 * so older code keeps its look.
 */
export function Text({
  style,
  maxFontSizeMultiplier = 1.6,
  variant,
  numeric = false,
  ...props
}: TextProps & { variant?: TextRole | 'numeric'; numeric?: boolean }) {
  const ready = useContext(FontReadyContext);
  const role = variant && variant !== 'numeric' ? textRoles[variant] : undefined;
  const flat: TextStyle = StyleSheet.flatten([role, style]) ?? {};
  const weight = flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight ?? 400);
  const family =
    weight >= 700
      ? 'InterBold'
      : weight >= 600
        ? 'InterSemiBold'
        : weight >= 500
          ? 'InterMedium'
          : 'InterRegular';
  const tabular = numeric || variant === 'numeric';
  return (
    <NativeText
      {...props}
      maxFontSizeMultiplier={
        variant === 'display' ? Math.min(maxFontSizeMultiplier ?? 1.6, 1.3) : maxFontSizeMultiplier
      }
      style={[
        role,
        tabular ? { fontVariant: ['tabular-nums'] } : undefined,
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
