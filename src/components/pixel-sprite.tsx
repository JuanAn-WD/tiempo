import { AlphaType, Canvas, ColorType, FilterMode, Image, MipmapMode, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

type Props = {
  rgba: Uint8Array;
  size: number;
  width: number;
  height: number;
};

/**
 * Draws a 64×64 sprite scaled up with nearest-neighbor sampling.
 * `makeImageFromView` is intentionally unused: that path breaks on the
 * React Native 0.86 build shipped with Expo SDK 57.
 */
export function PixelSprite({ rgba, size, width, height }: Props) {
  const image = useMemo(() => {
    const data = Skia.Data.fromBytes(rgba);
    return Skia.Image.MakeImage(
      {
        width: size,
        height: size,
        alphaType: AlphaType.Unpremul,
        colorType: ColorType.RGBA_8888,
      },
      data,
      size * 4,
    );
  }, [rgba, size]);

  if (!image) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Image image={image} x={0} y={0} width={width} height={height} fit="fill" sampling={NEAREST} />
    </Canvas>
  );
}
