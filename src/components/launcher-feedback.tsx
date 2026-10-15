import { useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';

/** iOS confirmation when a tag opens the app away from the tag route. Android never shows this for a tap. */
export function LauncherFeedback() {
  const segments = useSegments();
  const { launcherFeedback } = useTiempo();
  if (!launcherFeedback || segments[0] === 'tag') return null;
  const ok = launcherFeedback.tone !== 'error';
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.box, ok ? styles.ok : styles.error]}>
        <Text style={styles.text}>{launcherFeedback.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
    zIndex: 20,
  },
  box: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ok: {
    borderColor: 'rgba(212,146,58,0.45)',
    backgroundColor: Palette.accentSoft,
  },
  error: {
    borderColor: 'rgba(224,112,96,0.45)',
    backgroundColor: Palette.dangerSoft,
  },
  text: {
    ...Type.body,
    color: Palette.ink,
    textAlign: 'center',
  },
});
