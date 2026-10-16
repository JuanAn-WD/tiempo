import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { Palette, Radius, Type } from '@/constants/theme';
import { useI18n, type TranslationKey } from '@/i18n';
import { useTiempo } from '@/context/tiempo-store';

const TABS: Record<
  string,
  {
    label: TranslationKey;
    ios: string;
    android: string;
    web: string;
  }
> = {
  index: {
    label: 'tabs.focus',
    ios: 'circle.inset.filled',
    android: 'radio_button_checked',
    web: 'target',
  },
  apps: {
    label: 'tabs.apps',
    ios: 'square.grid.2x2.fill',
    android: 'apps',
    web: 'apps',
  },
  stats: {
    label: 'tabs.time',
    ios: 'clock.fill',
    android: 'schedule',
    web: 'schedule',
  },
  logros: {
    label: 'tabs.logros',
    ios: 'trophy.fill',
    android: 'emoji_events',
    web: 'emoji_events',
  },
  ajustes: {
    label: 'tabs.settings',
    ios: 'gearshape.fill',
    android: 'settings',
    web: 'settings',
  },
};

export const TAB_BAR_HEIGHT = 64;

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { enforcing } = useTiempo();
  const { t } = useI18n();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TABS[route.name];
          const label = meta ? t(meta.label) : (descriptors[route.key]?.options.title ?? route.name);
          const showLockDot = route.name === 'index' && enforcing;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                focused && styles.itemOn,
                focused && enforcing && route.name === 'index' && styles.itemFocus,
                pressed && styles.pressed,
              ]}>
              <View style={styles.iconWrap}>
                <SymbolView
                  name={{
                    ios: (meta?.ios ?? 'circle') as never,
                    android: (meta?.android ?? 'circle') as never,
                    web: (meta?.web ?? 'circle') as never,
                  }}
                  size={20}
                  weight={focused ? 'bold' : 'regular'}
                  tintColor={
                    focused
                      ? route.name === 'index' && enforcing
                        ? Palette.focus
                        : Palette.accentText
                      : Palette.muted
                  }
                />
                {showLockDot ? <View style={styles.lockDot} /> : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  focused && styles.labelOn,
                  focused && route.name === 'index' && enforcing && styles.labelFocus,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Platform.select({
      ios: 'rgba(27,24,21,0.92)',
      default: Palette.surface,
    }),
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  item: {
    flex: 1,
    height: '100%',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemOn: {
    backgroundColor: Palette.accent,
  },
  itemFocus: {
    backgroundColor: Palette.focusSoft,
    borderWidth: 1,
    borderColor: 'rgba(110,231,176,0.35)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.focus,
    borderWidth: 1.5,
    borderColor: Palette.surface,
  },
  label: {
    ...Type.kicker,
    letterSpacing: 0.2,
    textTransform: 'none',
    color: Palette.muted,
  },
  labelOn: {
    color: Palette.accentText,
  },
  labelFocus: {
    color: Palette.focus,
  },
});
