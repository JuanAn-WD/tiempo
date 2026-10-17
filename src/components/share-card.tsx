import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { TREE_SKY, TreeArt } from '@/components/tree-art';
import { Palette, Radius, Type } from '@/constants/theme';
import type { FocusModeId, PlantId, SkyId } from '@/lib/gamification';

type Props = {
  planted: boolean;
  growth: number;
  mode: FocusModeId | null;
  plant: PlantId;
  sky: SkyId;
  brand: string;
  streak: string;
  week: string;
  tagline: string;
};

export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { planted, growth, mode, plant, sky, brand, streak, week, tagline },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: TREE_SKY[sky] }]}>
      <Text allowFontScaling={false} style={styles.brand}>
        {brand}
      </Text>
      <TreeArt growth={growth} planted={planted} mode={mode} plant={plant} height={180} />
      <Text allowFontScaling={false} style={styles.streak}>
        {streak}
      </Text>
      <Text allowFontScaling={false} style={styles.week}>
        {week}
      </Text>
      <Text allowFontScaling={false} style={styles.tagline}>
        {tagline}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 340,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  brand: {
    ...Type.title,
    color: Palette.ink,
    textAlign: 'center',
  },
  streak: {
    ...Type.title,
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 4,
  },
  week: {
    ...Type.bodyL,
    color: Palette.accentBright,
    textAlign: 'center',
    marginTop: 6,
  },
  tagline: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
