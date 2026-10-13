import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { CameraPermissionGate } from '@/components/camera-permission';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';

export default function ScanKeyScreen() {
  const router = useRouter();
  const { toggleLockWithMobileKey, state } = useTiempo();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  return (
    <CameraPermissionGate onCancel={() => router.back()}>
    <Screen tabPadding={false} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.title}>{t('scanKey.scanTitle')}</Text>
        <Text style={styles.body}>{state.locked ? t('scanKey.unlock') : t('scanKey.lock')}</Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={async ({ data }) => {
            if (handled.current || busy) return;
            handled.current = true;
            setBusy(true);
            const ok = await toggleLockWithMobileKey(data);
            if (ok) {
              router.replace('/');
            } else {
              handled.current = false;
              setBusy(false);
            }
          }}
        />
        <View style={styles.frame} />
      </View>

      <View style={styles.footer}>
        <PrimaryButton muted label={t('common.cancel')} onPress={() => router.back()} />
      </View>
    </Screen>
    </CameraPermissionGate>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    ...Type.displayL,
    marginTop: 16,
    color: Palette.ink,
  },
  body: {
    ...Type.body,
    marginTop: 8,
    color: Palette.muted,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Palette.surface,
  },
  frame: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: Palette.accent,
    borderRadius: Radius.xl,
    margin: 48,
  },
  footer: {
    padding: 24,
  },
});
