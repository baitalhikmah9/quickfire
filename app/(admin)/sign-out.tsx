import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { FONTS, LAYOUT, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';

const T = HOME_SOFT_UI;

export default function AdminSignOutScreen() {
  const { isLoaded, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const darkModeFlatTop = useDarkModeFlatTop();

  const canvas = T.colors.canvas;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)/" />;
  }

  if (!isLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: canvas }]}>
        <ActivityIndicator size="large" color={textPrimary} />
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: canvas }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: textMuted }]}>ADMIN</Text>
          <Text style={[styles.title, { color: textPrimary }]}>Sign out</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            You will need to sign in again to open the operations dashboard.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleSignOut()}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out of admin"
            style={({ pressed }) => [
              styles.submitButton,
              styles.plasticFace,
              darkModeFlatTop,
              {
                opacity: isSigningOut ? 0.65 : pressed ? 0.9 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>SIGN OUT</Text>
            )}
          </Pressable>

          <Link href="/admin" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to admin overview"
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  opacity: pressed ? 0.88 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Text style={[styles.secondaryText, { color: textMuted }]}>BACK TO DASHBOARD</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
    maxWidth: LAYOUT.contentMaxWidth + LAYOUT.screenGutter * 2,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    gap: SPACING.sm,
  },
  kicker: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: SPACING.md,
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  plasticFace: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  submitText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
