import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { parseKeyPayload } from '@/lib/mobile-key';

export default function ClaimKeyScreen() {
  const router = useRouter();
  const { becomeKeyHolder } = useTiempo();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission?.granted) {
    return (
      <Screen tabPadding={false}>
        <BrandMark />
        <Text style={styles.title}>Convertirme en llave</Text>
        <Text style={styles.body}>
          Escanea el QR de emparejar que te muestra el otro móvil en Ajustes → Llave móvil.
        </Text>
        <PrimaryButton label="Permitir cámara" onPress={() => void requestPermission()} />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label="Cancelar" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.title}>Emparejar como llave</Text>
        <Text style={styles.body}>Escanea el QR de emparejar (no el QR que parpadea cada 30s).</Text>
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
        <PrimaryButton muted label="Cancelar" onPress={() => router.back()} />
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
