import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ShareCard } from '@/components/share-card';
import { TreeCelebration } from '@/components/tree-celebration';
import { TreePicture } from '@/components/tree-picture';
import { TreeSheet } from '@/components/tree-sheet';
import { BrandMark } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { usePro } from '@/context/pro-store';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { FREE_PLANT, LEVELS, computeStreak, deviceOffsetMinutes, weeklyProgress } from '@/lib/gamification';
import { LEVEL_NAME, PLANT_NAME, PURPOSE_NAME, formatRecovered } from '@/lib/gamification-copy';
import { shareProgressImage } from '@/lib/share-progress';
import { subscribeSessionClose, takeSessionClose, type SessionClose } from '@/lib/session-close';
import { describeTree, stretchProgress } from '@/lib/tree-growth';
import { useNow } from '@/lib/use-now';

type Phase = 'idle' | 'drops' | 'grow' | 'stage' | 'done';

export default function ProgresoScreen() {
  const { state } = useTiempo();
  const { isPro } = usePro();
  const { locale, t } = useI18n();
  const progress = state.gamification;
  const now = useNow(progress);
  const offset = deviceOffsetMinutes(now);
  const view = describeTree(progress, now, offset, isPro);
  const week = weeklyProgress(progress, now, offset);
  const streak = computeStreak(progress, now, offset);
  const shotRef = useRef<View>(null);
  const reduceRef = useRef(false);
  const playing = useRef(false);
  const focusedRef = useRef(false);
  const [width, setWidth] = useState(300);
  const [forestOpen, setForestOpen] = useState(false);
  const [totalOpen, setTotalOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [close, setClose] = useState<SessionClose | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [shakeTick, setShakeTick] = useState(0);
  const [tapPulse, setTapPulse] = useState(0);
  const [tapTick, setTapTick] = useState(0);

  const begin = useCallback((next: SessionClose) => {
    if (playing.current) return;
    playing.current = true;
    setClose(next);
    const ceremony = next.levelUp != null || next.treesCompleted > 0;
    if (next.countedMinutes <= 0) {
      setPhase(ceremony ? 'stage' : 'done');
      return;
    }
    setPhase(reduceRef.current ? (ceremony ? 'stage' : 'done') : 'drops');
  }, []);

  const consume = useCallback(() => {
    const next = takeSessionClose();
    if (next) begin(next);
  }, [begin]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      setFocused(true);
      consume();
      return () => {
        focusedRef.current = false;
        setFocused(false);
      };
    }, [consume]),
  );

  useEffect(() => {
    return subscribeSessionClose((next) => {
      if (!focusedRef.current) return;
      takeSessionClose();
      begin(next);
    });
  }, [begin]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!alive) return;
      reduceRef.current = enabled;
      setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceRef.current = enabled;
      setReduceMotion(enabled);
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || !close) return;
    if (phase === 'stage') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const wait = phase === 'drops' ? 800 : phase === 'grow' ? 900 : 2000;
    const timer = setTimeout(() => {
      setPhase((current) => {
        if (current === 'drops') return close.levelUp || close.treesCompleted > 0 ? 'stage' : 'grow';
        if (current === 'stage' || current === 'grow') return 'done';
        return current;
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [close, phase]);

  useEffect(() => {
    if (phase !== 'stage' || reduceMotion) return;
    const started = Date.now();
    const timer = setInterval(() => setShakeTick(Date.now() - started), 70);
    return () => clearInterval(timer);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (tapPulse === 0 || reduceMotion) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      setTapTick(elapsed >= 420 ? 0 : elapsed);
      if (elapsed >= 420) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, [reduceMotion, tapPulse]);

  const shakeFrames = [0, -4, 4, -3, 3, -2, 2, 0];
  const tapFrames = [0, -3, 3, -2, 2, 0];
  const stageShake =
    phase === 'stage' && !reduceMotion
      ? shakeFrames[Math.min(shakeFrames.length - 1, Math.floor(shakeTick / 70))]
      : 0;
  const tapShake =
    tapPulse > 0 && !reduceMotion && phase !== 'stage'
      ? tapFrames[Math.min(tapFrames.length - 1, Math.floor(tapTick / 70))]
      : 0;
  const shake = stageShake || tapShake;

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => {
      playing.current = false;
      setClose(null);
      setPhase('idle');
    }, close && close.countedMinutes <= 0 ? 2200 : 600);
    return () => clearTimeout(timer);
  }, [close, phase]);

  const shown =
    close && phase === 'drops'
      ? stretchProgress(Math.max(0, progress.recoveredMinutes - close.countedMinutes))
      : view.stretch;
  const species = isPro ? view.species : FREE_PLANT;
  const paused = !focused || !active || reduceMotion;
  const weekTime = formatRecovered(t, week.focusMinutes);
  const life = formatRecovered(t, progress.recoveredMinutes);
  const stretchText =
    shown.remainingMinutes === 1
      ? t('gamification.tree.stretchOne')
      : shown.remainingMinutes <= 0
        ? t('gamification.tree.stretchNow')
        : t('gamification.tree.stretch', { time: formatRecovered(t, shown.remainingMinutes) });
  const filled = shown.segments.filter((segment) => segment >= 0.999).length;
  const stageLabel = t('gamification.tree.stage', {
    current: shown.stageNumber,
    total: LEVELS.length,
    name: t(LEVEL_NAME[shown.id]),
  });
  const purpose = progress.purpose ? t(PURPOSE_NAME[progress.purpose]) : t('gamification.tagline');
  const showForest = view.stretch.forest > 0;
  const ceremony =
    close && (close.treesCompleted > 0 || close.levelUp)
      ? close.treesCompleted > 0
        ? t('gamification.tree.forestUp')
        : t('gamification.tree.stageUp', { name: t(LEVEL_NAME[close.levelUp ?? shown.id]) })
      : null;
  const sessionLine =
    close && phase !== 'idle' && phase !== 'done' && close.countedMinutes > 0
      ? t('gamification.tree.sessionLine', { time: formatRecovered(t, close.countedMinutes) })
      : null;
  const animating = phase === 'drops' || phase === 'grow' || phase === 'stage';

  const share = () => {
    void shareProgressImage(
      shotRef,
      t('gamification.session.shareMessage', { time: weekTime, week: weekTime, streak: streak.streak }),
      t('gamification.session.share'),
    );
  };

  const skip = () => {
    playing.current = false;
    setClose(null);
    setPhase('idle');
  };

  return (
    <Screen scroll>
      <View pointerEvents="none" style={styles.offscreen}>
        <ShareCard
          ref={shotRef}
          species={species}
          stage={view.stretch.index}
          substage={view.stretch.substage}
          fruits={view.fruits}
          sky={view.sky}
          brand={t('gamification.session.shareBrand')}
          streak={t(streak.streak === 1 ? 'gamification.tree.streakOne' : 'gamification.tree.streak', {
            count: streak.streak,
          })}
          week={t('gamification.session.shareWeek', { time: weekTime })}
          tagline={t('gamification.session.shareTag')}
        />
      </View>

      <View style={styles.topBar}>
        <BrandMark size={20} />
        {showForest ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={forestOpen ? t('gamification.tree.forestClose') : t('gamification.tree.forestOpen')}
            onPress={() => setForestOpen((open) => !open)}
            style={styles.forestBtn}>
            <SymbolView
              name={{ ios: 'leaf.fill' as never, android: 'park' as never, web: 'park' as never }}
              size={18}
              tintColor={Palette.accentBright}
            />
          </Pressable>
        ) : null}
      </View>

      {forestOpen && showForest ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forestRow}>
          {view.grove.map((tree, index) => {
            const plant = isPro ? tree.plant : FREE_PLANT;
            const date =
              tree.at > 0
                ? new Date(tree.at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES')
                : t('gamification.tree.undated');
            return (
              <View
                key={`${tree.at}-${index}`}
                style={styles.plaque}
                accessibilityLabel={t('gamification.tree.plaque', { plant: t(PLANT_NAME[plant]), date })}>
                <TreePicture
                  compact
                  paused
                  width={96}
                  species={plant}
                  stage={5}
                  substage={7}
                  season={view.season}
                  sky={view.sky}
                  fruits={3}
                  sleeping={false}
                  surprises={tree.surprises}
                  marks={[]}
                />
                <Text style={styles.plaqueTitle}>{t(PLANT_NAME[plant])}</Text>
                <Text style={styles.plaqueMeta}>{date} · 300 h</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <Text style={styles.kicker}>{stageLabel}</Text>
      <Text style={styles.title}>{t('gamification.tree.title')}</Text>

      <View style={styles.stageWrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={t('gamification.tree.treeLabel', {
            stage: stageLabel,
            step: shown.substage + 1,
            stretch: stretchText,
          })}
          accessibilityHint={view.sleeping ? t('gamification.tree.sleeping') : t('gamification.tree.total', { time: life })}
          onPress={() => {
            if (animating) skip();
            else {
              setTotalOpen(true);
              setTapPulse((value) => value + 1);
            }
          }}>
          <TreePicture
            species={species}
            stage={shown.index}
            substage={shown.substage}
            season={view.season}
            sky={view.sky}
            fruits={view.fruits}
            sleeping={view.sleeping}
            surprises={view.surprises}
            marks={view.marks}
            fireflies={view.fireflies}
            paused={paused || animating}
            width={Math.max(160, width - 8)}
            shake={shake}
          />
        </Pressable>
        {animating ? (
          <TreeCelebration
            phase={phase}
            reduceMotion={reduceMotion}
            title={ceremony}
            sessionLine={sessionLine}
            skipLabel={t('gamification.tree.skip')}
            onSkip={skip}
          />
        ) : null}
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t('gamification.tree.barLabel', { done: filled })}
        style={styles.bar}>
        {shown.segments.map((fill, index) => (
          <View key={index} style={styles.segment}>
            <View style={[styles.segmentFill, { width: `${Math.round(fill * 100)}%` }]} />
          </View>
        ))}
      </View>
      <Text style={styles.stretch}>{stretchText}</Text>
      {close && close.countedMinutes <= 0 && phase !== 'idle' ? (
        <Text style={styles.total}>{t('gamification.session.short')}</Text>
      ) : null}
      {totalOpen ? <Text style={styles.total}>{t('gamification.tree.total', { time: life })}</Text> : null}
      {view.sleeping ? <Text style={styles.sleeping}>{t('gamification.tree.sleeping')}</Text> : null}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{t('gamification.tree.recovered', { time: life })}</Text>
          <Text style={styles.statHint}>{purpose}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {t(streak.streak === 1 ? 'gamification.tree.streakOne' : 'gamification.tree.streak', { count: streak.streak })}
          </Text>
          <Text style={styles.statHint}>{t('gamification.tree.streakKeep')}</Text>
        </View>
      </View>

      <View style={styles.share}>
        <PrimaryButton muted label={t('gamification.session.share')} onPress={share} />
      </View>

      <TreeSheet />
    </Screen>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -1400,
    top: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  forestBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  forestRow: {
    gap: 10,
    paddingBottom: 12,
  },
  plaque: {
    width: 148,
    padding: 10,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
  },
  plaqueTitle: {
    ...Type.label,
    color: Palette.ink,
    marginTop: 6,
  },
  plaqueMeta: {
    ...Type.caption,
    color: Palette.muted,
    textAlign: 'center',
  },
  kicker: {
    ...Type.kicker,
    color: Palette.accentBright,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
    marginTop: 4,
    marginBottom: 12,
  },
  stageWrap: {
    position: 'relative',
  },
  bar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: Palette.accent,
  },
  stretch: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 10,
  },
  total: {
    ...Type.bodyL,
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  sleeping: {
    ...Type.caption,
    color: Palette.faintText,
    textAlign: 'center',
    marginTop: 6,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    gap: 4,
  },
  statValue: {
    ...Type.label,
    color: Palette.ink,
  },
  statHint: {
    ...Type.caption,
    color: Palette.muted,
  },
  share: {
    marginTop: 16,
  },
});
