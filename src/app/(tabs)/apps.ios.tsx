import { FamilyActivityPickerView } from 'expo-app-blocker';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Badge, BrandMark } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n } from '@/i18n';

export default function AppsScreen() {
  const { state, setIosSelection } = useTiempo();
  const { t } = useI18n();

  return (
    <Screen>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge
          label={t(state.iosItems.length === 1 ? 'apps.chosenOne' : 'apps.chosen', {
            count: state.iosItems.length,
          })}
          tone="accent"
        />
      </View>
      <Text style={styles.title}>{t('apps.title')}</Text>
      <Text style={styles.sub}>{t('apps.iosSub')}</Text>
      <Text style={styles.limit}>{t('apps.iosLimit')}</Text>
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
    ...Type.displayL,
    color: Palette.ink,
  },
  sub: {
    ...Type.body,
    marginTop: 10,
    color: Palette.muted,
  },
  limit: {
    ...Type.caption,
    marginTop: 8,
    marginBottom: 16,
    color: Palette.danger,
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
