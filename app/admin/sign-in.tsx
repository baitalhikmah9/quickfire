import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useSignIn } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FONTS, LAYOUT, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

export default function AdminSignInScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const {
    isLoaded: isSignInLoaded,
    signIn,
    setActive,
  } = useSignIn();
  /** Only when Clerk reports a session — avoids querying Convex as a signed-out user after signOut. */
  const shouldLoadProfile = Platform.OS === 'web' && isLoaded && isSignedIn;
  const userProfile = useQuery(
    api.users.getCurrentProfile,
    shouldLoadProfile ? {} : 'skip'
  );
  const passwordSignInPreflight = useMutation(api.adminSignIn.passwordSignInPreflight);
  const passwordSignInRecordFailure = useMutation(api.adminSignIn.passwordSignInRecordFailure);
  const passwordSignInClearFailures = useMutation(api.adminSignIn.passwordSignInClearFailures);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)/" />;
  }

  if (!isLoaded || !isSignInLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: canvas }]}>
        <ActivityIndicator size="large" color={textPrimary} />
      </View>
    );
  }

  if (isSignedIn) {
    if (userProfile === undefined) {
      return (
        <View style={[styles.center, { backgroundColor: canvas }]}>
          <ActivityIndicator size="large" color={textPrimary} />
        </View>
      );
    }
    if (userProfile?.role === 'admin') {
      return <Redirect href="/admin" />;
    }

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>ADMIN ACCESS</Text>
            <Text style={[styles.title, { color: textPrimary }]}>Switch account</Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>
              {userProfile === null
                ? 'No Backfire profile was found for this session. Sign out and sign in with an authorized admin account.'
                : 'This signed-in account does not have admin permissions. Sign out to use a different account.'}
            </Text>
          </View>
          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              styles.plasticFace,
              {
                opacity: pressed ? 0.9 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
              },
            ]}
          >
            <Text style={styles.submitText}>SIGN OUT</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleSignIn = async () => {
    setError('');
    const identifier = username.trim();
    if (!identifier || !password) {
      setError('Enter your username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const gate = await passwordSignInPreflight({ identifier });
      if (!gate.allowed) {
        const minutes = Math.max(1, Math.ceil((gate.retryAfterMs ?? 0) / 60_000));
        setError(
          `Too many sign-in attempts for this account. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
        );
        return;
      }

      try {
        const result = await signIn.create({ identifier, password });
        if (result.status === 'complete' && result.createdSessionId) {
          await passwordSignInClearFailures({ identifier });
          await setActive({ session: result.createdSessionId });
          return;
        }
        setError('Additional verification is required for this account.');
      } catch (e) {
        try {
          await passwordSignInRecordFailure({ identifier });
        } catch {
          // ignore duplicate-rate-limit errors; surface Clerk message
        }
        const message = e instanceof Error ? e.message : 'Invalid username or password.';
        setError(message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not verify sign-in limits.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>ADMIN ACCESS</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: textMuted }]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              style={[
                styles.input,
                styles.plasticFace,
                {
                  backgroundColor: surface,
                  color: textPrimary,
                  shadowColor: shadowHex,
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textMuted }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              secureTextEntry
              onSubmitEditing={() => void handleSignIn()}
              style={[
                styles.input,
                styles.plasticFace,
                {
                  backgroundColor: surface,
                  color: textPrimary,
                  shadowColor: shadowHex,
                },
              ]}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => void handleSignIn()}
            disabled={isSubmitting}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              styles.plasticFace,
              {
                opacity: isSubmitting ? 0.65 : pressed ? 0.9 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>SIGN IN</Text>
            )}
          </Pressable>
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
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.5,
    color: '#000000',
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
  form: {
    gap: SPACING.lg,
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.ui,
    fontSize: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  error: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: '#DC2626',
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  submitText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#FFFFFF',
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
  },
});
