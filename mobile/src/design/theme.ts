import { createContext, useContext } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { resolveAppearance, type AppearancePreference } from '../../../shared/appearance';
import { palettes, space, radius, type, size } from './tokens';
export * from './tokens';
/** The smallest tap target: 44 points on iPhone, 48 dp on Android. */
export const hit = Platform.OS === 'ios' ? size.hitIos : size.hitAndroid;
export const AppearancePreferenceContext = createContext<AppearancePreference>('system');
export function useTheme() {
  const preference = useContext(AppearancePreferenceContext);
  const system = useColorScheme();
  const scheme = resolveAppearance(preference, system);
  return { scheme, colors: palettes[scheme], space, radius, type };
}
