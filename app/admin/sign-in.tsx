import { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { OAuthProviderButtons } from '@/components/OAuthProviderButtons';
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { useClerkOAuthFlow } from '@/lib/hooks/useClerkOAuthFlow';

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function AdminSignInScreen() {
  useWarmUpBrowser();
  const { isLoaded, isSignedIn } = useAuth();
  const { busy, signInWithOAuthStrategy } = useClerkOAuthFlow('/admin');

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/admin" />;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.kicker}>ADMIN ACCESS</Text>
          <Text style={styles.title}>Sign in to QuickFire operations</Text>
          <Text style={styles.subtitle}>
            Use an authorized Clerk account. Admin permissions are verified again by Convex
            before dashboard data or token actions are available.
          </Text>
        </View>

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <OAuthProviderButtons
            onGooglePress={() => void signInWithOAuthStrategy('oauth_google')}
            onApplePress={() => void signInWithOAuthStrategy('oauth_apple')}
            googlePrimaryLabel="Continue with Google"
            googleSecondaryLabel="Use your operator account"
            applePrimaryLabel="Continue with Apple"
            appleSecondaryLabel="Available for approved admin accounts"
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
  },
  header: {
    gap: SPACING.sm,
  },
  kicker: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: COLORS.primary,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.mutedText,
  },
  busy: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
