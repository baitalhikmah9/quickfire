import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    // TODO: Wire to Clerk's password reset flow when available in Expo
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
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
          {t('auth.forgot.title')}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondaryOnBackground },
            getTextStyle(),
          ]}
        >
          {t('auth.forgot.subtitle')}
        </Text>

        {!submitted ? (
          <>
            <Text
              style={[
                styles.label,
                { color: colors.textOnBackground },
                getTextStyle(undefined, 'bodySemibold', 'start'),
              ]}
            >
              {t('auth.forgot.emailLabel')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                },
              ]}
              autoCapitalize="none"
              value={email}
              placeholder={t('auth.forgot.emailPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary },
                (!email && styles.buttonDisabled) as object,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!email}
            >
              <Text style={[styles.buttonText, getTextStyle(undefined, 'bodySemibold', 'center')]}>
                {t('auth.forgot.sendReset')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text
            style={[
              styles.successText,
              { color: colors.textSecondaryOnBackground },
              getTextStyle(),
            ]}
          >
            {t('auth.forgot.success')}
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text
            style={[
              styles.linkText,
              { color: colors.textOnBackground },
              getTextStyle(undefined, 'bodySemibold', 'start'),
            ]}
          >
            {t('auth.forgot.backToSignIn')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
    gap: 12,
  },
  backButton: {
    marginBottom: SPACING.sm,
  },
  backText: {
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },
  label: {
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 12,
    marginTop: 24,
  },
  linkText: {
    fontWeight: '600',
  },
  successText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },
});
