import { View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text } from './Text';

/** An SF Symbol with a plain-text stand-in. Decorative: the row or button around it carries the name. */
export function Glyph({
  name,
  fallback,
  color,
  size = 22,
}: {
  name: SymbolViewProps['name'];
  fallback: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <SymbolView
        name={name}
        tintColor={color}
        size={size}
        fallback={<Text style={{ color, fontSize: Math.max(13, size - 5), lineHeight: size }}>{fallback}</Text>}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
