export const space = { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 32 };
export const radius = { control: 14, card: 20 };
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
// Ambient artwork is decorative, never a control or a text foreground.
export const ambient = {
  outer: 'rgba(58,208,133,0.035)',
  inner: 'rgba(73,230,153,0.035)',
  bottom: 'rgba(61,140,121,0.025)',
  shadow: '#54F5AA',
  rails: Array.from({ length: 8 }, (_, index) => `rgba(120,245,178,${0.025 + index * 0.004})`),
};
