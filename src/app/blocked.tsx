import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyEntry } from '@/components/emergency-entry';
import { FocusOrb } from '@/components/focus-orb';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';

export default function BlockedScreen() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  const router = useRouter();
  const { toggleLockWithTag, state, refreshEmergencyClock } = useTiempo();
  const name = app ? decodeURIComponent(String(app)) : 'Esa app';

  useFocusEffect(
    useCallback(() => {
      void refreshEmergencyClock();
      if (!state.locked) router.replace('/');
    }, [refreshEmergencyClock, router, state.locked]),
  );

  return (
    <Screen tabPadding={false} atmosphere={state.locked ? 'focus' : 'idle'}>
      <BrandMark size={20} />
      <Text style={[styles.kicker, !state.locked && { color: Palette.accentBright }]}>
        {state.locked ? 'Bloqueada' : 'Desbloqueada'}
      </Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.body}>
        {state.locked
          ? state.strict
            ? 'Modo estricto. Acerca el tag NFC o escanea la llave móvil.'
            : 'Acerca el tag NFC o escanea la llave móvil.'
          : 'Ya puedes salir. Vuelve a Foco cuando quieras.'}
      </Text>

      <View style={styles.tag}>
        <FocusOrb
          locked={state.locked}
          hint={
            state.locked
              ? __DEV__
                ? 'Tag NFC · mantén pulsado para simular'
                : 'Acerca tu tag para volver'
              : 'Sesión cerrada'
          }
          onPress={() => void toggleLockWithTag(false)}
          onLongPress={__DEV__ ? () => void toggleLockWithTag(true) : undefined}
        />
      </View>

      <View style={styles.actions}>
        {state.locked ? (
          <PrimaryButton label="Escanear llave móvil" onPress={() => router.push('/scan-key')} />
        ) : null}
        <EmergencyEntry strictNote />
        <PrimaryButton muted label="Volver a Foco" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: 22,
    color: Palette.focus,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 40,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -1,
  },
  body: {
    marginTop: 10,
    color: Palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  tag: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
});
