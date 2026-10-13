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
import { buildPulsePayload } from '@/lib/mobile-key';

export default function LlaveScreen() {
  const router = useRouter();
  const { state, clearKeyHolder } = useTiempo();
  const { t } = useI18n();
  const [payload, setPayload] = useState<string>('');
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!state.keyHolderSecret) return;
    let alive = true;
    const refresh = async () => {
      const next = await buildPulsePayload(state.keyHolderSecret!);
      if (alive) {
        setPayload(next);
        setSeconds(30);
      }
    };
    void refresh();
    const pulse = setInterval(() => void refresh(), 30_000);
    const tick = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      alive = false;
      clearInterval(pulse);
      clearInterval(tick);
    };
  }, [state.keyHolderSecret]);

  if (!state.keyHolderSecret) {
    return (
      <Screen tabPadding={false}>
        <BrandMark />
        <Text style={styles.title}>{t('llave.emptyTitle')}</Text>
        <Text style={styles.body}>{t('llave.emptyBody')}</Text>
        <PrimaryButton label={t('llave.claim')} onPress={() => router.push('/claim-key')} />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false}>
      <BrandMark />
      <Text style={styles.kicker}>{t('llave.kicker')}</Text>
      <Text style={styles.title}>{state.keyHolderLabel ?? 'Apartag'}</Text>
      <Text style={styles.body}>{t('llave.body')}</Text>

      <View style={styles.qrWrap}>
        {payload ? (
          <QRCode value={payload} size={220} backgroundColor={Palette.ink} color={Palette.bg} />
        ) : (
          <Text style={styles.body}>{t('llave.generating')}</Text>
        )}
        <Text style={styles.timer}>{t('llave.timer', { seconds })}</Text>
      </View>

      <PrimaryButton muted label={t('llave.stop')} onPress={() => void clearKeyHolder()} />
      <View style={{ height: 10 }} />
      <PrimaryButton muted label={t('common.close')} onPress={() => router.back()} />
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
    marginBottom: 20,
    color: Palette.muted,
  },
  qrWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: Palette.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    marginBottom: 16,
    padding: 24,
  },
  timer: {
    ...Type.mono,
    fontSize: 13,
    lineHeight: 18,
    color: Palette.faintText,
  },
});
