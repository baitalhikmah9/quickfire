import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { SPACING, BORDER_RADIUS } from '@/constants';
import { TYPE_SCALE, SHADOWS } from '@/constants/theme';

/** Multicolor Google “G” — raster-free, works on web and native */
const GOOGLE_LOGO_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.42 32.658 29.122 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.119 0-9.59-3.368-11.164-8.082l-6.563 5.233C9.176 39.86 16.007 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>`
  );

const APPLE_LOGO_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`
  );

const LOGO_SIZE = 24;
const ICON_SLOT = 44;

export type OAuthProviderButtonsProps = {
  onGooglePress: () => void;
  onApplePress: () => void;
  googlePrimaryLabel?: string;
  applePrimaryLabel?: string;
  googleSecondaryLabel?: string;
  appleSecondaryLabel?: string;
};

export function OAuthProviderButtons({
  onGooglePress,
  onApplePress,
  googlePrimaryLabel = 'Continue with Google',
  applePrimaryLabel = 'Continue with Apple',
  googleSecondaryLabel,
  appleSecondaryLabel,
}: OAuthProviderButtonsProps) {
  return (
    <View style={styles.stack}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.googleButton,
          pressed && styles.pressed,
        ]}
        onPress={onGooglePress}
        android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
      >
        <View style={styles.row}>
          <View style={[styles.iconSlot, styles.googleIconSlot]}>
            <Image
              source={{ uri: GOOGLE_LOGO_URI }}
              style={styles.brandImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.primaryLabel}>{googlePrimaryLabel}</Text>
            {googleSecondaryLabel ? (
              <Text style={styles.secondaryLabel}>{googleSecondaryLabel}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.appleButton,
          pressed && styles.pressed,
        ]}
        onPress={onApplePress}
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <View style={styles.row}>
          <View style={[styles.iconSlot, styles.appleIconSlot]}>
            <Image
              source={{ uri: APPLE_LOGO_URI }}
              style={styles.brandImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.primaryLabel}>{applePrimaryLabel}</Text>
            {appleSecondaryLabel ? (
              <Text style={styles.secondaryLabel}>{appleSecondaryLabel}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.md,
  },
  button: {
    borderRadius: BORDER_RADIUS.pill,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: SHADOWS.card.shadowColor,
        shadowOffset: SHADOWS.card.shadowOffset,
        shadowOpacity: SHADOWS.card.shadowOpacity * 1.1,
        shadowRadius: SHADOWS.card.shadowRadius,
      },
      android: { elevation: SHADOWS.card.elevation },
      default: {},
    }),
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  pressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    minHeight: 56,
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    borderRadius: ICON_SLOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  googleIconSlot: {
    backgroundColor: '#FFFFFF',
  },
  appleIconSlot: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  brandImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  textBlock: {
    flex: 1,
  },
  primaryLabel: {
    ...TYPE_SCALE.bodyL,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryLabel: {
    ...TYPE_SCALE.bodyS,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
});
