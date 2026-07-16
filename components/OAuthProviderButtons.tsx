import { View, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';

/** Official multicolor Google "G" from Google Identity branding assets. */
const GOOGLE_G_LOGO = require('@/assets/brand/google-g.png');

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow - compact control (matches header squircle depth). */
function neumorphicLift3D(shadowColor: string): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
} {
  return {
    shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  };
}

/** Official multicolor Google "G" - SVG data URI for crisp scaling on web. */
const GOOGLE_LOGO_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-4.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`
  );

const APPLE_LOGO_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`
  );

const LOGO_SIZE = 24;
const ICON_BUTTON = 44;
const ICON_RADIUS = 14;

function accessibilityHint(primary?: string, secondary?: string): string {
  const parts = [primary, secondary].filter(Boolean) as string[];
  return parts.join('. ');
}

/** RN `Image` does not render SVG `data:` URIs on iOS/Android - use bundled official PNG there. */
function GoogleBrandMark() {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: GOOGLE_LOGO_URI }}
        style={styles.brandImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <Image
      source={GOOGLE_G_LOGO}
      style={styles.brandImage}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function AppleBrandMark() {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: APPLE_LOGO_URI }}
        style={styles.brandImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <Ionicons name="logo-apple" size={LOGO_SIZE} color="#000000" accessibilityIgnoresInvertColors />;
}

export type OAuthProviderButtonsProps = {
  onGooglePress: () => void;
  onApplePress: () => void;
  googlePrimaryLabel?: string;
  applePrimaryLabel?: string;
  googleSecondaryLabel?: string;
  appleSecondaryLabel?: string;
};

/**
 * Icon-only OAuth entry points (Google / Apple). Labels are used for accessibility only.
 * Visual: brand squircle raised tiles (`docs/BRAND_GUIDELINES.md`).
 */
export function OAuthProviderButtons({
  onGooglePress,
  onApplePress,
  googlePrimaryLabel = 'Continue with Google',
  applePrimaryLabel = 'Continue with Apple',
  googleSecondaryLabel,
  appleSecondaryLabel,
}: OAuthProviderButtonsProps) {
  const surface = T.colors.surface;
  const shadowHex = T.colors.shadowStrong;
  const darkModeFlatTop = useDarkModeFlatTop();

  return (
    <View style={styles.row} accessibilityRole="toolbar">
      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          styles.plasticFace,
          darkModeFlatTop,
          {
            backgroundColor: surface,
            opacity: pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
          },
          neumorphicLift3D(shadowHex),
        ]}
        onPress={onGooglePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityHint(googlePrimaryLabel, googleSecondaryLabel)}
      >
        <GoogleBrandMark />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          styles.plasticFace,
          darkModeFlatTop,
          {
            backgroundColor: surface,
            opacity: pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
          },
          neumorphicLift3D(shadowHex),
        ]}
        onPress={onApplePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityHint(applePrimaryLabel, appleSecondaryLabel)}
      >
        <AppleBrandMark />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  iconButton: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    borderRadius: ICON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
