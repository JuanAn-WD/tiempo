import type { RefObject } from 'react';
import { Share, type View } from 'react-native';

/** Capture the card and open the system share sheet. Text is the fallback. */
export async function shareProgressImage(
  ref: RefObject<View | null>,
  fallbackMessage: string,
  dialogTitle: string,
): Promise<void> {
  try {
    if (!ref.current) {
      await Share.share({ message: fallbackMessage });
      return;
    }
    const Sharing = await import('expo-sharing');
    const { captureRef } = await import('react-native-view-shot');
    if (!(await Sharing.isAvailableAsync())) {
      await Share.share({ message: fallbackMessage });
      return;
    }
    const uri = await captureRef(ref, {
      result: 'tmpfile',
      format: 'png',
      quality: 1,
      useRenderInContext: true,
    });
    const url = uri.startsWith('file://') || uri.startsWith('data:') ? uri : `file://${uri}`;
    await Sharing.shareAsync(url, {
      mimeType: 'image/png',
      dialogTitle,
      UTI: 'public.png',
    });
  } catch {
    try {
      await Share.share({ message: fallbackMessage });
    } catch {
      /* the sheet was dismissed */
    }
  }
}
