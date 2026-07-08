import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeHydration } from '@/lib/hooks/useTheme';
import { useConvexUserProfileSync } from '@/lib/hooks/useConvexUserProfileSync';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { useI18n } from '@/lib/i18n/useI18n';
import { useGameHydration } from '@/store/game';
import { usePlayHydration } from '@/store/play';
import { useRevenueCatSync } from '@/lib/hooks/useRevenueCatSync';
import { useWalletSync } from '@/lib/hooks/useWalletSync';
import { markOnce } from '@/lib/startupTiming';
import { useEffect } from 'react';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ProvidersContent>{children}</ProvidersContent>
    </LocaleProvider>
  );
}

function ProvidersContent({ children }: { children: React.ReactNode }) {
  if (!publishableKey || !convexUrl) {
    return (
      <SafeAreaProvider>
        <SetupRequired />
      </SafeAreaProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
        <SafeAreaProvider>
          <AppHydration>{children}</AppHydration>
        </SafeAreaProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function AppHydration({ children }: { children: React.ReactNode }) {
  markOnce('providers mounted (Clerk/Convex initialized)');
  const { isLoaded } = useAuth();
  useEffect(() => {
    if (isLoaded) markOnce('clerk session resolved');
  }, [isLoaded]);
  useThemeHydration();
  useConvexUserProfileSync();
  useRevenueCatSync();
  useWalletSync();
  usePlayHydration();
  useGameHydration();
  return <>{children}</>;
}

function SetupRequired() {
  const { t, getTextStyle } = useI18n();

  return (
    <View style={setupStyles.container}>
      <Text style={[setupStyles.title, getTextStyle(undefined, 'bodySemibold', 'center')]}>
        {t('provider.setupRequired')}
      </Text>
      <Text style={[setupStyles.text, getTextStyle(undefined, 'body', 'center')]}>
        {t('provider.copyEnv')}
        {'\n\n'}
        • EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY{'\n'}
        • EXPO_PUBLIC_CONVEX_URL
      </Text>
      <Text style={[setupStyles.setupHint, getTextStyle(undefined, 'body', 'center')]}>
        {t('provider.enableConvex')}
        {'\n'}
        dashboard.clerk.com → Setup → Integrations → Convex
      </Text>
    </View>
  );
}

const setupStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
  },
  setupHint: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 16,
  },
});
