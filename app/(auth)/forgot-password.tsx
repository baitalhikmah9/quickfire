import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn } from '@clerk/clerk-expo';
import {
  SPACING,
  FONTS,
  LAYOUT,
  COLORS,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
} from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { direction, t } = useI18n();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const darkModeFlatTop = useDarkModeFlatTop();

  const handleSubmit = async () => {
    if (!email.trim()) return;
    if (!isLoaded || !signIn) {
      setError('Authentication provider not ready.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const signInAttempt = await signIn.create({ identifier: email.trim() });
      const resetFactor = signInAttempt.supportedFirstFactors?.find(
        (f) => f.strategy === 'reset_password_email_code'
      );
      if (!resetFactor) {
        setError('Password reset is not available for this account.');
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code' as const,
        emailAddressId: (resetFactor as { emailAddressId: string }).emailAddressId,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !password) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isLoaded || !signIn) {
      setError('Authentication provider not ready.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code' as const,
        code: code.trim(),
      });
      const result = await signIn.resetPassword({ password });
      if (result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      }
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Pressable
            onPress={() => goBackOrReplace(router, '/(auth)/sign-in')}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={({ pressed }) => [
              styles.headerSquircleInner,
              styles.backEdge,
              direction === 'rtl' ? styles.backEdgeEnd : styles.backEdgeStart,
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

          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>
              {t('auth.forgot.title')}
            </Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>
              {completed ? 'Your password has been updated.' : t('auth.forgot.subtitle')}
            </Text>
          </View>
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
            {error ? (
              <Text style={[styles.errorText, { marginTop: SPACING.sm }]}>{error}</Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                SOFT_SURFACE_FACE,
                darkModeFlatTop,
                softSurfaceLift(),
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                  marginTop: SPACING.md,
                },
                (!email || sending) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!email || sending}
            >
              <Text style={[styles.primaryCtaLabel, { color: textPrimary }]}>
                {sending ? 'SENDING...' : t('auth.forgot.sendReset').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        ) : completed ? (
          <View style={[styles.successCard, SOFT_SURFACE_FACE, darkModeFlatTop, { backgroundColor: surface }, softSurfaceLift()]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={textPrimary} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.successText, { color: textPrimary }]}>Password reset complete.</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.successText, { color: textMuted }]}>Enter the code sent to {email.trim()} and choose a new password.</Text>
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(0,0,0,0.03)', color: textPrimary }]}
              value={code}
              placeholder="Reset code"
              placeholderTextColor={textMuted}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(0,0,0,0.03)', color: textPrimary }]}
              value={password}
              placeholder="New password"
              placeholderTextColor={textMuted}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(0,0,0,0.03)', color: textPrimary }]}
              value={confirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={textMuted}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                SOFT_SURFACE_FACE,
                darkModeFlatTop,
                softSurfaceLift(),
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
                (!code || !password || !confirmPassword || sending) && { opacity: 0.5 },
              ]}
              onPress={handleResetPassword}
              disabled={!code || !password || !confirmPassword || sending}
            >
              <Text style={[styles.primaryCtaLabel, { color: textPrimary }]}> 
                {sending ? 'RESETTING...' : 'RESET PASSWORD'}
              </Text>
            </Pressable>
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingTop: getStandardChromeTopPadding(Platform.OS === 'web'),
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  heroBlock: {
    width: '100%',
    position: 'relative',
  },
  backEdge: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  backEdgeStart: {
    left: 0,
  },
  backEdgeEnd: {
    right: 0,
  },
  headerSquircleInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: SPACING.xs,
    // Keep title clear of the absolute edge back control.
    paddingHorizontal: 52,
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
    borderRadius: 14,
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
  errorText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
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
