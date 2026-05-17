import { View, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow — compact control (matches header squircle depth). */
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

/** Multicolor Google “G” — `data:` SVG for web only; native uses `Ionicons` (RN `Image` cannot decode SVG data URIs). */
const GOOGLE_LOGO_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.42 32.658 29.122 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.119 0-9.59-3.368-11.164-8.082l-6.563 5.233C9.176 39.86 16.007 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>`
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

/** RN `Image` does not render SVG `data:` URIs on iOS/Android — use vector marks there. */
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
  return <Ionicons name="logo-google" size={LOGO_SIZE} color="#4285F4" accessibilityIgnoresInvertColors />;
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

  return (
    <View style={styles.row} accessibilityRole="toolbar">
      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          styles.plasticFace,
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
