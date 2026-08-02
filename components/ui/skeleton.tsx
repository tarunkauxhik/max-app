import { View, type DimensionValue } from 'react-native';

import { Radii } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type SkeletonProps = {
  height?: number;
  width?: DimensionValue;
  radius?: number;
};

/**
 * Static placeholder block. No shimmer: an animation that never stops is
 * exactly the kind of motion the design rules ask us to avoid, and it buys
 * nothing over a plain neutral block.
 *
 * Always render these inside a container marked `accessible` with its own
 * label, so a screen reader announces the loading state once instead of
 * walking a pile of empty views.
 */
export function Skeleton({ height = 16, width = '100%', radius = Radii.sm }: SkeletonProps) {
  const colors = useTheme();

  return <View style={{ height, width, borderRadius: radius, backgroundColor: colors.track }} />;
}
