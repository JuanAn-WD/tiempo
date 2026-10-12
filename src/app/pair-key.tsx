import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { buildPairPayload } from '@/lib/mobile-key';

export default function PairKeyScreen() {
  const router = useRouter();
  const { state, ensureMobileKeySecret, revokeMobileKey } = useTiempo();
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
        <Text style={styles.kicker}>Llave móvil</Text>
        <Text style={styles.title}>Bloqueado</Text>
        <Text style={styles.body}>
          No se puede mostrar el QR de emparejar mientras hay bloqueo. Desbloquea con el tag o la llave
          móvil ya emparejada.
        </Text>
        <PrimaryButton muted label="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen tabPadding={false}>
      <BrandMark />
      <Text style={styles.kicker}>Llave móvil</Text>
      <Text style={styles.title}>Empareja otro teléfono</Text>
      <Text style={styles.body}>
        En el móvil de tu pareja: Apartag → Ajustes → “Convertirme en llave”, y escanea este QR. Después
        podrá bloquearte y desbloquearte mostrando su QR vivo.
      </Text>

      <View style={styles.qrWrap}>
        {payload ? (
          <QRCode value={payload} size={220} backgroundColor={Palette.ink} color={Palette.bg} />
        ) : (
          <Text style={styles.body}>Preparando llave…</Text>
        )}
        <Text style={styles.meta}>
          {state.mobileKeySecret ? 'Llave activa' : 'Sin llave'}
        </Text>
      </View>

      <PrimaryButton
        danger
        label="Revocar llave móvil"
        onPress={() => {
          void revokeMobileKey();
          router.back();
        }}
      />
      <View style={{ height: 10 }} />
      <PrimaryButton muted label="Listo" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: 22,
    color: Palette.accentBright,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  body: {
    marginTop: 10,
    marginBottom: 16,
    color: Palette.muted,
    fontSize: 15,
    lineHeight: 22,
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
    color: Palette.faint,
    fontWeight: '700',
  },
});
