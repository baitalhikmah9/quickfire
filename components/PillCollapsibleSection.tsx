import { memo, useCallback, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '@/constants';

const PILL_DEPTH_LIP = 10;
const PILL_DEPTH_TOP_INSET = 5;
const HUB_CTA_RADIUS = BORDER_RADIUS.sm;

export type PillTone = 'primary' | 'secondary' | 'tertiary' | 'accent';

function pillPalette(tone: PillTone): { face: string; depth: string } {
  switch (tone) {
    case 'primary':
      return { face: COLORS.primary, depth: COLORS.accent };
    case 'secondary':
      return { face: COLORS.secondary, depth: '#CC7000' };
    case 'accent':
      return { face: COLORS.accent, depth: '#003566' };
    default:
      return { face: COLORS.tertiary, depth: '#7B63E8' };
  }
}

export type PillCollapsibleSectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  kicker: string;
  tone: PillTone;
  cardBackground: string;
  rowDir: ViewStyle['flexDirection'];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
};

/**
 * 3D pill header + bordered body card (hub / how-to-play mechanic blocks).
 */
export const PillCollapsibleSection = memo(function PillCollapsibleSection({
  icon,
  title,
  kicker,
  tone,
  cardBackground,
  rowDir,
  collapsible = true,
  defaultExpanded = false,
  children,
}: PillCollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { face, depth } = pillPalette(tone);
  const pillShadow: ViewStyle = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  };

  const toggleExpanded = useCallback(() => {
    if (!collapsible) return;
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((v) => !v);
  }, [collapsible]);

  const headerFace = (
    <View style={styles.pill3dStack}>
      <View
        style={[
          styles.pill3dDepth,
          {
            backgroundColor: depth,
            top: PILL_DEPTH_TOP_INSET,
            bottom: 0,
          },
        ]}
      />
      <View style={[styles.pill3dFace, { backgroundColor: face }]}>
        <View style={[styles.pillHeaderRow, { flexDirection: rowDir }]}>
          <Ionicons name={icon} size={22} color="#FFFFFF" accessibilityIgnoresInvertColors />
          <Text style={styles.pillTitle} numberOfLines={1}>
            {title}
          </Text>
          {collapsible ? (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#FFFFFF"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <Text style={styles.pillKicker} numberOfLines={1}>
          {kicker}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.pill3dOuter}>
        {collapsible ? (
          <Pressable
            onPress={toggleExpanded}
            style={({ pressed }) => [
              styles.pill3dShell,
              { backgroundColor: face },
              pillShadow,
              pressed && styles.pillHeaderPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={kicker}
            accessibilityState={{ expanded }}
          >
            {headerFace}
          </Pressable>
        ) : (
          <View style={[styles.pill3dShell, { backgroundColor: face }, pillShadow]}>{headerFace}</View>
        )}
      </View>

      {(!collapsible || expanded) && (
        <View
          style={[
            styles.bodyCard,
            {
              backgroundColor: cardBackground,
              borderColor: face,
            },
          ]}
        >
          <View style={styles.bodyInner}>{children}</View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  pill3dOuter: {
    overflow: 'visible',
  },
  pill3dShell: {
    borderRadius: HUB_CTA_RADIUS,
    overflow: 'hidden',
  },
  pillHeaderPressed: {
    opacity: 0.96,
  },
  pill3dStack: {
    position: 'relative',
    alignSelf: 'stretch',
    paddingBottom: PILL_DEPTH_LIP,
  },
  pill3dDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: HUB_CTA_RADIUS,
  },
  pill3dFace: {
    borderRadius: HUB_CTA_RADIUS,
    zIndex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },
  pillHeaderRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pillTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    letterSpacing: 1.1,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  pillKicker: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
  },
  bodyCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bodyInner: {
    padding: SPACING.lg,
  },
});
