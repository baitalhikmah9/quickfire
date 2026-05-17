import React, { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { AuthCard, AuthCardHeader, AuthField, AuthSubmitButton } from '@/components/auth/AuthCard';
import { clerkErrorMessage } from '@/lib/auth/clerkErrorMessage';
import { useI18n } from '@/lib/i18n/useI18n';
import { SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

type Phase = 'collect' | 'verify';

export type AuthEmailSignUpFormProps = {
  /** Shown only on the “create account” step (e.g. divider + OAuth). */
  renderCollectFooter?: () => ReactNode;
};

export function AuthEmailSignUpForm({ renderCollectFooter }: AuthEmailSignUpFormProps) {
  const { t } = useI18n();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [phase, setPhase] = useState<Phase>('collect');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const textDanger = '#DC2626';

  const startSignUp = useCallback(async () => {
    setError('');
    const addr = email.trim();
    const given = firstName.trim();
    const family = lastName.trim();
    if (!given || !family || !addr || !password) {
      setError(t('auth.emailPassword.missingSignUpFields'));
      return;
    }
    if (!isLoaded || !signUp) return;

    setSubmitting(true);
    try {
      const created = await signUp.create({
        emailAddress: addr,
        password,
        firstName: given,
        lastName: family,
      });

      if (created.status === 'complete' && created.createdSessionId) {
        await setActive({ session: created.createdSessionId });
        return;
      }

      await created.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPhase('verify');
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [email, firstName, lastName, password, isLoaded, setActive, signUp, t]);

  const completeVerification = useCallback(async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t('auth.emailPassword.missingVerificationCode'));
      return;
    }
    if (!isLoaded || !signUp) return;

    setSubmitting(true);
    try {
      await signUp.attemptEmailAddressVerification({ code: trimmed });
      if (signUp.status === 'complete' && signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId });
        return;
      }
      setError(t('auth.emailPassword.additionalStepRequired'));
    } catch (e) {
      setError(clerkErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [code, isLoaded, setActive, signUp, t]);

  if (!isLoaded) {
    return null;
  }

  if (phase === 'verify') {
    return (
      <AuthCard>
        <AuthCardHeader
          title={t('auth.verifyEmailTitle')}
          description={t('auth.verifyEmailSubtitle', { email: email.trim() })}
        />
        <AuthField
          label={t('auth.verificationCode')}
          labelColor={T.colors.textMuted}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          onSubmitEditing={() => void completeVerification()}
        />
        {error ? (
          <Text style={[styles.error, { color: textDanger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <AuthSubmitButton
          label={t('auth.verifySubmit')}
          onPress={() => void completeVerification()}
          loading={submitting}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardHeader title={t('auth.signUp.heroTitle')} description={t('auth.signUp.heroSubtitle')} />
      <AuthField
        label={t('auth.firstName')}
        labelColor={T.colors.textMuted}
        value={firstName}
        onChangeText={setFirstName}
        placeholder={t('auth.firstNamePlaceholder')}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <AuthField
        label={t('auth.lastName')}
        labelColor={T.colors.textMuted}
        value={lastName}
        onChangeText={setLastName}
        placeholder={t('auth.lastNamePlaceholder')}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="family-name"
        textContentType="familyName"
      />
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
        placeholder={t('auth.passwordSignUpPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
      />
      <Text style={[styles.hint, { color: T.colors.textMuted }]}>{t('auth.passwordHint')}</Text>
      {error ? (
        <Text style={[styles.error, { color: textDanger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <AuthSubmitButton label={t('auth.signUp.submit')} onPress={() => void startSignUp()} loading={submitting} />
      {renderCollectFooter?.()}
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -SPACING.sm,
    opacity: 0.75,
  },
  error: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -SPACING.sm,
  },
});
