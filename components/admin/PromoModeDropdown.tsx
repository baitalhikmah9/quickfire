import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PromoModeDropdownProps } from '@/components/admin/promoModeDropdown.types';
import { BRAND_ADMIN_TABLE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

/** Native / Jest: modal menu. Web uses `PromoModeDropdown.web.tsx` (Radix — shadcn-style). */
export default function PromoModeDropdown({ value, options, onValueChange }: PromoModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? value;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select coupon mode"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <View style={styles.triggerInner}>
          <Text style={styles.triggerText} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={SOFT.textMuted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} accessibilityLabel="Dismiss" />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Coupon mode</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalList}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    onPress={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.menuRow,
                      active && styles.menuRowActive,
                      pressed && styles.menuRowPressed,
                    ]}
                  >
                    <Text style={[styles.menuRowText, active && styles.menuRowTextActive]}>{opt.label}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: BRAND_ADMIN_TABLE.inputBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: BRAND_ADMIN_TABLE.inputBackground,
  },
  triggerPressed: {
    opacity: 0.92,
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
    fontSize: 12,
    color: SOFT.textPrimary,
    minWidth: 0,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1,
  },
  modalCard: {
    zIndex: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(51, 51, 51, 0.28)',
    backgroundColor: '#FFFFFF',
    maxHeight: '70%',
    overflow: 'hidden',
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: SOFT.textMuted,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  modalList: {
    maxHeight: 320,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  menuRowActive: {
    backgroundColor: COLORS.primary + '12',
  },
  menuRowPressed: {
    opacity: 0.9,
  },
  menuRowText: {
    flex: 1,
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: SOFT.textPrimary,
  },
  menuRowTextActive: {
    fontFamily: FONTS.uiSemibold,
    color: COLORS.primary,
  },
});
