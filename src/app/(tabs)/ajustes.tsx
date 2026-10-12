import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Badge, BrandMark, Card } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { openAndroidPermissionScreens } from '@/lib/blocker';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, pairTag, nfcSupported, permissions, requestPermissions, refreshPermissions } =
    useTiempo();

  const ok = !!permissions?.allGranted;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
      </View>

      <Text style={styles.title}>Control{'\n'}y seguridad</Text>
      <Text style={styles.sub}>Solo tag NFC o llave móvil. Sin emergencias.</Text>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Desbloqueo</Text>
          <Badge label="Estricto" tone="focus" />
        </View>
        <Text style={styles.rowHint}>
          Mientras hay bloqueo, solo el tag NFC o un móvil emparejado pueden salir. No hay botones de
          emergencia ni códigos.
        </Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Tag NFC</Text>
          <Badge label={state.tagId ? 'OK' : '—'} tone={state.tagId ? 'focus' : 'neutral'} />
        </View>
        <Text style={styles.rowHint}>
          {state.tagId ? state.tagId : 'Sin tag. Acerca uno o mantén pulsado para simular.'}
        </Text>
        <Text style={styles.rowHint}>
          {nfcSupported ? 'NFC disponible' : 'Sin NFC · simulación por pulsación larga'}
        </Text>
        <PrimaryButton label={state.tagId ? 'Cambiar tag' : 'Emparejar tag'} onPress={() => void pairTag()} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Llave móvil</Text>
          <Badge
            label={state.mobileKeySecret ? 'Activa' : '—'}
            tone={state.mobileKeySecret ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={styles.rowHint}>
          Empareja el móvil de tu pareja: podrá bloquearte y desbloquearte mostrando un QR que se
          renueva solo.
        </Text>
        <PrimaryButton
          label={state.mobileKeySecret ? 'Mostrar QR de emparejar' : 'Crear llave móvil'}
          onPress={() => router.push('/pair-key')}
        />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label="Soy la llave (otro móvil)" onPress={() => router.push('/llave')} />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label="Convertirme en llave" onPress={() => router.push('/claim-key')} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Permisos</Text>
          <Badge label={ok ? 'Listos' : 'Faltan'} tone={ok ? 'focus' : 'danger'} />
        </View>
        <Text style={styles.rowHint}>
          {ok
            ? 'El sistema puede bloquear apps de verdad.'
            : 'En Android: acceso de uso + mostrar sobre otras apps.'}
        </Text>
        <PrimaryButton label="Refrescar permisos" onPress={() => void requestPermissions()} />
        {Platform.OS === 'android' || Platform.OS === 'web' ? (
          <>
            <View style={{ height: 10 }} />
            <PrimaryButton
              muted
              label="Abrir ajustes Android"
              onPress={() => {
                void openAndroidPermissionScreens();
                setTimeout(() => void refreshPermissions(), 2500);
              }}
            />
          </>
        ) : null}
      </Card>

      <Text style={styles.legal}>
        iOS · Family Controls. Android · overlay + usage access. Hace falta esta APK o un development
        build, no Expo Go.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -0.9,
  },
  sub: {
    marginTop: 10,
    marginBottom: 8,
    color: Palette.muted,
    fontSize: 15,
  },
  card: {
    marginTop: 12,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    color: Palette.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  rowHint: {
    color: Palette.muted,
    lineHeight: 20,
    marginTop: 4,
  },
  legal: {
    marginTop: 20,
    color: Palette.faint,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 12,
  },
});
