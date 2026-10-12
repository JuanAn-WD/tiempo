import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Badge, BrandMark, Card } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';

export default function AppsScreen() {
  const { apps, state, togglePackage } = useTiempo();
  const [query, setQuery] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      const on = state.selectedPackages.includes(app.packageName);
      if (onlyOn && !on) return false;
      if (!q) return true;
      return app.name.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q);
    });
  }, [apps, onlyOn, query, state.selectedPackages]);

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
        <Badge label={`${state.selectedPackages.length} activas`} tone="accent" />
      </View>

      <Text style={styles.title}>Qué se cierra{'\n'}al escanear</Text>
      <Text style={styles.sub}>Redes fuera. Cámara, llamadas y mapas pueden quedarse.</Text>

      <View style={styles.tools}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar…"
          placeholderTextColor={Palette.faint}
          style={styles.search}
        />
        <Pressable
          onPress={() => setOnlyOn((v) => !v)}
          style={[styles.filter, onlyOn && styles.filterOn]}>
          <Text style={[styles.filterText, onlyOn && styles.filterTextOn]}>ON</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {filtered.map((app) => {
          const on = state.selectedPackages.includes(app.packageName);
          return (
            <Pressable
              key={app.packageName}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              onPress={() => togglePackage(app.packageName)}>
              <Card style={[styles.row, on && styles.rowOn]}>
                {app.iconBase64 ? (
                  <Image source={{ uri: `data:image/png;base64,${app.iconBase64}` }} style={styles.icon} />
                ) : (
                  <View style={[styles.iconFallback, on && styles.iconFallbackOn]}>
                    <Text style={styles.iconLetter}>{app.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={styles.meta}>
                  <Text style={styles.name}>{app.name}</Text>
                </View>
                <View style={[styles.toggle, on && styles.toggleOn]}>
                  <View style={[styles.knob, on && styles.knobOn]} />
                </View>
              </Card>
            </Pressable>
          );
        })}
        {filtered.length === 0 ? <Text style={styles.empty}>Nada con ese filtro.</Text> : null}
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
    marginBottom: 18,
    color: Palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  search: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: Palette.ink,
    fontSize: 15,
  },
  filter: {
    width: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: {
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.4)',
  },
  filterText: {
    color: Palette.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  filterTextOn: {
    color: Palette.accentBright,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowOn: {
    borderColor: 'rgba(212,146,58,0.28)',
    backgroundColor: Palette.accentSoft,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackOn: {
    backgroundColor: 'rgba(212,146,58,0.25)',
  },
  iconLetter: {
    fontWeight: '800',
    color: Palette.ink,
  },
  meta: {
    flex: 1,
  },
  name: {
    color: Palette.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.muted,
  },
  knobOn: {
    alignSelf: 'flex-end',
    backgroundColor: Palette.accentText,
  },
  empty: {
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 28,
  },
});
