import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/hooks/useTheme';

function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type HorizontalPlayEdgeBlursProps = {
  /** Fade band width — keep modest so the edge read is atmospheric, not a UI block. */
  stripWidth: number;
};

/**
 * Soft horizontal vignette into `colors.background`. Does not use backdrop blur — blur views
 * sample the saturated board (primary blue) and read as an obvious colored slab.
 */
export function HorizontalPlayEdgeBlurs({ stripWidth }: HorizontalPlayEdgeBlursProps) {
  const colors = useTheme();
  const bg = colors.background as string;

  const a = (x: number) => hexToRgba(bg, x);

  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[a(0.72), a(0.28), a(0.08), a(0)]}
        locations={[0, 0.4, 0.78, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.strip, { left: 0, width: stripWidth }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[a(0), a(0.08), a(0.28), a(0.72)]}
        locations={[0, 0.22, 0.6, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.strip, { right: 0, width: stripWidth }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
});
