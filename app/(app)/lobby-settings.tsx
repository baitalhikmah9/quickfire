import { Platform, View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONTS,
  LAYOUT,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
} from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

export default function LobbySettingsModal() {
  const router = useRouter();
  const { t } = useI18n();
  const handleClose = () => goBackOrReplace(router, '/(app)/');

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View
        style={[
          styles.header,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          {
            backgroundColor: surface,
            borderRadius: 14,
            marginHorizontal: LAYOUT.screenGutter,
            marginTop: getStandardChromeTopPadding(Platform.OS === 'web'),
          },
        ]}
      >
        <View style={styles.headerSpacer} />
        <Text style={[styles.title, { color: textPrimary }]}>LOBBY SETTINGS</Text>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.closeText, { color: textPrimary }]}>CLOSE</Text>
        </Pressable>
      </View>
      <View style={[styles.content, { paddingHorizontal: LAYOUT.screenGutter }]}>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          Team setup, player names, mode config, and category selection. Full lobby builder coming in
          Phase 3.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.placeholderButton,
            SOFT_SURFACE_FACE,
            softSurfaceLift(),
            { backgroundColor: surface },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleClose}
        >
          <Text style={[styles.placeholderButtonText, { color: textPrimary }]}>START GAME (PLACEHOLDER)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingHorizontal: LAYOUT.screenGutter,
    height: 64,
  },
  headerSpacer: {
    width: 60,
  },
  closeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  closeText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: 0.8,
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.xl,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  placeholderButton: {
    paddingVertical: SPACING.lg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  placeholderButtonText: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 1,
  },
});
