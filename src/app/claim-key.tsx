import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';
import { parseKeyPayload } from '@/lib/mobile-key';

export default function ClaimKeyScreen() {
  const router = useRouter();
  const { becomeKeyHolder } = useTiempo();
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission?.granted) {
    return (
      <Screen tabPadding={false}>
        <BrandMark />
        <Text style={styles.title}>{t('claimKey.title')}</Text>
        <Text style={styles.body}>{t('claimKey.body')}</Text>
        <PrimaryButton label={t('claimKey.camera')} onPress={() => void requestPermission()} />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label={t('common.cancel')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.title}>{t('claimKey.pairTitle')}</Text>
        <Text style={styles.body}>{t('claimKey.pairBody')}</Text>
      </View>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={async ({ data }) => {
            if (handled.current) return;
            const payload = parseKeyPayload(data);
            if (!payload || payload.t !== 'pair') return;
            handled.current = true;
            await becomeKeyHolder(payload.s, payload.n);
            router.replace('/llave');
          }}
        />
      </View>
      <View style={styles.footer}>
        <PrimaryButton muted label={t('common.cancel')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    color: Palette.ink,
    fontWeight: '600',
  },
  body: {
    marginTop: 8,
    color: Palette.muted,
    lineHeight: 22,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Palette.surface,
  },
  footer: {
    padding: 24,
  },
});
