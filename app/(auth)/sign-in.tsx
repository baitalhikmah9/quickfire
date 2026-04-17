import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, FONTS, LAYOUT } from '@/constants';
import { OAuthProviderButtons } from '@/components/OAuthProviderButtons';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { useClerkOAuthFlow } from '@/lib/hooks/useClerkOAuthFlow';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 1, r: 28, el: 18 }
      : tier === 'header'
      ? { h: 8, op: 0.9, r: 18, el: 12 }
      : { h: 6, op: 0.8, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { direction, t } = useI18n();
  const { busy, signInWithOAuthStrategy } = useClerkOAuthFlow();

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

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
            {t('auth.signIn.heroTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            {t('auth.signIn.heroSubtitle')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>
            {t('auth.signIn.chooseMethod').toUpperCase()}
          </Text>

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator size="large" color={textPrimary} />
            </View>
          ) : (
            <OAuthProviderButtons
              onGooglePress={() => void signInWithOAuthStrategy('oauth_google')}
              onApplePress={() => void signInWithOAuthStrategy('oauth_apple')}
              googlePrimaryLabel={t('auth.signIn.google')}
              googleSecondaryLabel={t('auth.signIn.googleDescription')}
              applePrimaryLabel={t('auth.signIn.apple')}
              appleSecondaryLabel={t('auth.signIn.appleDescription')}
            />
          )}
        </View>

        <View style={styles.links}>
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.linkText, { color: textPrimary }]}>
              {t('auth.forgot.title').toUpperCase()}
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: textMuted }]}>
              {t('auth.signIn.needAccount')}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
              <Text style={[styles.footerLink, { color: textPrimary }]}>
                {t('auth.signIn.goSignUp').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.legal, { color: textMuted }]}>
          {t('auth.termsPrefix')} {t('auth.terms')} {t('auth.and')} {t('auth.privacy')}.
        </Text>
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
    gap: SPACING.lg,
  },
  sectionLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  busy: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    opacity: 0.7,
  },
  footerLink: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 1,
  },
  legal: {
    marginTop: SPACING.xl,
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.5,
  },
});
