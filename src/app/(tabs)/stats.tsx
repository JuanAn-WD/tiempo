import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { BrandMark, Card } from '@/components/ui';
import { Palette, Radius } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { formatDuration, yearsFromDailyHours } from '@/lib/storage';

function Stepper({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.sliderLabel}>
        {label} <Text style={styles.sliderValue}>{display}</Text>
      </Text>
      <View style={styles.stepRow}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, +(value - step).toFixed(1)))}>
          <Text style={styles.stepTxt}>−</Text>
        </Pressable>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, +(value + step).toFixed(1)))}>
          <Text style={styles.stepTxt}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { state } = useTiempo();
  const last = state.sessions.slice(0, 8);
  const [age, setAge] = useState(30);
  const [hours, setHours] = useState(5);
  const years = useMemo(() => yearsFromDailyHours(hours, age), [age, hours]);

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
      </View>

      <Text style={styles.title}>Lo que ya{'\n'}no se pierde</Text>

      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Recuperado</Text>
        <Text style={styles.heroValue}>{formatDuration(state.recoveredMs)}</Text>
        <Text style={styles.heroMeta}>{state.sessions.length} sesiones · con el tag</Text>
      </Card>

      <Card style={styles.yearsCard}>
        <Text style={styles.cardTitle}>Si sigues al ritmo actual</Text>
        <Text style={styles.years}>{years.toFixed(1)}</Text>
        <Text style={styles.yearsUnit}>años de vida en la pantalla hasta los 80</Text>
        <Stepper label="Edad" value={age} display={`${age}`} min={14} max={70} step={1} onChange={setAge} />
        <Stepper
          label="Horas / día"
          value={hours}
          display={hours.toFixed(1)}
          min={0.5}
          max={12}
          step={0.5}
          onChange={setHours}
        />
      </Card>

      <Text style={styles.section}>Sesiones</Text>
      {last.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>Aún vacío</Text>
          <Text style={styles.empty}>Escanea el tag en Foco. La primera sesión empieza ahí.</Text>
        </Card>
      ) : (
        <View style={styles.sessionList}>
          {last.map((session) => (
            <Card key={session.startedAt} style={styles.sessionRow}>
              <View>
                <Text style={styles.rowTitle}>{session.mode}</Text>
                <Text style={styles.rowDate}>
                  {new Date(session.startedAt).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.rowMeta}>{formatDuration(session.endedAt - session.startedAt)}</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: Palette.ink,
    fontWeight: '600',
    letterSpacing: -0.9,
    marginBottom: 20,
  },
  hero: {
    marginBottom: 12,
    backgroundColor: Palette.accentSoft,
    borderColor: 'rgba(212,146,58,0.28)',
  },
  heroLabel: {
    color: Palette.accentBright,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroValue: {
    marginTop: 10,
    fontSize: 44,
    fontWeight: '700',
    color: Palette.ink,
    letterSpacing: -1.4,
  },
  heroMeta: {
    marginTop: 6,
    color: Palette.muted,
  },
  yearsCard: {
    marginBottom: 24,
  },
  cardTitle: {
    color: Palette.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  years: {
    marginTop: 12,
    fontSize: 48,
    fontWeight: '700',
    color: Palette.accentBright,
    letterSpacing: -1.6,
  },
  yearsUnit: {
    color: Palette.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  stepper: {
    marginTop: 10,
  },
  sliderLabel: {
    color: Palette.muted,
  },
  sliderValue: {
    color: Palette.ink,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepBtn: {
    width: 48,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
  },
  stepTxt: {
    fontSize: 22,
    color: Palette.ink,
    fontWeight: '600',
  },
  section: {
    color: Palette.ink,
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 16,
  },
  emptyTitle: {
    color: Palette.ink,
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    color: Palette.muted,
    lineHeight: 20,
  },
  sessionList: {
    gap: 8,
    paddingBottom: 20,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowTitle: {
    textTransform: 'capitalize',
    color: Palette.ink,
    fontWeight: '700',
  },
  rowDate: {
    color: Palette.faint,
    marginTop: 3,
    fontSize: 12,
  },
  rowMeta: {
    color: Palette.accentBright,
    fontWeight: '700',
  },
});
