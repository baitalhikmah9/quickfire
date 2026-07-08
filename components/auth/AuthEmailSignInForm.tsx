import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { AuthField, AuthSubmitButton } from '@/components/auth/AuthCard';
import { clerkErrorMessage } from '@/lib/auth/clerkErrorMessage';
import { useI18n } from '@/lib/i18n/useI18n';
import { COLORS, SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Email + password fields (no outer card — parent composes `AuthCard`). */
export function AuthEmailSignInForm() {
  const { t } = useI18n();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const textDanger = COLORS.error;

  const onSubmit = useCallback(async () => {
    setError('');
    const identifier = email.trim();
    if (!identifier || !password) {
      setError(t('auth.emailPassword.missingFields'));
      return;
    }
    if (!isLoaded || !signIn) return;

    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      setError(t('auth.emailPassword.additionalStepRequired'));
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [email, password, isLoaded, setActive, signIn, t]);

  if (!isLoaded) {
    return null;
  }

  return (
    <View style={styles.stack}>
      <AuthField
        label={t('auth.email')}
        labelColor={T.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <AuthField
        label={t('auth.password')}
        labelColor={T.colors.textMuted}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={() => void onSubmit()}
      />
      {error ? (
        <Text style={[styles.error, { color: textDanger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <AuthSubmitButton label={t('auth.signIn.submit')} onPress={() => void onSubmit()} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.lg,
  },
  error: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -SPACING.sm,
  },
});
