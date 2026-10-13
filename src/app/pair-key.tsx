import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { buildPairPayload } from '@/lib/mobile-key';

export default function PairKeyScreen() {
  const router = useRouter();
  const { state, ensureMobileKeySecret, revokeMobileKey } = useTiempo();
  const { t } = useI18n();
  const [payload, setPayload] = useState('');

  useEffect(() => {
    if (state.locked) return;
    void (async () => {
      const secret = await ensureMobileKeySecret();
      if (!secret) return;
      setPayload(await buildPairPayload(secret, 'apartag.'));
    })();
  }, [ensureMobileKeySecret, state.locked]);

  if (state.locked) {
    return (
      <Screen tabPadding={false}>
        <BrandMark />
        <Text style={styles.kicker}>{t('pairKey.kicker')}</Text>
        <Text style={styles.title}>{t('pairKey.lockedTitle')}</Text>
        <Text style={styles.body}>{t('pairKey.lockedBody')}</Text>
        <PrimaryButton muted label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false}>
      <BrandMark />
      <Text style={styles.kicker}>{t('pairKey.kicker')}</Text>
      <Text style={styles.title}>{t('pairKey.title')}</Text>
      <Text style={styles.body}>{t('pairKey.body')}</Text>

      <View style={styles.qrWrap}>
        {payload ? (
          <QRCode value={payload} size={220} backgroundColor={Palette.ink} color={Palette.bg} />
        ) : (
          <Text style={styles.body}>{t('pairKey.preparing')}</Text>
        )}
        <Text style={styles.meta}>{state.mobileKeySecret ? t('pairKey.active') : t('pairKey.inactive')}</Text>
      </View>

      <PrimaryButton
        danger
        label={t('pairKey.revoke')}
        onPress={() => {
          void revokeMobileKey();
          router.back();
        }}
      />
      <View style={{ height: 10 }} />
      <PrimaryButton muted label={t('pairKey.done')} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...Type.kicker,
    marginTop: 22,
    color: Palette.accentBright,
  },
  title: {
    ...Type.displayL,
    marginTop: 10,
    color: Palette.ink,
  },
  body: {
    ...Type.body,
    marginTop: 10,
    marginBottom: 16,
    color: Palette.muted,
  },
  qrWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: Palette.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    marginBottom: 16,
    padding: 24,
  },
  meta: {
    ...Type.captionBold,
    color: Palette.faintText,
  },
});
