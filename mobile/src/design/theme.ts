import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { resolveAppearance, type AppearancePreference } from '../../../shared/appearance';
import { palettes, space, radius, type } from './tokens';
export * from './tokens';
export const AppearancePreferenceContext = createContext<AppearancePreference>('system');
export function useTheme() {
  const preference = useContext(AppearancePreferenceContext);
  const system = useColorScheme();
  const scheme = resolveAppearance(preference, system);
  return { scheme, colors: palettes[scheme], space, radius, type };
}
