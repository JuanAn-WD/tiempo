import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import type { FocusModeId, LevelId, PlantId, SkyId } from '@/lib/gamification';

const STAGE: Record<LevelId, number> = {
  semilla: 0,
  brote: 1,
  raiz: 2,
  arbol: 3,
  bosque: 4,
  ambar: 5,
};

const MODE_TINT: Record<FocusModeId, string> = {
  trabajo: Palette.accent,
  estudio: Palette.focus,
  casa: '#E0A070',
  gym: '#7EC8C3',
};

const SKY: Record<SkyId, string> = {
  default: Palette.surface,
  dawn: '#3A2A22',
  dusk: '#2A2438',
  night: '#12161C',
};

type Props = {
  level: LevelId;
  mode: FocusModeId | null;
  plant: PlantId;
  sky: SkyId;
  resting: boolean;
  label: string;
  restLabel: string;
};

export function ProgressGarden({ level, mode, plant, sky, resting, label, restLabel }: Props) {
  const stage = STAGE[level];
  const tint = mode ? MODE_TINT[mode] : Palette.accentBright;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={resting ? `${label}. ${restLabel}` : label}
      style={[styles.sky, { backgroundColor: SKY[sky] }]}>
      <Svg width="100%" height={168} viewBox="0 0 200 140">
        <Ellipse cx="100" cy="124" rx="58" ry="8" fill="rgba(247,241,232,0.08)" />
        <Plant stage={stage} tint={tint} variant={plant} />
      </Svg>
      {resting ? <Text style={styles.rest}>{restLabel}</Text> : null}
    </View>
  );
}

function Plant({ stage, tint, variant }: { stage: number; tint: string; variant: PlantId }) {
  if (stage <= 0) {
    return <Ellipse cx="100" cy="116" rx="7" ry="5" fill={tint} />;
  }
  const leaf = variant === 'olive' ? 4 : variant === 'fern' ? 3 : variant === 'clay' ? 8 : 6;
  if (stage === 1) {
    return (
      <>
        <Path d="M100 118 C100 100 98 92 100 78" stroke={tint} strokeWidth="2.5" fill="none" />
        <Ellipse cx="90" cy="86" rx={leaf + 4} ry={leaf} fill={tint} opacity={0.9} />
        <Ellipse cx="110" cy="78" rx={leaf + 3} ry={leaf - 1} fill={tint} />
      </>
    );
  }
  if (stage === 2) {
    return (
      <>
        <Path d="M86 122 C90 110 96 104 100 96" stroke={Palette.muted} strokeWidth="1.5" fill="none" />
        <Path d="M114 122 C110 110 104 104 100 96" stroke={Palette.muted} strokeWidth="1.5" fill="none" />
        <Path d="M100 120 C100 96 100 80 100 62" stroke={tint} strokeWidth="3" fill="none" />
        <Ellipse cx="84" cy="78" rx={leaf + 6} ry={leaf + 1} fill={tint} />
        <Ellipse cx="116" cy="70" rx={leaf + 5} ry={leaf} fill={tint} />
        <Ellipse cx="100" cy="58" rx={leaf + 2} ry={leaf} fill={tint} opacity={0.85} />
      </>
    );
  }
  if (stage === 3) {
    return <Tree x={100} tint={tint} scale={1} leaf={leaf} />;
  }
  if (stage === 4) {
    return (
      <>
        <Tree x={68} tint={tint} scale={0.72} leaf={leaf} />
        <Tree x={132} tint={tint} scale={0.78} leaf={leaf} />
        <Tree x={100} tint={tint} scale={1} leaf={leaf} />
      </>
    );
  }
  return (
    <>
      <Tree x={100} tint={tint} scale={1} leaf={leaf} />
      <Circle cx="100" cy="46" r="7" fill={Palette.accentBright} />
      <Circle cx="100" cy="46" r="3" fill={Palette.accentText} opacity={0.35} />
    </>
  );
}

function Tree({ x, tint, scale, leaf }: { x: number; tint: string; scale: number; leaf: number }) {
  const trunk = 34 * scale;
  return (
    <>
      <Path
        d={`M${x} 122 C${x} ${122 - trunk} ${x} ${100 - trunk} ${x} ${78 - trunk * 0.2}`}
        stroke={tint}
        strokeWidth={4 * scale}
        fill="none"
      />
      <Ellipse cx={x - 16 * scale} cy={70 - trunk * 0.15} rx={(leaf + 10) * scale} ry={(leaf + 4) * scale} fill={tint} />
      <Ellipse cx={x + 16 * scale} cy={62 - trunk * 0.1} rx={(leaf + 8) * scale} ry={(leaf + 3) * scale} fill={tint} />
      <Ellipse cx={x} cy={52 - trunk * 0.05} rx={(leaf + 6) * scale} ry={(leaf + 2) * scale} fill={tint} opacity={0.92} />
    </>
  );
}

const styles = StyleSheet.create({
  sky: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingTop: 8,
    paddingBottom: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rest: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: -4,
  },
});
