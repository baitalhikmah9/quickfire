import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS, FONTS, LAYOUT } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.14, r: 28, el: 18 }
      : tier === 'header'
      ? { h: 8, op: 0.12, r: 18, el: 12 }
      : { h: 6, op: 0.1, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { direction, t } = useI18n();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

  const handleSubmit = () => {
    // TODO: Wire to Clerk's password reset flow when available in Expo
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerSquircleInner,
            styles.plasticFace,
            {
              backgroundColor: surface,
              borderRadius: 99,
              opacity: pressed ? 0.94 : 1,
              transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
            },
            neumorphicLift3D(shadowHex, 'header'),
          ]}
        >
          <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            {t('auth.forgot.title')}
          </Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            {t('auth.forgot.subtitle')}
          </Text>
        </View>

        {!submitted ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textMuted }]}>
              {t('auth.forgot.emailLabel').toUpperCase()}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  color: textPrimary,
                },
              ]}
              autoCapitalize="none"
              value={email}
              placeholder={t('auth.forgot.emailPlaceholder')}
              placeholderTextColor={textMuted}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                styles.plasticFace,
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                  marginTop: SPACING.md,
                },
                neumorphicLift3D(shadowHex, 'pill'),
                !email && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!email}
            >
              <Text style={[styles.primaryCtaLabel, { color: textPrimary }]}>
                {t('auth.forgot.sendReset').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.successCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'hero')]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={textPrimary} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.successText, { color: textPrimary }]}>
              {t('auth.forgot.success')}
            </Text>
          </View>
        )}

        <View style={styles.links}>
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={[styles.linkText, { color: textPrimary }]}>
              {t('auth.forgot.backToSignIn').toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  headerSquircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  header: {
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 32,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },
  section: {
    gap: SPACING.md,
  },
  sectionLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  input: {
    height: 64,
    borderRadius: 32,
    paddingHorizontal: SPACING.xl,
    fontFamily: FONTS.uiBold,
    fontSize: 16,
  },
  primaryCta: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  successCard: {
    borderRadius: 42,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  successText: {
    fontFamily: FONTS.ui,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  links: {
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  linkButton: {
    paddingVertical: SPACING.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  linkText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 1,
  },
});
