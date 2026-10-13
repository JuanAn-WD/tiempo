import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { NfcNotice } from '@/components/nfc-notice';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { Badge, BrandMark, Card } from '@/components/ui';
import { Palette, Radius, Type } from '@/constants/theme';
import { useTiempo } from '@/context/tiempo-store';
import { useI18n, type Translate } from '@/i18n';
import { usePermissionRecord } from '@/lib/permission-ack';
import { countKeys, formatRefillDate, hasBackupKey, acceptsStrictConfirmation } from '@/lib/emergency';

function keySummary(t: Translate, tag: boolean, spare: boolean, mobile: boolean) {
  const parts = [
    tag ? t('settings.keys.tag') : null,
    spare ? t('settings.keys.spare') : null,
    mobile ? t('settings.keys.phone') : null,
  ].filter((part): part is string => !!part);
  if (parts.length === 0) return t('settings.keys.none');
  return t('settings.keys.list', { list: parts.join(', ') });
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    state,
    pairTag,
    pairSpareTag,
    clearSpareTag,
    setStrict,
    nfcSupported,
    nfcEnabled,
    permissions,
    refreshPermissions,
    refreshEmergencyClock,
    refreshNfcStatus,
    clockSkewed,
  } = useTiempo();
  const { locale, t } = useI18n();
  const { record, ready: permissionsReady } = usePermissionRecord();
  const nfcExplained = permissionsReady && record.seen.includes('nfc');
  const explainNfc = () => router.push('/permissions?scope=nfc');
  const [confirmation, setConfirmation] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshEmergencyClock();
      void refreshNfcStatus();
      void refreshPermissions();
    }, [refreshEmergencyClock, refreshNfcStatus, refreshPermissions]),
  );

  const ok = !!permissions?.allGranted;
  const backup = hasBackupKey(state);
  const confirmed = acceptsStrictConfirmation(confirmation);
  const word = t('strict.word');

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <BrandMark size={20} />
      </View>

      <Text style={styles.title}>{t('settings.title')}</Text>
      <Text style={styles.sub}>
        {state.strict
          ? t('focus.footerStrict')
          : t('focus.footerNormal', { count: state.emergencyLeft })}
      </Text>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.emergenciesTitle')}</Text>
          <Badge
            label={state.strict ? t('settings.badgeOff') : t('settings.badgeCount', { count: state.emergencyLeft })}
            tone={state.strict ? 'danger' : state.emergencyLeft > 0 ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={styles.rowHint}>{t('settings.emergenciesBody')}</Text>
        {state.strict ? (
          <Text style={styles.rowHint}>
            {t('settings.emergenciesStrict', { count: state.emergencyLeft })}
          </Text>
        ) : state.emergencyLeft < 3 ? (
          <Text style={styles.rowHint}>
            {clockSkewed
              ? t('emergency.clockSkew')
              : state.emergencyRefillAt
                ? t('settings.emergenciesNext', { date: formatRefillDate(state.emergencyRefillAt, locale) })
                : t('settings.emergenciesNoDate')}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.strictTitle')}</Text>
          <Badge
            label={state.strict ? t('settings.badgeStrict') : t('settings.badgeNormal')}
            tone={state.strict ? 'danger' : 'neutral'}
          />
        </View>
        <Text style={styles.rowHint}>{t('settings.strictBody', { word })}</Text>
        <Text style={styles.rowHint}>
          {keySummary(t, !!state.tagId, !!state.spareTagId, !!state.mobileKeySecret)}
        </Text>
        {state.strict ? (
          <>
            {confirmOff && !state.locked ? (
              <>
                <Text style={styles.rowHint}>{t('settings.strictBack')}</Text>
                <PrimaryButton
                  danger
                  label={t('settings.strictYes')}
                  onPress={() => {
                    setStrict(false);
                    setConfirmOff(false);
                  }}
                />
                <PrimaryButton muted label={t('common.cancel')} onPress={() => setConfirmOff(false)} />
              </>
            ) : (
              <PrimaryButton
                muted
                label={t('settings.strictOff')}
                disabled={state.locked}
                onPress={() => setConfirmOff(true)}
              />
            )}
            {state.locked ? <Text style={styles.rowHint}>{t('settings.strictLocked')}</Text> : null}
          </>
        ) : backup ? (
          <>
            <Text style={styles.rowHint}>{t('settings.strictWarn')}</Text>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={word}
              placeholderTextColor={Palette.faintText}
              maxFontSizeMultiplier={2}
              accessibilityLabel={t('settings.strictA11y', { word })}
              style={styles.input}
            />
            <PrimaryButton
              danger
              label={t('settings.strictOn')}
              disabled={!confirmed}
              onPress={() => {
                setStrict(true, confirmation);
                setConfirmation('');
              }}
            />
          </>
        ) : (
          <Text style={styles.rowHint}>{t('settings.strictNeedSpare')}</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.tagTitle')}</Text>
          <Badge
            label={state.tagId ? t('common.ok') : t('common.dash')}
            tone={state.tagId ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={[styles.rowHint, state.tagId ? styles.tagId : null]}>
          {state.tagId ? state.tagId : __DEV__ ? t('settings.tagMissingDev') : t('settings.tagMissing')}
        </Text>
        <Text style={styles.rowHint}>
          {!nfcSupported
            ? __DEV__
              ? t('nfc.statusUnsupportedDev')
              : t('nfc.statusUnsupported')
            : !nfcEnabled
              ? t('nfc.statusDisabled')
              : t('nfc.statusReady')}
        </Text>
        <Text style={styles.rowHint}>{t('nfc.doubleScanHint')}</Text>
        <NfcNotice
          scope="pair"
          onRetry={() => {
            if (!nfcExplained) explainNfc();
            else void pairTag();
          }}
        />
        <PrimaryButton
          label={state.tagId ? t('settings.tagChange') : t('settings.tagPair')}
          onPress={() => {
            if (!nfcExplained) explainNfc();
            else void pairTag();
          }}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.spareTitle')}</Text>
          <Badge
            label={state.spareTagId ? t('common.ok') : t('common.dash')}
            tone={state.spareTagId ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={[styles.rowHint, state.spareTagId ? styles.tagId : null]}>
          {state.spareTagId ? state.spareTagId : t('settings.spareHint')}
        </Text>
        <NfcNotice
          scope="spare"
          onRetry={() => {
            if (!nfcExplained) explainNfc();
            else void pairSpareTag();
          }}
        />
        <PrimaryButton
          muted
          label={state.spareTagId ? t('settings.spareChange') : t('settings.sparePair')}
          onPress={() => {
            if (!nfcExplained) explainNfc();
            else void pairSpareTag();
          }}
          onLongPress={__DEV__ ? () => void pairSpareTag('DEMO-SPARE') : undefined}
        />
        {__DEV__ && !state.spareTagId ? (
          <PrimaryButton muted label={t('settings.spareSimulate')} onPress={() => void pairSpareTag('DEMO-SPARE')} />
        ) : null}
        {state.spareTagId ? (
          <>
            <View style={{ height: 10 }} />
            <PrimaryButton
              muted
              danger
              label={t('settings.spareRemove')}
              disabled={state.strict && countKeys(state) < 3}
              onPress={() => void clearSpareTag()}
            />
            {state.strict && countKeys(state) < 3 ? (
              <Text style={styles.rowHint}>{t('settings.strictCantRemove')}</Text>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.phoneTitle')}</Text>
          <Badge
            label={state.mobileKeySecret ? t('settings.badgeActive') : t('common.dash')}
            tone={state.mobileKeySecret ? 'focus' : 'neutral'}
          />
        </View>
        <Text style={styles.rowHint}>{t('settings.phoneBody')}</Text>
        <PrimaryButton
          label={state.mobileKeySecret ? t('settings.phoneShow') : t('settings.phoneCreate')}
          onPress={() => router.push('/pair-key')}
        />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label={t('settings.phoneHolder')} onPress={() => router.push('/llave')} />
        <View style={{ height: 10 }} />
        <PrimaryButton muted label={t('settings.phoneClaim')} onPress={() => router.push('/claim-key')} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{t('settings.permissionsTitle')}</Text>
          <Badge
            label={ok ? t('settings.badgeReady') : t('settings.badgeMissing')}
            tone={ok ? 'focus' : 'danger'}
          />
        </View>
        <Text style={styles.rowHint}>
          {ok ? t('settings.permissionsReady') : t('permissions.reviewHint')}
        </Text>
        <PrimaryButton label={t('permissions.review')} onPress={() => router.push('/permissions')} />
      </Card>

      <Text style={styles.legal}>{t('settings.legal')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginBottom: 18,
  },
  title: {
    ...Type.displayL,
    color: Palette.ink,
  },
  sub: {
    ...Type.body,
    marginTop: 10,
    marginBottom: 8,
    color: Palette.muted,
  },
  card: {
    marginTop: 12,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    ...Type.labelBold,
    color: Palette.ink,
  },
  rowHint: {
    ...Type.body,
    color: Palette.muted,
    marginTop: 4,
  },
  tagId: {
    ...Type.mono,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    ...Type.labelBold,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Palette.ink,
    letterSpacing: 1,
    backgroundColor: Palette.bgElevated,
  },
  legal: {
    ...Type.caption,
    marginTop: 20,
    color: Palette.faintText,
    paddingBottom: 12,
  },
});
