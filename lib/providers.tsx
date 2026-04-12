import { ClerkProvider, ClerkLoaded, ClerkLoading, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useThemeHydration } from '@/lib/hooks/useTheme';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { useI18n } from '@/lib/i18n/useI18n';
import { useGameHydration } from '@/store/game';
import { usePlayHydration } from '@/store/play';
import { PALETTES } from '@/constants/theme';

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
      <>
        <ClerkLoading>
          <SafeAreaProvider>
            <View
              style={[
                clerkBootstrapStyles.fill,
                { backgroundColor: PALETTES.default.background },
              ]}
            >
              <ActivityIndicator size="large" />
            </View>
          </SafeAreaProvider>
        </ClerkLoading>
        <ClerkLoaded>
          <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
            <SafeAreaProvider>
              <AppHydration>{children}</AppHydration>
            </SafeAreaProvider>
          </ConvexProviderWithClerk>
        </ClerkLoaded>
      </>
    </ClerkProvider>
  );
}

function AppHydration({ children }: { children: React.ReactNode }) {
  useThemeHydration();
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

const clerkBootstrapStyles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
