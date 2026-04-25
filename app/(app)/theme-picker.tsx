import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  SPACING,
  BORDER_RADIUS,
  PALETTES,
  FONTS,
  type ThemePaletteId,
} from '@/constants';
import { useThemePicker } from '@/lib/hooks/useTheme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const ALL_PALETTES: ThemePaletteId[] = ['default', 'warm', 'cool', 'green', 'red', 'dark'];

function neumorphicLift3D(shadowColor: string, tier: 'header' | 'card'): any {
  const m = tier === 'header' ? { h: 6, op: 1, r: 0, el: 8 } : { h: 8, op: 1, r: 0, el: 10 };
  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

export default function ThemePickerModal() {
  const router = useRouter();
  const { paletteId, setPalette } = useThemePicker();
  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/profile');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            styles.plasticFace,
            {
              backgroundColor: surface,
              opacity: pressed ? 0.94 : 1,
              transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
            },
            neumorphicLift3D(shadowHex, 'header'),
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: textPrimary }]}>THEME</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: textMuted }]}>Choose a color palette</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paletteGrid}>
          {ALL_PALETTES.map((id) => {
            const p = PALETTES[id];
            const isSelected = id === paletteId;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.paletteCard,
                  styles.plasticFace,
                  { backgroundColor: surface, opacity: pressed ? 0.94 : 1 },
                  neumorphicLift3D(shadowHex, 'card'),
                  isSelected && styles.paletteCardSelected,
                ]}
                onPress={() => {
                  setPalette(id);
                  handleBack();
                }}
              >
                <View style={styles.palettePreview}>
                  <View style={[styles.swatch, { backgroundColor: p.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: p.background }]} />
                  <View style={[styles.swatch, { backgroundColor: p.success }]} />
                </View>
                <View style={styles.labelBlock}>
                  <Text style={[styles.paletteName, { color: textPrimary }]}>
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </Text>
                  <Text style={[styles.paletteMeta, { color: textMuted }]}>
                    {isSelected ? 'Active palette' : 'Tap to apply'}
                  </Text>
                </View>
                {isSelected ? <Ionicons name="checkmark-circle" size={22} color={textPrimary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 72,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.ui,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: 24,
    width: 300,
    flexShrink: 1,
    flexGrow: 1,
    maxWidth: 360,
  },
  paletteCardSelected: {
    borderWidth: 1.5,
    borderColor: 'rgba(51, 51, 51, 0.18)',
  },
  palettePreview: {
    flexDirection: 'row',
    gap: 6,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
  },
  labelBlock: {
    flex: 1,
  },
  paletteName: {
    fontSize: 16,
    fontFamily: FONTS.uiSemibold,
  },
  paletteMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.ui,
    opacity: 0.7,
  },
});
