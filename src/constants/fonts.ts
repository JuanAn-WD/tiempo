import Fraunces_500Medium from '@expo-google-fonts/fraunces/500Medium/Fraunces_500Medium.ttf';
import Fraunces_600SemiBold from '@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf';
import Inter_400Regular from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf';
import Inter_500Medium from '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf';
import Inter_600SemiBold from '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf';
import Inter_700Bold from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf';
import JetBrainsMono_500Medium from '@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf';
import { FontDisplay, type FontSource } from 'expo-font';

import { FontFamily } from '@/constants/theme';

/**
 * `font-display: block` keeps web text invisible until the face is ready.
 * Native ignores it; the root layout also holds the splash and renders no
 * text until `useFonts` resolves, so there is no flash of unstyled text.
 */
function block(asset: number): FontSource {
  return { uri: asset, display: FontDisplay.BLOCK };
}

export const brandFonts: Record<string, FontSource> = {
  [FontFamily.displayMedium]: block(Fraunces_500Medium),
  [FontFamily.display]: block(Fraunces_600SemiBold),
  [FontFamily.ui]: block(Inter_400Regular),
  [FontFamily.uiMedium]: block(Inter_500Medium),
  [FontFamily.uiSemibold]: block(Inter_600SemiBold),
  [FontFamily.uiBold]: block(Inter_700Bold),
  [FontFamily.mono]: block(JetBrainsMono_500Medium),
};
