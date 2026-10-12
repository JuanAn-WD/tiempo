import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/app-tab-bar';
import { Palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Palette.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Foco' }} />
      <Tabs.Screen name="apps" options={{ title: 'Apps' }} />
      <Tabs.Screen name="stats" options={{ title: 'Tiempo' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
