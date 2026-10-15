import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { DeviceOnlyNotice } from '@/components/device-only-notice';
import { Screen } from '@/components/screen';
import { UsageBudgetCard } from '@/components/usage-budget-card';
import { Badge, BrandMark, Card } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { readUsageBudget } from '@/lib/blocker';
import {
  allowanceMinutes,
  remainingMinutesCeil,
  remainingUsageMs,
  stepUsageMinutes,
  USAGE_MAX_MINUTES,
} from '@/lib/usage-budget';

export default function AppsScreen() {
  const router = useRouter();
  const { apps, state, togglePackage, setUsageStrict, setUsageLimitMinutes, setUsageOverride } = useTiempo();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);
  const [usedMs, setUsedMs] = useState<Record<string, number>>({});
  const [usageGranted, setUsageGranted] = useState<boolean | null | undefined>(undefined);
  const selectedKey = state.selectedPackages.join('\n');

  const refreshUsage = useCallback(async () => {
    const reading = await readUsageBudget(selectedKey ? selectedKey.split('\n') : []);
    if (reading.status !== 'ready') {
      setUsageGranted(null);
      setUsedMs({});
      return;
    }
    setUsageGranted(reading.usageGranted);
    setUsedMs(reading.usedMs);
  }, [selectedKey]);

  useFocusEffect(
    useCallback(() => {
      void refreshUsage();
      const id = setInterval(() => void refreshUsage(), 5000);
      return () => clearInterval(id);
    }, [refreshUsage]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      const on = state.selectedPackages.includes(app.packageName);
      if (onlyOn && !on) return false;
      if (!q) return true;
      return app.name.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q);
    });
  }, [apps, onlyOn, query, state.selectedPackages]);

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge
          label={t(state.selectedPackages.length === 1 ? 'apps.activeOne' : 'apps.active', {
            count: state.selectedPackages.length,
          })}
          tone="accent"
        />
      </View>

      <Text style={styles.title}>{t('apps.title')}</Text>
      <Text style={styles.sub}>{t('apps.sub')}</Text>
      <DeviceOnlyNotice notice="blocker" />
      <UsageBudgetCard
        strict={state.usageStrict}
        minutes={state.usageLimitMinutes}
        counting
        usageGranted={usageGranted}
        onStrict={setUsageStrict}
        onMinutes={setUsageLimitMinutes}
        onOpenUsage={() => router.push('/permissions?scope=block')}
      />

      <View style={styles.tools}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('apps.search')}
          placeholderTextColor={Palette.faintText}
          maxFontSizeMultiplier={2}
          style={styles.search}
        />
        <Pressable
          onPress={() => setOnlyOn((v) => !v)}
          style={[styles.filter, onlyOn && styles.filterOn]}>
          <Text style={[styles.filterText, onlyOn && styles.filterTextOn]}>{t('common.on')}</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {filtered.map((app) => {
          const on = state.selectedPackages.includes(app.packageName);
          const override = state.usageOverrides[app.packageName];
          const allowance = allowanceMinutes(
            {
              strict: state.usageStrict,
              defaultMinutes: state.usageLimitMinutes,
              overrides: state.usageOverrides,
            },
            app.packageName,
          );
          const remaining =
            usageGranted === true
              ? remainingMinutesCeil(remainingUsageMs(allowance, usedMs[app.packageName] ?? 0))
              : null;
          return (
            <View key={app.packageName} style={styles.item}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                onPress={() => togglePackage(app.packageName)}>
                <Card style={[styles.row, on && styles.rowOn]}>
                  {app.iconBase64 ? (
                    <Image source={{ uri: `data:image/png;base64,${app.iconBase64}` }} style={styles.icon} />
                  ) : (
                    <View style={[styles.iconFallback, on && styles.iconFallbackOn]}>
                      <Text style={styles.iconLetter}>{app.name.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={styles.meta}>
                    <Text style={styles.name}>{app.name}</Text>
                    {on && usageGranted !== undefined ? (
                      <Text style={styles.remaining}>
                        {allowance <= 0
                          ? t('apps.budget.remainingStrict')
                          : remaining === null
                            ? t('apps.budget.remainingUnknown')
                            : remaining <= 0
                              ? t('apps.budget.remainingZero')
                              : t('apps.budget.remaining', { count: remaining })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <View style={[styles.knob, on && styles.knobOn]} />
                  </View>
                </Card>
              </Pressable>
              {on && !state.usageStrict ? (
                <View
                  accessibilityLabel={t('apps.budget.perApp', { name: app.name })}
                  style={styles.override}>
                  <Text style={styles.overrideLabel}>
                    {allowance <= 0
                      ? t('apps.budget.overrideZero')
                      : t('apps.budget.limit', { count: allowance })}
                  </Text>
                  <View style={styles.overrideActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('apps.budget.decrease')}
                      onPress={() =>
                        setUsageOverride(app.packageName, stepUsageMinutes(allowance, -1, 0))
                      }
                      style={styles.stepBtn}>
                      <Text style={styles.stepTxt}>−</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('apps.budget.increase')}
                      disabled={allowance >= USAGE_MAX_MINUTES}
                      onPress={() => setUsageOverride(app.packageName, stepUsageMinutes(allowance, 1, 0))}
                      style={styles.stepBtn}>
                      <Text style={styles.stepTxt}>+</Text>
                    </Pressable>
                    {override === undefined ? null : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('apps.budget.useDefault')}
                        onPress={() => setUsageOverride(app.packageName, null)}
                        style={styles.defaultBtn}>
                        <Text style={styles.defaultTxt}>{t('apps.budget.useDefault')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {filtered.length === 0 ? <Text style={styles.empty}>{t('apps.empty')}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
  },
  sub: {
    ...Type.body,
    marginTop: 10,
    marginBottom: 18,
    color: Palette.muted,
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  search: {
    ...Type.body,
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: Palette.ink,
  },
  filter: {
    width: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: {
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.4)',
  },
  filterText: {
    ...Type.captionBold,
    color: Palette.muted,
  },
  filterTextOn: {
    color: Palette.accentBright,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  item: {
    gap: 6,
  },
  remaining: {
    ...Type.caption,
    marginTop: 2,
    color: Palette.muted,
  },
  override: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
  },
  overrideLabel: {
    ...Type.caption,
    color: Palette.faintText,
    flex: 1,
  },
  overrideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  defaultBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  defaultTxt: {
    ...Type.captionBold,
    color: Palette.accentBright,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowOn: {
    borderColor: 'rgba(212,146,58,0.28)',
    backgroundColor: Palette.accentSoft,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackOn: {
    backgroundColor: 'rgba(212,146,58,0.25)',
  },
  iconLetter: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  meta: {
    flex: 1,
  },
  name: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.muted,
  },
  knobOn: {
    alignSelf: 'flex-end',
    backgroundColor: Palette.accentText,
  },
  empty: {
    ...Type.body,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 28,
  },
});
