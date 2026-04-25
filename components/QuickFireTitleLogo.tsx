import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const QUICKFIRE_TITLE_LOGO = require('../assets/QF logo.png');
const QUICKFIRE_TITLE_LOGO_ASPECT_RATIO = 1574 / 355;

type QuickFireTitleLogoProps = {
  width: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function QuickFireTitleLogo({
  width,
  testID,
  containerStyle,
  accessibilityLabel = 'QuickFire',
}: QuickFireTitleLogoProps) {
  return (
    <View style={containerStyle}>
      <Image
        source={QUICKFIRE_TITLE_LOGO}
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
    aspectRatio: QUICKFIRE_TITLE_LOGO_ASPECT_RATIO,
    maxWidth: '100%',
  },
});
