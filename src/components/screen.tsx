import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Palette, Spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  tabPadding?: boolean;
  atmosphere?: 'idle' | 'focus';
};

export function Screen({
  children,
  scroll,
  style,
  contentStyle,
  tabPadding = true,
  atmosphere = 'idle',
}: Props) {
  const bottom = tabPadding ? BottomTabInset + Spacing.four : Spacing.four;
  const body = (
    <View
      style={[
        styles.inner,
        scroll ? styles.innerScroll : styles.innerFill,
        { paddingBottom: bottom },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={
          atmosphere === 'focus'
            ? ['#0F1A14', Palette.bg, '#070806']
            : ['#1A120A', Palette.bg, '#070605']
        }
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[styles.glowA, atmosphere === 'focus' && styles.glowFocus]}
        pointerEvents="none"
      />
      <View style={styles.glowB} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  glowA: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    left: '15%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(212,146,58,0.10)',
  },
  glowFocus: {
    backgroundColor: 'rgba(110,231,176,0.10)',
  },
  glowB: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212,146,58,0.05)',
  },
  safe: {
    flex: 1,
  },
  inner: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  innerFill: {
    flex: 1,
  },
  /**
   * Grow to the viewport when the column is short, and past it when the
   * column is tall, so a ScrollView can reach the last row. `flex: 1`
   * (basis 0) would lock this view to the screen and let later rows paint
   * over a hint that no longer fits.
   */
  innerScroll: {
    flexGrow: 1,
  },
});
