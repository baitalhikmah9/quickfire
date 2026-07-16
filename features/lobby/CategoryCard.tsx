import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, type ViewStyle, Dimensions, Platform } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS, COLORS, SHADOWS } from '@/constants/theme';
import { MISSING_CATEGORY_PICTURE_LABEL } from '@/constants/categoryPictures';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { HOME_SOFT_UI } from '@/themes';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';
import { useThemeStore } from '@/store/theme';

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

const getCardShadow = (_isSelected: boolean) => {
    return {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    };
};

export function CategoryCard({
    title,
    illustration,
    flag,
    onPress,
    onInfoPress,
    isSelected,
    style,
}: CategoryCardProps) {
    useThemeStore((state) => state.paletteId);
    const surfaceColors = getPlaySurfaceColors();
    const surface = surfaceColors.surface;
    const textPrimary = surfaceColors.textPrimary;
    const accentColor = T.colors.resumeAccent;
    const isActive = Boolean(isSelected);
    const darkModeFlatTop = useDarkModeFlatTop();
    const placeholderGradient = surfaceColors.isDark
      ? (['#17263A', '#111E2E'] as const)
      : (['#F8FAFC', '#F1F5F9'] as const);

    return (
        <View style={[styles.cardWrapper, style]}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: surface,
                        opacity: pressed ? 0.94 : 1,
                        transform: (pressed || isActive) 
                            ? [{ scale: 0.98 }, { translateY: isActive ? 2 : 0 }] 
                            : [{ scale: 1 }, { translateY: 0 }],
                        
                        // Selection ring only — no light-mode bevel lips / gray strips
                        borderTopWidth: isActive ? 2.5 : 0,
                        borderTopColor: isActive ? accentColor : 'transparent',
                        borderBottomWidth: isActive ? 2.5 : 0,
                        borderBottomColor: isActive ? accentColor : 'transparent',
                        borderLeftWidth: isActive ? 2.5 : 0,
                        borderRightWidth: isActive ? 2.5 : 0,
                        borderColor: isActive ? accentColor : 'transparent',

                        ...getCardShadow(isActive),
                    },
                    !isActive && darkModeFlatTop,
                ]}
            >
                {/* Full-Card Illustration Background */}
                <View style={[styles.imageContainer, { backgroundColor: surfaceColors.topicImageMatte }]}>
                    {illustration ? (
                        <Image 
                            source={illustration} 
                            style={styles.fullImage} 
                            contentFit="cover"
                            transition={400}
                        />
                    ) : (
                        <LinearGradient
                            colors={[...placeholderGradient]}
                            style={styles.fullImage}
                        >
                            <View style={styles.placeholderCenter}>
                                <Text
                                    style={[
                                      styles.missingPictureLabel,
                                      { color: surfaceColors.missingPictureLabelColor },
                                    ]}
                                    accessibilityLabel={MISSING_CATEGORY_PICTURE_LABEL}
                                >
                                    {MISSING_CATEGORY_PICTURE_LABEL}
                                </Text>
                            </View>
                        </LinearGradient>
                    )}
                    
                    {/* Darker gradient at bottom for text contrast */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)']}
                        style={styles.bottomGradient}
                    />
                </View>

                {/* Bottom strip like the reference sketch */}
                <View style={[
                    styles.titleBar,
                    {
                      backgroundColor: isActive
                        ? accentColor
                        : surfaceColors.topicLabelBackground,
                      borderTopColor: surfaceColors.topicLabelBorder,
                    },
                ]}>
                    <Text
                        style={[
                            styles.titleText,
                            { color: isActive ? '#FFF' : surfaceColors.topicLabelText }
                        ]}
                    >
                        {title.toUpperCase()}
                    </Text>
                </View>

                {/* Info Icon - Glass style */}
                <Pressable
                    onPress={onInfoPress}
                    style={({ pressed }) => [
                        styles.infoIcon,
                        { opacity: pressed ? 0.6 : 1 }
                    ]}
                >
                    <Ionicons name="information" size={14} color="#FFF" />
                </Pressable>

                {/* Selection Indicator */}
                {isActive && (
                    <View style={styles.selectionBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    </View>
                )}

                {/* Flag Badge */}
                <View style={styles.flagContainer}>
                    {flag && (
                        <View style={styles.flagBadge}>
                             <Image source={flag} style={styles.flagImage} contentFit="cover" />
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        width: CARD_WIDTH,
        marginBottom: SPACING.md,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.95,
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    placeholderCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    missingPictureLabel: {
        fontFamily: FONTS.uiBold,
        fontSize: 14,
        letterSpacing: 0.8,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    titleBar: {
        flexShrink: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    infoIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 20,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 10,
        fontFamily: FONTS.displayBold,
        textAlign: 'center',
        letterSpacing: 0.4,
        lineHeight: 12,
        width: '100%',
    },
    flagContainer: {
        position: 'absolute',
        top: '40%',
        right: -5,
        zIndex: 15,
    },
    flagBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#FFF',
        overflow: 'hidden',
    },
    flagImage: {
        width: '100%',
        height: '100%',
    },
});



