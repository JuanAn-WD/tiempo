import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AchievementCelebration } from '@/components/achievement-celebration';
import { LauncherFeedback } from '@/components/launcher-feedback';
import { StoreReviewPrompt } from '@/components/store-review-prompt';
import { brandFonts } from '@/constants/fonts';
import { Palette } from '@/constants/theme';
import { ProProvider } from '@/context/pro-store';
import { TiempoProvider, useTiempo } from '@/context/tiempo-store';
import { I18nProvider } from '@/i18n';

SplashScreen.preventAutoHideAsync();

function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { ready, state } = useTiempo();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready || !fontsReady) return;
    void SplashScreen.hideAsync();
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    const freeKeyFlow = root === 'claim-key' || root === 'llave';
    const inPermissions = root === 'permissions';

    if (!state.onboarded && !inOnboarding && !freeKeyFlow && !inPermissions) {
      router.replace('/onboarding');
      return;
    }
    if (state.onboarded && inOnboarding) {
      router.replace('/');
    }
  }, [fontsReady, ready, router, segments, state.onboarded]);

  if (!ready || !fontsReady) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator color={Palette.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <StoreReviewPrompt />
      <LauncherFeedback />
      <AchievementCelebration />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="permissions" options={{ presentation: 'modal' }} />
        <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
        <Stack.Screen name="emergency" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session-done" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pair-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="claim-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="llave" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tag" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(brandFonts);
  const fontsReady = fontsLoaded || fontError != null;

  return (
    <I18nProvider>
      <TiempoProvider>
        <ProProvider>
          <Gate fontsReady={fontsReady} />
        </ProProvider>
      </TiempoProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
