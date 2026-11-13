import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import type { SymbolViewProps } from 'expo-symbols';

type AndroidSymbol = NonNullable<Extract<SymbolViewProps['name'], object>['android']>;
import { Text } from './Text';
import { Glyph } from './Glyph';
import { glass, hit, layout, opacity, radius, size, space, stroke, useTheme } from './theme';

// The shared parts from docs/design-consistency.md, section 2.2.

export type ButtonProps = {
  title: string;
  onPress: () => void;
  /** primary: green fill. secondary: green outline. text: green words with a full tap target. */
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'large' | 'regular';
  /** Same as variant="secondary". Kept for older code. */
  secondary?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  /** Shows a spinner and blocks taps. */
  busy?: boolean;
  /** Size to the label instead of the full width. Text buttons always do. */
  fit?: boolean;
  /**
   * neutral: text colour and a line border instead of green. For utility actions (Pause, ±30 s)
   * that sit beside the screen's one green action.
   */
  tone?: 'accent' | 'neutral';
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** The one button. Drawn in React Native on both platforms so it sizes properly inside a row. */
export function Button({
  title,
  onPress,
  variant,
  size: buttonSize = 'large',
  secondary = false,
  disabled = false,
  destructive = false,
  busy = false,
  fit = false,
  tone = 'accent',
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors: C } = useTheme();
  const kind = variant ?? (secondary ? 'secondary' : 'primary');
  const neutral = tone === 'neutral' && !destructive;
  const accent = destructive ? C.danger : neutral ? C.text : C.lime;
  const onAccent = destructive ? C.onDanger : C.onAccent;
  const blocked = disabled || busy;
  const large = buttonSize === 'large';
  const height = kind === 'text' ? hit : large ? size.button : Math.max(hit, size.buttonRegular);
  const labelColor = kind === 'primary' && !neutral ? onAccent : accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: height,
        alignSelf: kind === 'text' || fit ? 'flex-start' : 'stretch',
        maxWidth: '100%',
        flexShrink: 1,
        marginVertical: kind === 'text' ? 0 : space.xs,
        paddingHorizontal: kind === 'text' ? 0 : space.md,
        borderRadius: radius.control,
        alignItems: kind === 'text' ? 'flex-start' : 'center',
        justifyContent: 'center',
        backgroundColor: kind === 'primary' ? accent : 'transparent',
        borderWidth: kind === 'secondary' ? stroke.line : 0,
        borderColor: neutral ? C.line : accent,
        opacity: blocked ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text
          variant={large && kind !== 'text' ? 'headline' : 'callout'}
          style={{ color: labelColor, fontWeight: '600', textAlign: 'center' }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type Tone = 'text' | 'muted' | 'accent' | 'danger';

/**
 * A symbol button. `symbol` is an SF Symbol name; `android` is the Material name for Android.
 * Without a symbol, `children` are drawn instead. Default colour is the text colour, not green.
 */
export function IconButton({
  label,
  onPress,
  symbol,
  android,
  fallback = '',
  look = 'plain',
  tone = 'text',
  symbolSize = 22,
  disabled = false,
  loading = false,
  children,
}: {
  label: string;
  onPress: () => void;
  symbol?: Extract<SymbolViewProps['name'], string>;
  android?: AndroidSymbol;
  /** Text drawn where neither symbol is available. */
  fallback?: string;
  look?: 'plain' | 'outlined';
  tone?: Tone;
  symbolSize?: number;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  const color = { text: C.text, muted: C.muted, accent: C.lime, danger: C.danger }[tone];
  const outlined = look === 'outlined';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={outlined ? Math.max(0, (hit - size.buttonRegular) / 2) : undefined}
      style={({ pressed }) => ({
        minWidth: outlined ? size.buttonRegular : hit,
        minHeight: outlined ? size.buttonRegular : hit,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: outlined ? stroke.line : 0,
        borderColor: C.line,
        backgroundColor: outlined ? C.card : 'transparent',
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : symbol ? (
        <Glyph name={android ? { ios: symbol, android } : symbol} fallback={fallback} color={color} size={symbolSize} />
      ) : (
        children
      )}
    </Pressable>
  );
}

/** The header of a section on a page: title, an optional line under it, an optional text action. */
export function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
        <Text accessibilityRole="header" variant="section" style={{ flex: 1, minWidth: 0, color: C.text }}>
          {title}
        </Text>
        {action ? <Button variant="text" size="regular" title={action.label} onPress={action.onPress} /> : null}
      </View>
      {detail ? (
        <Text variant="subhead" style={{ color: C.muted }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A list row. A row that can be tapped shows a chevron; one that cannot has none.
 * Put rows inside `RowGroup`, which draws the card and the hairlines between them.
 */
export function Row({
  title,
  detail,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  detail?: React.ReactNode;
  leading?: React.ReactNode;
  /** A value or small control at the end. Sits before the chevron. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors: C } = useTheme();
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
        <Text variant="headline" style={{ color: C.text }}>
          {title}
        </Text>
        {typeof detail === 'string' ? (
          <Text variant="subhead" style={{ color: C.muted }}>
            {detail}
          </Text>
        ) : (
          detail
        )}
      </View>
      {typeof trailing === 'string' ? (
        <Text variant="subhead" numeric style={{ color: C.muted }}>
          {trailing}
        </Text>
      ) : (
        trailing
      )}
      {onPress ? <Glyph name={{ ios: 'chevron.right', android: 'chevron_right' }} fallback="›" color={C.muted} size={space.md} /> : null}
    </>
  );
  const rowStyle: ViewStyle = {
    minHeight: hit,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.ms,
    paddingVertical: space.ms,
  };
  if (!onPress)
    return (
      <View accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} style={rowStyle}>
        {body}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, { opacity: pressed ? opacity.pressed : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/** A card holding rows, with a hairline between each. */
export function RowGroup({ children }: { children: React.ReactNode }) {
  const { colors: C } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: radius.card,
        borderWidth: stroke.line,
        borderColor: C.line,
        paddingHorizontal: layout.inset,
      }}
    >
      {rows.map((row, index) => (
        <View
          key={index}
          style={index ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line } : undefined}
        >
          {row}
        </View>
      ))}
    </View>
  );
}

/** The one glass recipe. Used by the header, the run footer and the run bar. */
export function GlassSurface({
  children,
  edge = 'all',
  rounded = false,
  style,
  onLayout,
}: {
  children?: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Which side gets the 1 point line. */
  edge?: 'all' | 'top' | 'bottom' | 'none';
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: C, scheme } = useTheme();
  const border: ViewStyle =
    edge === 'all'
      ? { borderWidth: stroke.line }
      : edge === 'top'
        ? { borderTopWidth: stroke.line }
        : edge === 'bottom'
          ? { borderBottomWidth: stroke.line }
          : {};
  return (
    <View
      onLayout={onLayout}
      style={[
        { overflow: 'hidden', borderColor: C.line, borderRadius: rounded ? radius.card : 0 },
        border,
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={glass.blur}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: glass.tint }]} />
      {children}
    </View>
  );
}

/**
 * A clock with its word ("Rest", "Elapsed", "Hold") and a fill that grows from the left.
 * The word is required: a clock without one is not allowed.
 */
export function TimerBar({
  word,
  time,
  fill = 0,
  paused = false,
  trailing,
  accessibilityLabel,
}: {
  word: string;
  time: string;
  /** 0 to 1. */
  fill?: number;
  paused?: boolean;
  /** A small action at the right end, such as Skip rest. */
  trailing?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { colors: C } = useTheme();
  const share = Math.max(0, Math.min(1, fill));
  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel ?? `${paused ? 'Paused, ' : ''}${word} ${time}`}
      style={{
        minHeight: size.button,
        borderRadius: radius.control,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        paddingHorizontal: space.md,
        backgroundColor: paused ? 'transparent' : C.line,
        borderWidth: paused ? stroke.active : 0,
        borderColor: C.warning,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.round(share * 100)}%`,
          backgroundColor: C.lime,
          opacity: opacity.fill,
        }}
      />
      <Text variant="callout" style={{ color: paused ? C.warning : C.muted, fontWeight: '600' }}>
        {paused ? `Paused · ${word}` : word}
      </Text>
      <Text variant="heading" numeric style={{ color: C.text }}>
        {time}
      </Text>
      {trailing ? (
        <View style={{ position: 'absolute', right: space.ms, top: 0, bottom: 0, justifyContent: 'center' }}>
          {trailing}
        </View>
      ) : null}
    </View>
  );
}

/** A row of segments, filled from the left. The words for it belong elsewhere on the screen. */
export function ProgressSteps({ total, filled, max = 12 }: { total: number; filled: number; max?: number }) {
  const { colors: C } = useTheme();
  const count = Math.max(0, Math.min(total, max));
  return (
    <View accessible={false} style={{ flexDirection: 'row', gap: space.xs }}>
      {Array.from({ length: count }, (_, step) => (
        <View
          key={step}
          style={{
            flex: 1,
            height: space.xs,
            borderRadius: radius.pill,
            backgroundColor: step < filled ? C.lime : C.line,
          }}
        />
      ))}
    </View>
  );
}
