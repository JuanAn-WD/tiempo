import { StyleSheet, Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { maxFontScaleForSize } from '@/constants/theme';

function scaleCap(style: StyleProp<TextStyle> | undefined): number {
  const size = StyleSheet.flatten(style)?.fontSize;
  return maxFontScaleForSize(typeof size === 'number' ? size : 16);
}

/**
 * App text keeps the system text-size setting on, and caps how far each
 * role can grow. Pass `maxFontSizeMultiplier` to override the cap.
 */
export function Text({ style, allowFontScaling = true, maxFontSizeMultiplier, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={style}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? scaleCap(style)}
    />
  );
}
