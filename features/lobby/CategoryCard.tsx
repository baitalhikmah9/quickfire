import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, Pressable, type ViewStyle, Dimensions } from 'react-native';
import { SPACING, BORDER_RADIUS, COLORS, FONTS, SHADOWS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
    selectionColor?: string;
    style?: ViewStyle;
}

export function CategoryCard({
    title,
    illustration,
    flag,
    onPress,
    onInfoPress,
    isSelected,
    selectionColor = COLORS.primary,
    style,
}: CategoryCardProps) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                isSelected && styles.cardSelected,
                isSelected && { borderColor: selectionColor },
                style,
            ]}
        >
            <View style={styles.contentContainer}>
                {/* Info Icon */}
                <Pressable onPress={onInfoPress} style={styles.infoIcon}>
                    <Ionicons name="information-circle" size={22} color={COLORS.info} />
                </Pressable>

                {/* Illustration Area */}
                <View style={styles.illustrationContainer}>
                    {illustration ? (
                        <Image source={illustration} style={styles.illustration} contentFit="contain" />
                    ) : (
                        <View style={styles.illustrationPlaceholder}>
                            <Ionicons name="image-outline" size={32} color="rgba(37, 99, 235, 0.2)" />
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
                <Text style={styles.titleText} numberOfLines={1}>
                    {title}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        ...SHADOWS.card,
        shadowOpacity: 0.08,
    },
    cardSelected: {
        borderWidth: 4,
    },
    contentContainer: {
        height: CARD_WIDTH * 1.3,
        backgroundColor: '#EAF2FF',
        padding: 0,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoIcon: {
        position: 'absolute',
        top: 6,
        left: 6,
        zIndex: 10,
        backgroundColor: '#FFF',
        borderRadius: BORDER_RADIUS.pill,
        padding: 2,
    },
    illustrationContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    illustrationPlaceholder: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(37, 99, 235, 0.03)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagBadge: {
        position: 'absolute',
        bottom: -16,
        zIndex: 15,
        width: 36,
        height: 36,
        borderRadius: BORDER_RADIUS.pill,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 4,
    },
    flagImage: {
        width: '100%',
        height: '100%',
        borderRadius: BORDER_RADIUS.pill,
    },
    flagPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E2E8F0',
        borderRadius: BORDER_RADIUS.pill,
    },
    banner: {
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.sm,
        paddingTop: SPACING.xs,
        backgroundColor: COLORS.secondary,
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: FONTS.displayBold,
        textAlign: 'center',
    },
});
