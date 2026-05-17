import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const BACKFIRE_TITLE_LOGO = require('../assets/BF in game logo.png');
const BACKFIRE_TITLE_LOGO_ASPECT_RATIO = 1536 / 1024;

type BackfireTitleLogoProps = {
  width: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function BackfireTitleLogo({
  width,
  testID,
  containerStyle,
  accessibilityLabel = 'Backfire',
}: BackfireTitleLogoProps) {
  return (
    <View style={containerStyle}>
      <Image
        source={BACKFIRE_TITLE_LOGO}
        style={[styles.logo, { width }]}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    aspectRatio: BACKFIRE_TITLE_LOGO_ASPECT_RATIO,
    maxWidth: '100%',
  },
});
