import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Palette } from '@/constants/theme';

/** Older builds opened this modal. The tree screen plays the ending now. */
export default function SessionDone() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/progreso');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: Palette.bg }} />;
}
