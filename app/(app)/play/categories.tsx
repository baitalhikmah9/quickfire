import { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from '@/constants';
import { getCategoryPictureSource } from '@/constants/categoryPictures';
import { getModeCategoryCount } from '@/features/play/data';
import type { GameMode } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

const TOPIC_COLUMNS_PER_ROW = 4;

export default function CategorySelectionScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { width, height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 720;
  const [gridWidth, setGridWidth] = useState(0);
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const toggleCategory = usePlayStore((state) => state.toggleCategory);
  const startBoard = usePlayStore((state) => state.startBoard);

  useLayoutEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const required = useMemo(() => {
    if (!session) return 0;
    return getModeCategoryCount(
      session.mode as GameMode,
      session.config.quickPlayTopicCount ?? 3
    );
  }, [session]);

  const layoutWidth = gridWidth || width - SPACING.xl;
  const columns = TOPIC_COLUMNS_PER_ROW;
  const gridGap = SPACING.sm;
  const categoryCardWidth =
    layoutWidth > 0
      ? Math.floor((layoutWidth - gridGap * (columns - 1)) / columns)
      : undefined;

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  };

  return (
    <PlayScaffold
      title={t('play.pickTopicsTitle')}
      subtitle={t('play.pickTopicsSubtitle', { count: required })}
      bodyFrame={false}
      footer={
        <Button
          title={t('play.startBoard')}
          disabled={session.selectedCategoryIds.length !== required}
          onPress={() => {
            const result = startBoard();
            if (result.ok) {
              router.replace('/(app)/play/board');
            }
          }}
        />
      }
    >
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, { color: colors.textSecondary }, getTextStyle()]}>
          {t('common.selectedCount', {
            selected: session.selectedCategoryIds.length,
            required,
          })}
        </Text>
      </View>

      <View style={styles.gridMeasure} onLayout={onGridLayout}>
        <View style={[styles.grid, { columnGap: gridGap, rowGap: gridGap }]}>
        {session.availableCategories.map((category) => {
          const selected = session.selectedCategoryIds.includes(category.slug);
          const disabled = !selected && session.selectedCategoryIds.length >= required;
          const imageSource = getCategoryPictureSource(category.id);
          return (
            <Pressable
              key={category.slug}
              style={({ pressed }) => [
                styles.categoryCard,
                compact && styles.categoryCardCompact,
                {
                  width: categoryCardWidth ?? '24%',
                  opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleCategory(category.slug)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
            >
              <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
                {imageSource ? (
                  <Image source={imageSource} style={styles.imageFill} contentFit="cover" transition={120} />
                ) : (
                  <View style={[styles.fallback, { backgroundColor: `${colors.primary}1F` }]}>
                    <Text style={[styles.fallbackText, { color: colors.primary }]}> 
                      {category.title.charAt(0)}
                    </Text>
                  </View>
                )}

                <View style={[styles.tileFooter, compact && styles.tileFooterCompact, { backgroundColor: COLORS.secondary }]}>
                  <Text
                    style={[styles.categoryTitle, getTextStyle(category.resolvedLocale, 'bodyBold', 'start')]}
                    numberOfLines={2}
                  >
                    {category.title}
                  </Text>
                  <Text style={[styles.categoryMeta, getTextStyle(category.resolvedLocale)]}>
                    {t('common.questions', { count: category.questionCount })}
                  </Text>
                </View>

                {selected ? (
                  <View style={[styles.selectedPill, { backgroundColor: colors.primary }]}> 
                    <Text style={styles.selectedPillText}>Selected</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  counterRow: {
    marginBottom: SPACING.xs,
    flexShrink: 0,
  },
  gridMeasure: {
    width: '100%',
    flexShrink: 0,
  },
  counterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    paddingBottom: SPACING.sm,
  },
  categoryCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  categoryCardCompact: {
    borderWidth: 1,
  },
  imageWrap: {
    minHeight: 110,
    aspectRatio: 1.26,
    justifyContent: 'flex-end',
  },
  imageWrapCompact: {
    minHeight: 82,
    aspectRatio: 1.2,
  },
  imageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 34,
    fontWeight: '800',
  },
  tileFooter: {
    width: '100%',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  tileFooterCompact: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: 2,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryMeta: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
    color: COLORS.mutedText,
  },
  selectedPill: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
