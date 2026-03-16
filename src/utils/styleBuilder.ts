/**
 * Utilitário para construir arrays de estilos sem incluir valores falsos
 * Evita problemas com React Native quando `false` é incluído em arrays de styles
 */

import type { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = StyleProp<ViewStyle | TextStyle | ImageStyle>;

export function mergeStyles(...styles: (Style | false | undefined)[]): Style {
  return styles.filter(Boolean) as Style;
}
