import { Palette, type ThemeColors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Resolves the MAX semantic colour tokens for the active system theme. */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme() ?? 'light';
  return Palette[scheme];
}
