import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { getBootScreenBackground } from '@/lib/bootScreen';
import { getBackfireTitleLogoWidth } from '@/lib/layout/backfireTitleLogoWidth';

/** Centered BackFire wordmark while auth and stores hydrate — matches home header logo sizing. */
export function BootScreen() {
  const scheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const logoWidth = getBackfireTitleLogoWidth(width, height);

  return (
    <View
      testID="boot-screen"
      style={[styles.root, { backgroundColor: getBootScreenBackground(scheme) }]}
    >
      <BackfireTitleLogo width={logoWidth} testID="boot-screen-logo" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
