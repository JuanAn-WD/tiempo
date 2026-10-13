import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FocusOrb } from '@/components/focus-orb';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { openAndroidPermissionScreens } from '@/lib/blocker';

const STEPS = [
  {
    kicker: '01 · El coste',
    title: 'Cinco horas al día\nno son “un rato”.',
    body: 'Son presencia, ideas y conversaciones que no vuelven. Aparta el móvil. Recupera tu tiempo.',
    visual: 'cost',
  },
  {
    kicker: '02 · La llave',
    title: 'Una barrera física,\nno otra app más.',
    body: 'Eliges. Escaneas. Se cierran. Para volver: tag NFC o el móvil de alguien de confianza.',
    visual: 'key',
  },
  {
    kicker: '03 · Emparejar',
    title: 'Tu tag.\nTu ritmo.',
    body: 'Solo tu tag o tu llave móvil. Emergencias: 3, con cinco minutos de espera. El modo estricto las quita, y pide una llave de repuesto.',
    visual: 'pair',
  },
] as const;

function StepVisual({ kind }: { kind: (typeof STEPS)[number]['visual'] }) {
  if (kind === 'cost') {
    return (
      <View style={styles.visualCard}>
        <Text style={styles.bigNum}>5h</Text>
        <Text style={styles.bigLabel}>media diaria en pantalla</Text>
        <View style={styles.bars}>
          {[0.35, 0.55, 0.7, 0.9, 0.65, 0.8, 0.45].map((h, i) => (
            <View key={i} style={[styles.bar, { height: 18 + h * 54 }]} />
          ))}
        </View>
      </View>
    );
  }
  if (kind === 'key') {
    return (
      <View style={styles.visualCard}>
        {['Eliges las apps', 'Escaneas el tag', 'Entras en presencia'].map((line, i) => (
          <View key={line} style={styles.stepRow}>
            <LinearGradient
              colors={[Palette.accent, Palette.accentBright]}
              style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </LinearGradient>
            <Text style={styles.stepLine}>{line}</Text>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

export default function Onboarding() {
  const { pairTag, pairSpareTag, completeOnboarding, requestPermissions, nfcSupported, state } =
    useTiempo();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <Screen tabPadding={false}>
      <View style={styles.top}>
        <BrandMark />
        <Text style={styles.stepCount}>
          {step + 1} / {STEPS.length}
        </Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>

      <Text style={styles.kicker}>{current.kicker}</Text>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>

      {step === 2 ? (
        <View style={styles.tag}>
          <FocusOrb
            locked={false}
            hint={
              state.tagId
                ? `Listo · ${state.tagId.slice(0, 12)}`
                : __DEV__
                  ? nfcSupported
                    ? 'Toca el tag NFC o mantén pulsado para simular'
                    : 'Mantén pulsado para simular el tag'
                  : nfcSupported
                    ? 'Toca y acerca tu tag NFC'
                    : 'Este móvil no tiene NFC'
            }
            onPress={() => void pairTag()}
            onLongPress={__DEV__ ? () => void pairTag('DEMO-TAG') : undefined}
          />
          {state.tagId ? (
            <View style={styles.spare}>
              <Text style={styles.spareHint}>
                {state.spareTagId
                  ? 'Llave de repuesto lista. El modo estricto ya se puede activar en Ajustes.'
                  : '¿Añades una llave de repuesto? Hace falta para el modo estricto.'}
              </Text>
              {state.spareTagId ? null : (
                <>
                  <PrimaryButton
                    muted
                    label="Añadir llave de repuesto"
                    onPress={() => void pairSpareTag()}
                    onLongPress={__DEV__ ? () => void pairSpareTag('DEMO-SPARE') : undefined}
                  />
                  {__DEV__ ? (
                    <PrimaryButton
                      muted
                      label="Simular llave de repuesto"
                      onPress={() => void pairSpareTag('DEMO-SPARE')}
                    />
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.visualWrap}>
          <StepVisual kind={current.visual} />
        </View>
      )}

      <View style={styles.actions}>
        {step < 2 ? (
          <>
            <PrimaryButton label="Continuar" onPress={() => setStep(step + 1)} />
            {step > 0 ? <PrimaryButton muted label="Atrás" onPress={() => setStep(step - 1)} /> : null}
          </>
        ) : (
          <>
            <PrimaryButton
              label="Activar permisos"
              onPress={() => {
                void requestPermissions();
                void openAndroidPermissionScreens();
              }}
            />
            <PrimaryButton muted label="Entrar en Apartag" onPress={() => void completeOnboarding()} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepCount: {
    color: Palette.faint,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceHigh,
  },
  dotOn: {
    backgroundColor: Palette.accent,
  },
  kicker: {
    color: Palette.accentBright,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 40,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -1,
  },
  body: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.muted,
  },
  visualWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  visualCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 22,
    gap: 14,
  },
  bigNum: {
    fontSize: 64,
    fontWeight: '700',
    color: Palette.accentBright,
    letterSpacing: -2,
  },
  bigLabel: {
    color: Palette.muted,
    fontSize: 15,
    marginTop: -8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 80,
    marginTop: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: Palette.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(212,146,58,0.25)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: Palette.accentText,
    fontWeight: '800',
  },
  stepLine: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  tag: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  spare: {
    gap: 8,
  },
  spareHint: {
    color: Palette.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginBottom: 8,
  },
});
