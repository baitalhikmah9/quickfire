import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  SPACING,
  FONTS,
  LAYOUT,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
} from '@/constants';
import { OAuthProviderButtons } from '@/components/OAuthProviderButtons';
import { AuthOrDivider } from '@/components/auth/AuthCard';
import { AuthEmailSignUpForm } from '@/components/auth/AuthEmailSignUpForm';
import { useI18n } from '@/lib/i18n/useI18n';
import { useClerkOAuthFlow } from '@/lib/hooks/useClerkOAuthFlow';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

function useWarmUpBrowser() {
  useEffect(() => {
    /** `warmUpAsync` / `coolDownAsync` target native Custom Tabs (Android); not implemented on web. */
    if (Platform.OS === 'web') return undefined;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { direction, t } = useI18n();
  const { busy, signInWithOAuthStrategy } = useClerkOAuthFlow();
  const darkModeFlatTop = useDarkModeFlatTop();

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => goBackOrReplace(router, '/(app)/')}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [
            styles.headerSquircleInner,
            SOFT_SURFACE_FACE,
            darkModeFlatTop,
            softSurfaceLift(),
            {
              backgroundColor: surface,
              opacity: pressed ? 0.94 : 1,
              transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
            },
          ]}
        >
          <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
        </Pressable>

        <AuthEmailSignUpForm
          renderCollectFooter={() =>
            busy ? (
              <View style={styles.busy}>
                <ActivityIndicator size="large" color={textPrimary} />
              </View>
            ) : (
              <>
                <AuthOrDivider label={t('auth.continueWith')} />
                <OAuthProviderButtons
                  onGooglePress={() => void signInWithOAuthStrategy('oauth_google')}
                  onApplePress={() => void signInWithOAuthStrategy('oauth_apple')}
                  googlePrimaryLabel={t('auth.signIn.google')}
                  googleSecondaryLabel={t('auth.signUp.fastSecure')}
                  applePrimaryLabel={t('auth.signIn.apple')}
                  appleSecondaryLabel={t('auth.signUp.fastSecure')}
                />
              </>
            )
          }
        />

        <View style={styles.links}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: textMuted }]}>
              {t('auth.signUp.alreadyHaveAccount')}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={[styles.footerLink, { color: textPrimary }]}>
                {t('auth.signUp.signIn').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.legal, { color: textMuted }]}>
          {t('auth.termsPrefix')}{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.push('/terms')}
            style={[styles.legalLink, { color: textPrimary }]}
          >
            {t('auth.terms')}
          </Text>{' '}
          {t('auth.and')}{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            style={[styles.legalLink, { color: textPrimary }]}
          >
            {t('auth.privacy')}
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingTop: getStandardChromeTopPadding(Platform.OS === 'web'),
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  headerSquircleInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  busy: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  links: {
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
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
  legalLink: {
    fontFamily: FONTS.uiSemibold,
    textDecorationLine: 'underline',
    opacity: 1,
  },
});
