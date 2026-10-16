import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/app-tab-bar';
import { Palette } from '@/constants/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Palette.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.focus') }} />
      <Tabs.Screen name="apps" options={{ title: t('tabs.apps') }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.time') }} />
      <Tabs.Screen name="logros" options={{ title: t('tabs.logros') }} />
      <Tabs.Screen name="ajustes" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
