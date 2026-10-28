import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

type Plane = {
  width: number;
  height: number;
  style: { width: string; height: string; imageRendering: string };
  getContext: (kind: '2d') => {
    imageSmoothingEnabled: boolean;
    createImageData: (w: number, h: number) => { data: Uint8ClampedArray };
    putImageData: (image: { data: Uint8ClampedArray }, x: number, y: number) => void;
  } | null;
};

type Props = {
  rgba: Uint8Array;
  size: number;
  width: number;
  height: number;
};

/** Web draws the same pixels with smoothing off, so the preview stays crisp. */
export function PixelSprite({ rgba, size, width, height }: Props) {
  const ref = useRef<Plane | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const image = ctx.createImageData(size, size);
    image.data.set(rgba);
    ctx.putImageData(image, 0, 0);
  }, [rgba, size]);

  return (
    <View style={{ width, height }} pointerEvents="none">
      {createElement('canvas', {
        ref,
        style: { width, height, imageRendering: 'pixelated' },
      })}
    </View>
  );
}
