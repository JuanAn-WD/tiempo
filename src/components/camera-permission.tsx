import { useCameraPermissions } from 'expo-camera';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { PermissionExplainer } from '@/components/permission-explainer';
import { Screen } from '@/components/screen';
import { BrandMark } from '@/components/ui';
import { useI18n } from '@/i18n';
import { openPermissionSettings } from '@/lib/permission-actions';
import { outcomeFromPrompt } from '@/lib/permission-flow';

type Props = {
  onCancel: () => void;
  children: ReactNode;
};

/**
 * Shows the camera explanation and only then asks.
 * A denial stays on this screen, with a link to system settings.
 */
export function CameraPermissionGate({ onCancel, children }: Props) {
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();

  if (permission?.granted) return children;

  const snapshot = permission
    ? outcomeFromPrompt(permission.granted, permission.canAskAgain, permission.status)
    : { outcome: 'undetermined' as const, canAskAgain: true };

  return (
    <Screen tabPadding={false} scroll>
      <BrandMark />
      <View style={{ flex: 1, marginTop: 18 }}>
        <PermissionExplainer
          id="camera"
          outcome={snapshot.outcome}
          canAskAgain={snapshot.canAskAgain}
          onRequest={() => {
            void requestPermission();
          }}
          onOpenSettings={() => {
            void openPermissionSettings('camera');
          }}
          onContinue={onCancel}
          onSkip={onCancel}
          skipLabel={t('common.cancel')}
        />
      </View>
    </Screen>
  );
}
