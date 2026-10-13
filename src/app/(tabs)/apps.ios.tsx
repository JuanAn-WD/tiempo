import { FamilyActivityPickerView } from 'expo-app-blocker';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Badge, BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';

export default function AppsScreen() {
  const { state, setIosSelection } = useTiempo();

  return (
    <Screen>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge label={`${state.iosItems.length} elegidas`} tone="accent" />
      </View>
      <Text style={styles.title}>Qué se cierra{'\n'}al escanear</Text>
      <Text style={styles.sub}>Selector nativo de Tiempo de uso.</Text>
      <Text style={styles.limit}>
        No incluyas Apartag ni una categoría. Las categorías no se bloquean: iOS no dice si esta app va
        dentro, y bloquearla dejaría la emergencia fuera de alcance. El selector no permite ocultar
        Apartag. Si lo marcas y el sistema no identifica el token, no podemos quitarlo.
      </Text>
      <View style={styles.pickerWrap}>
        <FamilyActivityPickerView
          initialSelection={state.iosSelectionData}
          theme="dark"
          style={styles.picker}
          onSelectionChange={(event) => setIosSelection(event.selectionData, event.items)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: Palette.muted,
    fontSize: 15,
  },
  limit: {
    marginTop: 8,
    marginBottom: 16,
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  pickerWrap: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  picker: {
    flex: 1,
    minHeight: 420,
  },
});
