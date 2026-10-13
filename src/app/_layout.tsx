import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TiempoProvider, useTiempo } from '@/context/tiempo-store';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { ready, state } = useTiempo();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
    const root = segments[0];
    const inOnboarding = root === 'onboarding';
    const freeKeyFlow = root === 'claim-key' || root === 'llave';

    if (!state.onboarded && !inOnboarding && !freeKeyFlow) {
      router.replace('/onboarding');
      return;
    }
    if (state.onboarded && inOnboarding) {
      router.replace('/');
    }
  }, [ready, router, segments, state.onboarded]);

  if (!ready) {
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
        <Stack.Screen name="emergency" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pair-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="claim-key" options={{ presentation: 'modal' }} />
        <Stack.Screen name="llave" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <TiempoProvider>
      <Gate />
    </TiempoProvider>
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
