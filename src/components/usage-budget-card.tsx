import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Card } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { stepUsageMinutes, USAGE_MAX_MINUTES, USAGE_MINUTE_STEP } from '@/lib/usage-budget';

type Props = {
  strict: boolean;
  minutes: number;
  /** Android can count. Other platforms only store the limit. */
  counting: boolean;
  /**
   * Undefined while the read is in flight. Null when this build cannot count.
   * False when usage access is off. True when today's time is available.
   */
  usageGranted: boolean | null | undefined;
  onStrict: (value: boolean) => void;
  onMinutes: (minutes: number) => void;
  onOpenUsage: () => void;
};

export function UsageBudgetCard({
  strict,
  minutes,
  counting,
  usageGranted,
  onStrict,
  onMinutes,
  onOpenUsage,
}: Props) {
  const { t } = useI18n();
  const atMin = minutes <= USAGE_MINUTE_STEP;
  const atMax = minutes >= USAGE_MAX_MINUTES;

  if (!counting) {
    return (
      <Card style={styles.card}>
        <Text style={styles.kicker}>{t('apps.budget.kicker')}</Text>
        <Text style={styles.title}>{t('apps.budget.title')}</Text>
        <Text style={styles.body}>{t('apps.budget.androidOnly')}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.kicker}>{t('apps.budget.kicker')}</Text>
      <Text style={styles.title}>{t('apps.budget.title')}</Text>
      <Text style={styles.body}>{t('apps.budget.body')}</Text>

      <View style={styles.strictRow}>
        <View style={styles.strictCopy}>
          <Text style={styles.strictTitle}>{t('apps.budget.strict')}</Text>
          <Text style={styles.hint}>{t('apps.budget.strictHint')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('apps.budget.strict')}
          value={strict}
          onValueChange={onStrict}
          trackColor={{ false: Palette.bgElevated, true: Palette.accent }}
          thumbColor={Palette.ink}
        />
      </View>

      {strict ? null : (
        <View style={styles.stepper}>
          <Text style={styles.minutes}>
            {t('apps.budget.minutes')} <Text style={styles.minutesValue}>{minutes}</Text>
          </Text>
          <View style={styles.stepRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('apps.budget.decrease')}
              disabled={atMin}
              onPress={() => onMinutes(stepUsageMinutes(minutes, -1))}
              style={[styles.stepBtn, atMin && styles.stepBtnOff]}>
              <Text style={styles.stepTxt}>−</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('apps.budget.increase')}
              disabled={atMax}
              onPress={() => onMinutes(stepUsageMinutes(minutes, 1))}
              style={[styles.stepBtn, atMax && styles.stepBtnOff]}>
              <Text style={styles.stepTxt}>+</Text>
            </Pressable>
          </View>
        </View>
      )}

      {usageGranted === false ? (
        <View style={styles.permission}>
          <Text style={styles.note}>{t('apps.budget.needsUsage')}</Text>
          <Pressable accessibilityRole="button" onPress={onOpenUsage} style={styles.permissionBtn}>
            <Text style={styles.permissionLabel}>{t('apps.budget.openUsage')}</Text>
          </Pressable>
        </View>
      ) : null}
      {usageGranted === null ? <Text style={styles.note}>{t('apps.budget.unavailable')}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    marginBottom: 16,
  },
  kicker: {
    ...Type.kicker,
    color: Palette.focus,
  },
  title: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  body: {
    ...Type.body,
    color: Palette.muted,
  },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strictCopy: {
    flex: 1,
    gap: 4,
  },
  strictTitle: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  hint: {
    ...Type.caption,
    color: Palette.muted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  minutes: {
    ...Type.body,
    color: Palette.muted,
    flex: 1,
  },
  minutesValue: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: {
    opacity: 0.4,
  },
  stepTxt: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  note: {
    ...Type.caption,
    color: Palette.faintText,
  },
  permission: {
    gap: 8,
  },
  permissionBtn: {
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.45)',
    backgroundColor: Palette.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  permissionLabel: {
    ...Type.captionBold,
    color: Palette.accentBright,
  },
});
