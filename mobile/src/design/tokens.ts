// The rules for these values are in docs/design-consistency.md, Part 2. Screens use these names,
// never a number. This file has no React Native import so tests can read it in Node.

/** Spacing scale. `ms` (12) is the step between 8 and 16. */
export const space = { xxs: 2, xs: 4, sm: 8, ms: 12, md: 16, lg: 20, xl: 24, xxl: 32 };

/** How a page is put together (section 2.3). */
export const layout = {
  /** Left and right page margin. */
  margin: 16,
  /** Between sections on a page. */
  section: 24,
  /** Between cards inside a section. */
  cards: 12,
  /** Inside a card. */
  inset: 16,
  /** Between parts inside a card. */
  inner: 12,
  /** Between lines of text that belong together. */
  lines: 8,
};

/** Corners. `pill` is fully round: circles, bars, capsules. */
export const radius = { small: 10, control: 14, card: 20, pill: 999 };

/** Border widths. `active` marks the one active thing on a screen. */
export const stroke = { line: 1, active: 2 };

/** Heights. The tap-target minimum is platform-specific and lives in theme.ts as `hit`. */
export const size = { hitIos: 44, hitAndroid: 48, button: 52, buttonRegular: 44 };

/** `fill` is the strength of a progress fill behind text, such as the rest bar. */
export const opacity = { pressed: 0.6, disabled: 0.45, fill: 0.45 };

/** The one glass recipe: blur, then the background colour at this strength over it. */
export const glass = { blur: 30, tint: 0.15 };

export type TextRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'section'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

/** The ten text roles. Nothing is smaller than `caption`. Weights: 400 and 600; 700 only on `display`. */
export const textRoles: Record<TextRole, { fontSize: number; lineHeight: number; fontWeight: '400' | '600' | '700' }> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  section: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

/**
 * Older size names, kept so existing code compiles. New code uses `textRoles`.
 * `title` and `headline` here are 22, which is the `heading` role, not the roles of the same name.
 */
export const type = {
  largeTitle: 34,
  title: 22,
  body: 17,
  callout: 16,
  footnote: 13,
  caption: 12,
  display: 34,
  headline: 22,
  label: 15,
};
export const numeric = { fontVariant: ['tabular-nums'] as 'tabular-nums'[] };
export const palettes = {
  light: {
    bg: '#F2F2F7',
    card: '#FFFFFF',
    line: '#D1D1D6',
    text: '#1C1C1E',
    muted: '#636366',
    lime: '#287B4B',
    // Missed areas on Body flow. Blue, so it stays apart from the green brand colour.
    missed: '#2451B2',
    illustrationAccent: '#6650A4',
    illustrationBackdrop: '#F0ECFA',
    danger: '#B3261E',
    onAccent: '#FFFFFF',
    success: '#22663B',
    onSuccess: '#FFFFFF',
    warning: '#7B4D00',
    onWarning: '#FFFFFF',
    info: '#215EA8',
    onInfo: '#FFFFFF',
    onDanger: '#FFFFFF',
    photoMat: '#FFFFFF',
    photoInk: '#555555',
  },
  dark: {
    bg: '#050706',
    card: '#101512',
    line: '#28352E',
    text: '#F5F8F6',
    muted: '#A6B5AC',
    lime: '#78F5B2',
    // Missed areas on Body flow. Blue, so it stays apart from the green brand colour.
    missed: '#6AA6FF',
    illustrationAccent: '#86BFA8',
    illustrationBackdrop: '#14271E',
    danger: '#FFB4AB',
    onAccent: '#062417',
    success: '#78F5B2',
    onSuccess: '#062417',
    warning: '#F5CB78',
    onWarning: '#2A1C00',
    info: '#9FC9FF',
    onInfo: '#061C36',
    onDanger: '#3B0905',
    photoMat: '#FFFFFF',
    photoInk: '#555555',
  },
};
export type Colors = typeof palettes.light;
export const statusTone = {
  Draft: 'muted',
  'In review': 'warning',
  Live: 'success',
  Pending: 'warning',
  Approved: 'success',
  'Needs changes': 'danger',
  Declined: 'danger',
  Cancelled: 'muted',
  Info: 'info',
} as const;
