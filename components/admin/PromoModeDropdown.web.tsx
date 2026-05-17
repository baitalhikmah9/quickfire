import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PromoModeDropdownProps } from '@/components/admin/promoModeDropdown.types';
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

/**
 * Web admin: Radix Dropdown Menu (same primitive family as shadcn/ui DropdownMenu).
 */
export default function PromoModeDropdown({ value, options, onValueChange }: PromoModeDropdownProps) {
  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? value;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select coupon mode"
          style={({ pressed }) => [
            styles.trigger,
            { cursor: 'pointer' },
            pressed && styles.triggerPressed,
          ]}
        >
          <View style={styles.triggerInner}>
            <Text style={styles.triggerText} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color={SOFT.textPrimary} />
          </View>
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="start"
          collisionPadding={12}
          /* Radix renders a DOM node — must be a plain style object, not an RN style array. */
          style={StyleSheet.flatten(styles.content)}
        >
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              textValue={opt.label}
              style={StyleSheet.flatten([styles.item, { cursor: 'pointer' }])}
              onSelect={() => onValueChange(opt.value)}
            >
              <Text
                style={[styles.itemText, opt.value === value ? styles.itemTextActive : undefined]}
                numberOfLines={2}
              >
                {opt.label}
                {opt.value === value ? '  ✓' : ''}
              </Text>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: 'rgba(51, 51, 51, 0.2)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    /* Solid white + depth so the control reads off the warm canvas (raised / shadcn-like). */
    backgroundColor: '#FFFFFF',
    boxShadow:
      '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 16px rgba(0, 0, 0, 0.1)',
  },
  triggerPressed: {
    opacity: 0.96,
    boxShadow:
      '0 1px 0 rgba(255, 255, 255, 0.75) inset, 0 1px 1px rgba(0, 0, 0, 0.05), 0 3px 10px rgba(0, 0, 0, 0.08)',
  },
  triggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  triggerText: {
    flex: 1,
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    letterSpacing: -0.15,
    color: SOFT.textPrimary,
    minWidth: 0,
  },
  content: {
    zIndex: 100,
    minWidth: 240,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(51, 51, 51, 0.28)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 20px 48px rgba(0, 0, 0, 0.14)',
  },
  item: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  itemText: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: SOFT.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemTextActive: {
    fontFamily: FONTS.uiSemibold,
    color: COLORS.primary,
  },
});
