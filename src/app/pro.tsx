import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark, Card } from '@/components/ui';
import { Palette, Type } from '@/constants/theme';
import { usePro, type ProNotice } from '@/context/pro-store';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n, type Translate, type TranslationKey } from '@/i18n';
import { CATALOG_PRICE_LABEL, LAUNCH_PRICE_LABEL } from '@/lib/purchases';

const PRO_FEATURES = [
  'pro.featureModes',
  'pro.featureKeys',
  'pro.featureSchedule',
  'pro.featureHistory',
] as const satisfies readonly TranslationKey[];

const FREE_FEATURES = ['pro.freeBlock', 'pro.freeModes', 'pro.freeEmergency'] as const satisfies readonly TranslationKey[];

function noticeStyle(notice: ProNotice) {
  if (notice === 'restore-done' || notice === 'restore-kept') return [styles.notice, styles.noticeOk];
  if (notice === 'restore-empty') return [styles.notice, styles.noticeQuiet];
  return [styles.notice, styles.noticeWarn];
}

function noticeCopy(t: Translate, notice: ProNotice, price: string): string {
  switch (notice) {
    case 'pending':
      return t('pro.pending');
    case 'restore-done':
      return t('pro.restoreDone');
    case 'restore-empty':
      return t('pro.restoreEmpty');
    case 'restore-kept':
      return t('pro.restoreKept');
    case 'restore-fail':
      return t('pro.restoreFail');
    case 'purchase-fail':
      return t('pro.purchaseFail');
    case 'unavailable':
      return t('pro.unavailable');
    case 'missing-product':
      return t('pro.missingProduct', { price });
    case 'revoked':
      return t('pro.revoked');
  }
}

function FeatureList({ title, items }: { title: string; items: readonly TranslationKey[] }) {
  const { t } = useI18n();
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.map((key) => (
        <View key={key} style={styles.feature}>
          <View style={styles.dot} />
          <Text style={styles.featureText}>{t(key)}</Text>
        </View>
      ))}
    </Card>
  );
}

export default function ProScreen() {
  const router = useRouter();
  const { state } = useTiempo();
  const { locale, t } = useI18n();
  const pro = usePro();
  const catalog = CATALOG_PRICE_LABEL[locale];
  const launch = LAUNCH_PRICE_LABEL[locale];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!pro.ready) {
    return (
      <Screen scroll={false} tabPadding={false}>
        <View style={styles.boot}>
          <ActivityIndicator color={Palette.accent} />
        </View>
      </Screen>
    );
  }

  if (!pro.isPro && state.locked) {
    return (
      <Screen scroll tabPadding={false}>
        <BrandMark size={20} />
        <Text style={styles.kicker}>{t('pro.kicker')}</Text>
        <Text style={styles.title}>{t('pro.lockedTitle')}</Text>
        <Text style={styles.body}>{t('pro.lockedScreen')}</Text>
        <View style={styles.actions}>
          <PrimaryButton muted label={t('pro.back')} onPress={goBack} />
        </View>
      </Screen>
    );
  }

  if (pro.isPro) {
    return (
      <Screen scroll tabPadding={false}>
        <BrandMark size={20} />
        <Text style={styles.kicker}>{t('pro.ownedKicker')}</Text>
        <Text style={styles.title}>{t('pro.ownedTitle')}</Text>
        <Text style={styles.body}>{t('pro.ownedBody')}</Text>
        <FeatureList title={t('pro.featuresTitle')} items={PRO_FEATURES} />
        <Text style={styles.later}>{t('pro.later')}</Text>
        {pro.notice ? <Text style={noticeStyle(pro.notice)}>{noticeCopy(t, pro.notice, pro.priceLabel)}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            muted
            label={pro.busy === 'restore' ? t('pro.restoring') : t('pro.restore')}
            accessibilityHint={t('pro.restoreHint')}
            disabled={pro.busy !== null || !pro.storeAvailable}
            onPress={() => void pro.restore()}
          />
          <PrimaryButton muted label={t('pro.back')} onPress={goBack} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll tabPadding={false}>
      <BrandMark size={20} />
      <Text style={styles.kicker}>{t('pro.kicker')}</Text>
      <Text style={styles.title}>{t('pro.title')}</Text>
      <Text style={styles.body}>{t('pro.body')}</Text>
      <Text style={styles.price} accessibilityLabel={t('pro.priceLive', { price: pro.priceLabel })}>
        {pro.priceLabel}
      </Text>
      <Text style={styles.priceNote}>{t('pro.priceNote', { catalog, launch })}</Text>

      <FeatureList title={t('pro.featuresTitle')} items={PRO_FEATURES} />
      <Text style={styles.later}>{t('pro.later')}</Text>
      <FeatureList title={t('pro.freeTitle')} items={FREE_FEATURES} />

      {!pro.storeAvailable ? <Text style={styles.storeNote}>{t('pro.unavailable')}</Text> : null}
      {pro.notice && (pro.storeAvailable || pro.notice !== 'unavailable') ? (
        <Text style={noticeStyle(pro.notice)}>{noticeCopy(t, pro.notice, pro.priceLabel)}</Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label={pro.busy === 'buy' ? t('pro.buying') : t('pro.buy', { price: pro.priceLabel })}
          accessibilityHint={t('pro.buyHint')}
          disabled={pro.busy !== null || !pro.storeAvailable}
          onPress={() => void pro.buy()}
        />
        <PrimaryButton
          muted
          label={pro.busy === 'restore' ? t('pro.restoring') : t('pro.restore')}
          accessibilityHint={t('pro.restoreHint')}
          disabled={pro.busy !== null || !pro.storeAvailable}
          onPress={() => void pro.restore()}
        />
        <PrimaryButton muted label={t('pro.back')} onPress={goBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    ...Type.kicker,
    marginTop: 22,
    color: Palette.accentBright,
  },
  title: {
    ...Type.displayL,
    marginTop: 8,
    color: Palette.ink,
  },
  body: {
    ...Type.bodyL,
    marginTop: 12,
    color: Palette.muted,
  },
  price: {
    ...Type.displayL,
    marginTop: 22,
    color: Palette.accentBright,
  },
  priceNote: {
    ...Type.caption,
    marginTop: 8,
    color: Palette.faintText,
  },
  card: {
    marginTop: 18,
    gap: 12,
  },
  cardTitle: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: Palette.accent,
  },
  featureText: {
    ...Type.body,
    flex: 1,
    color: Palette.ink,
  },
  later: {
    ...Type.caption,
    marginTop: 10,
    color: Palette.muted,
  },
  notice: {
    ...Type.body,
    marginTop: 16,
  },
  noticeOk: {
    color: Palette.accentBright,
  },
  noticeQuiet: {
    color: Palette.muted,
  },
  noticeWarn: {
    color: Palette.danger,
  },
  storeNote: {
    ...Type.body,
    marginTop: 16,
    color: Palette.danger,
  },
  actions: {
    marginTop: 22,
    gap: 10,
  },
});
