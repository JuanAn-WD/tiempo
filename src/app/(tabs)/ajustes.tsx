import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Badge, BrandMark, Card } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { openAndroidPermissionScreens } from '@/lib/blocker';
import { STRICT_CONFIRMATION, countKeys, formatRefillDate, hasBackupKey } from '@/lib/emergency';

function keySummary(tag: boolean, spare: boolean, mobile: boolean) {
  const parts = [
    tag ? 'tag' : null,
    spare ? 'segundo tag' : null,
    mobile ? 'llave móvil' : null,
  ].filter((part): part is string => !!part);
  if (parts.length === 0) return 'Aún no hay ninguna llave.';
  return `Llaves: ${parts.join(', ')}.`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    state,
    pairTag,
    pairSpareTag,
    clearSpareTag,
    setStrict,
    nfcSupported,
    permissions,
    requestPermissions,
    refreshPermissions,
    refreshEmergencyClock,
    clockSkewed,
  } = useTiempo();
  const [confirmation, setConfirmation] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshEmergencyClock();
    }, [refreshEmergencyClock]),
  );

  const ok = !!permissions?.allGranted;
  const backup = hasBackupKey(state);
  const confirmed = confirmation.trim() === STRICT_CONFIRMATION;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
      </View>

      <Text style={styles.title}>Control{'\n'}y seguridad</Text>
      <Text style={styles.sub}>
        {state.strict
          ? 'Modo estricto. Solo tus llaves. Sin emergencias.'
          : `Solo tu tag o tu llave móvil. Emergencias: ${state.emergencyLeft}`}
      </Text>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Emergencias</Text>
          <Badge
            label={state.strict ? 'Desactivadas' : `${state.emergencyLeft} de 3`}
            tone={state.strict ? 'danger' : state.emergencyLeft > 0 ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={styles.rowHint}>
          Tres desbloqueos, gratis. Se recupera uno cada 30 días, hasta 3. Cada uno espera 5 minutos
          con la app abierta. Si sales, se cancela.
        </Text>
        {state.strict ? (
          <Text style={styles.rowHint}>
            El modo estricto no deja usarlas. Si lo desactivas, sigues teniendo {state.emergencyLeft}.
          </Text>
        ) : state.emergencyLeft < 3 ? (
          <Text style={styles.rowHint}>
            {clockSkewed
              ? 'El reloj del móvil va atrás. No se recupera ninguna hasta que marque la hora bien.'
              : state.emergencyRefillAt
                ? `La siguiente vuelve el ${formatRefillDate(state.emergencyRefillAt)}.`
                : 'La siguiente aún no tiene fecha.'}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Modo estricto</Text>
          <Badge label={state.strict ? 'Estricto' : 'Normal'} tone={state.strict ? 'danger' : 'neutral'} />
        </View>
        <Text style={styles.rowHint}>
          Opcional. Quita las emergencias: solo sales con tus llaves. Para activarlo hace falta una
          llave de repuesto (segundo tag o llave móvil) y escribir {STRICT_CONFIRMATION}. Durante un
          bloqueo no se puede desactivar.
        </Text>
        <Text style={styles.rowHint}>
          {keySummary(!!state.tagId, !!state.spareTagId, !!state.mobileKeySecret)}
        </Text>
        {state.strict ? (
          <>
            {confirmOff && !state.locked ? (
              <>
                <Text style={styles.rowHint}>Volverás a tener desbloqueos de emergencia.</Text>
                <PrimaryButton
                  danger
                  label="Sí, desactivar"
                  onPress={() => {
                    setStrict(false);
                    setConfirmOff(false);
                  }}
                />
                <PrimaryButton muted label="Cancelar" onPress={() => setConfirmOff(false)} />
              </>
            ) : (
              <PrimaryButton
                muted
                label="Desactivar modo estricto"
                disabled={state.locked}
                onPress={() => setConfirmOff(true)}
              />
            )}
            {state.locked ? (
              <Text style={styles.rowHint}>Durante este bloqueo no se puede desactivar.</Text>
            ) : null}
          </>
        ) : backup ? (
          <>
            <Text style={styles.rowHint}>
              Si lo activas y luego te bloqueas, la única salida son tus llaves.
            </Text>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={STRICT_CONFIRMATION}
              placeholderTextColor={Palette.faint}
              accessibilityLabel="Escribe ESTRICTO para confirmar"
              style={styles.input}
            />
            <PrimaryButton
              danger
              label="Activar modo estricto"
              disabled={!confirmed}
              onPress={() => {
                setStrict(true, confirmation);
                setConfirmation('');
              }}
            />
          </>
        ) : (
          <Text style={styles.rowHint}>
            Te falta una llave de repuesto. Empareja un segundo tag o crea una llave móvil, más abajo.
          </Text>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Tag NFC</Text>
          <Badge label={state.tagId ? 'OK' : '—'} tone={state.tagId ? 'focus' : 'neutral'} />
        </View>
        <Text style={styles.rowHint}>
          {state.tagId
            ? state.tagId
            : __DEV__
              ? 'Sin tag. Acerca uno o mantén pulsado para simular.'
              : 'Sin tag. Acerca uno para emparejarlo.'}
        </Text>
        <Text style={styles.rowHint}>
          {nfcSupported
            ? 'NFC disponible'
            : __DEV__
              ? 'Sin NFC · simulación por pulsación larga'
              : 'Sin NFC en este dispositivo'}
        </Text>
        <PrimaryButton label={state.tagId ? 'Cambiar tag' : 'Emparejar tag'} onPress={() => void pairTag()} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>Llave de repuesto</Text>
          <Badge label={state.spareTagId ? 'OK' : '—'} tone={state.spareTagId ? 'focus' : 'neutral'} />
        </View>
        <Text style={styles.rowHint}>
          {state.spareTagId
            ? state.spareTagId
            : 'Un segundo tag. Con el principal, basta para activar el modo estricto.'}
        </Text>
        <PrimaryButton
          muted
          label={state.spareTagId ? 'Cambiar segundo tag' : 'Emparejar segundo tag'}
          onPress={() => void pairSpareTag()}
          onLongPress={__DEV__ ? () => void pairSpareTag('DEMO-SPARE') : undefined}
        />
        {__DEV__ && !state.spareTagId ? (
          <PrimaryButton muted label="Simular segundo tag" onPress={() => void pairSpareTag('DEMO-SPARE')} />
        ) : null}
        {state.spareTagId ? (
          <>
            <View style={{ height: 10 }} />
            <PrimaryButton
              muted
              danger
              label="Quitar llave de repuesto"
              disabled={state.strict && countKeys(state) < 3}
              onPress={() => void clearSpareTag()}
            />
            {state.strict && countKeys(state) < 3 ? (
              <Text style={styles.rowHint}>
                El modo estricto necesita dos llaves. Añade otra antes de quitar esta.
              </Text>
            ) : null}
          </>
        ) : null}
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
  input: {
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: Palette.bgElevated,
  },
  legal: {
    marginTop: 20,
    color: Palette.faint,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 12,
  },
});
