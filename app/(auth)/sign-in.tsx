import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES } from '@/constants';
import { OAuthProviderButtons } from '@/components/OAuthProviderButtons';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { useClerkOAuthFlow } from '@/lib/hooks/useClerkOAuthFlow';

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
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const { busy, signInWithOAuthStrategy } = useClerkOAuthFlow();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textOnBackground }, getTextStyle()]}>
            ← {t('common.back')}
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            { color: colors.textOnBackground },
            getTextStyle(undefined, 'display', 'start'),
          ]}
        >
          {t('auth.signIn.heroTitle')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondaryOnBackground },
            getTextStyle(),
          ]}
        >
          {t('auth.signIn.heroSubtitle')}
        </Text>

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textOnBackground },
            getTextStyle(undefined, 'bodySemibold', 'start'),
          ]}
        >
          {t('auth.signIn.chooseMethod')}
        </Text>

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color={colors.primary} />
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

        <Pressable
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text
            style={[
              styles.linkText,
              { color: colors.primary },
              getTextStyle(undefined, 'bodySemibold', 'start'),
            ]}
          >
            {t('auth.forgot.title')}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[{ color: colors.textSecondaryOnBackground }, getTextStyle()]}>
            {t('auth.signIn.needAccount')}{' '}
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={[{ color: colors.primary }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
              {t('auth.signIn.goSignUp')}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.legal, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'center')]}>
          {t('auth.termsPrefix')} {t('auth.terms')} {t('auth.and')} {t('auth.privacy')}.
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
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  backButton: {
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
  },
  busy: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.75,
  },
  linkText: {
    fontSize: FONT_SIZES.md,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  legal: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
