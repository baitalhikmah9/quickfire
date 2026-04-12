import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  PALETTES,
  FONTS,
  type ThemePaletteId,
} from '@/constants';
import { useTheme, useThemePicker } from '@/lib/hooks/useTheme';

const ALL_PALETTES: ThemePaletteId[] = ['default', 'warm', 'cool', 'green', 'red', 'dark'];

export default function ThemePickerModal() {
  const router = useRouter();
  const colors = useTheme();
  const { paletteId, setPalette } = useThemePicker();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, flex: 1 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.textOnBackground }]}>Close</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textOnBackground }]}>Theme</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
          Choose a color palette
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.paletteRow}
        >
          {ALL_PALETTES.map((id) => {
            const p = PALETTES[id];
            const isSelected = id === paletteId;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.paletteCard,
                  { borderColor: p.primary, backgroundColor: colors.cardBackground },
                  isSelected && { borderWidth: 3 },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setPalette(id);
                  router.back();
                }}
              >
                <View style={styles.palettePreview}>
                  <View style={[styles.swatch, { backgroundColor: p.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: p.background }]} />
                  <View style={[styles.swatch, { backgroundColor: p.success }]} />
                </View>
                <Text style={[styles.paletteName, { color: colors.text }]}>
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </Text>
                {isSelected ? (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.uiMedium,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.displayBold,
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    minHeight: 0,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    width: 260,
    flexShrink: 0,
  },
  palettePreview: {
    flexDirection: 'row',
    gap: 4,
    marginRight: SPACING.md,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.md,
  },
  paletteName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.8,
  },
});
