import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { formatRefillDate } from '@/lib/emergency';

export function EmergencyEntry({ strictNote = false }: { strictNote?: boolean }) {
  const router = useRouter();
  const { state, clockSkewed } = useTiempo();

  if (!state.locked) return null;

  if (state.strict) {
    if (!strictNote) return null;
    return <Text style={styles.note}>Modo estricto. Solo tus llaves.</Text>;
  }

  const left = state.emergencyLeft;

  return (
    <View style={styles.wrap}>
      <PrimaryButton
        muted
        danger
        disabled={left <= 0}
        label={`Desbloqueo de emergencia (quedan ${left})`}
        accessibilityHint="Abre una cuenta atrás de 5 minutos. Si sales de la app, se cancela."
        onPress={() => router.push('/emergency')}
      />
      {left <= 0 ? (
        <Text style={styles.note}>
          {clockSkewed
            ? 'El reloj del móvil va atrás. No se recupera ninguna hasta que marque la hora bien.'
            : state.emergencyRefillAt
              ? `Se recupera una el ${formatRefillDate(state.emergencyRefillAt)}. Máximo 3.`
              : 'Ahora mismo no queda ninguna.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  note: {
    textAlign: 'center',
    color: Palette.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
