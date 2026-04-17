import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, type ViewStyle, Dimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;
const { width } = Dimensions.get('window');
const GRID_PADDING = SPACING.md;
const GRID_GAP = SPACING.md;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface CategoryCardProps {
    title: string;
    illustration?: any;
    flag?: any;
    onPress?: () => void;
    onInfoPress?: () => void;
    isSelected?: boolean;
    style?: ViewStyle;
}

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
      ? { h: 6, r: 0, el: 8 }
      : tier === 'card'
      ? { h: 8, r: 0, el: 10 }
      : { h: 4, r: 0, el: 4 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export function CategoryCard({
    title,
    illustration,
    flag,
    onPress,
    onInfoPress,
    isSelected,
    style,
}: CategoryCardProps) {
    const surface = T.colors.surface;
    const textPrimary = T.colors.textPrimary;
    const shadowHex = T.colors.shadowStrong;

    return (
        <View style={[styles.cardWrapper, style]}>
            {isSelected && <View style={styles.selectionGlow} />}
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    styles.plasticFace,
                    {
                        backgroundColor: surface,
                        opacity: pressed ? 0.96 : 1,
                        transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    },
                    neumorphicLift3D(shadowHex, 'card'),
                ]}
            >
                <View style={styles.contentContainer}>
                    {/* Info Icon */}
                    <Pressable
                        onPress={onInfoPress}
                        style={({ pressed }) => [
                            styles.infoIcon,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Ionicons name="information-circle-outline" size={20} color={textPrimary} />
                    </Pressable>

                    {/* Illustration Area */}
                    <View style={styles.illustrationContainer}>
                        {illustration ? (
                            <Image source={illustration} style={styles.illustration} contentFit="contain" />
                        ) : (
                            <View style={styles.illustrationPlaceholder}>
                                <Ionicons name="image-outline" size={32} color="rgba(51, 51, 51, 0.1)" />
                            </View>
                        )}
                    </View>

                    {/* Flag Badge */}
                    <View style={styles.flagBadge}>
                        {flag ? (
                            <Image source={flag} style={styles.flagImage} contentFit="cover" />
                        ) : (
                            <View style={styles.flagPlaceholder} />
                        )}
                    </View>
                </View>

                {/* Title Banner */}
                <View style={styles.banner}>
                    <Text style={[styles.titleText, { color: textPrimary }]} numberOfLines={1}>
                        {title.toUpperCase()}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        width: CARD_WIDTH,
        marginBottom: SPACING.md,
        position: 'relative',
    },
    selectionGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 30,
        backgroundColor: '#FFB347',
        opacity: 0.3,
        zIndex: 0,
    },
    plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
    card: {
        width: '100%',
        borderRadius: 26,
        overflow: 'hidden',
        zIndex: 1,
    },
    contentContainer: {
        height: CARD_WIDTH * 1.1,
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 0,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 10,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '80%',
        height: '80%',
    },
    illustrationPlaceholder: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagBadge: {
        position: 'absolute',
        bottom: -14,
        zIndex: 15,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    flagImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    flagPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E2E8F0',
        borderRadius: 16,
    },
    banner: {
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.sm,
        paddingTop: 8,
    },
    titleText: {
        fontSize: 11,
        fontFamily: FONTS.displayBold,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});

