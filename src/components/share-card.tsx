import { forwardRef, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { SKY } from '@/components/tree-picture';
import { Palette, Radius, Type } from '@/constants/theme';
import type { PlantId } from '@/lib/gamification';
import { pngDataUri, upscaleNearest } from '@/lib/png-data';
import { SPRITE, rasterScene } from '@/lib/tree-pixels';
import type { TimeSky } from '@/lib/tree-growth';

const SCALE = 4;

type Props = {
  species: PlantId;
  stage: number;
  substage: number;
  fruits: number;
  sky: TimeSky;
  brand: string;
  streak: string;
  week: string;
  tagline: string;
};

export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { species, stage, substage, fruits, sky, brand, streak, week, tagline },
  ref,
) {
  const uri = useMemo(() => {
    const rgba = rasterScene({
      species,
      stage,
      substage,
      season: 'summer',
      fruits,
      sleeping: false,
      surprises: [],
      marks: [],
      sway: 0,
    });
    const big = upscaleNearest(rgba, SPRITE, SCALE);
    return pngDataUri(SPRITE * SCALE, SPRITE * SCALE, big);
  }, [species, stage, substage, fruits]);

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: SKY[sky][1] }]}>
      <Text allowFontScaling={false} style={styles.brand}>
        {brand}
      </Text>
      <Image source={{ uri }} style={styles.tree} accessibilityIgnoresInvertColors />
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
    alignItems: 'center',
  },
  tree: {
    width: SPRITE * SCALE,
    height: SPRITE * SCALE,
    marginVertical: 4,
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
