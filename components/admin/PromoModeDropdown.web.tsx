import { useState, type CSSProperties } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PromoModeDropdownProps } from '@/components/admin/promoModeDropdown.types';
import { ADMIN_THEME } from '@/constants/adminTheme';
import { FONTS } from '@/constants/theme';

const NO_FOCUS_RING: CSSProperties = {
  outline: 'none',
  boxShadow: 'none',
};

function blurActiveElement() {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active && 'blur' in active && typeof active.blur === 'function') {
    active.blur();
  }
}

/**
 * Web admin: Radix Dropdown Menu (Shadcn UI select-style trigger).
 * Native <button> keeps label + chevron on one row (RN Pressable flex is unreliable on web).
 */
export default function PromoModeDropdown({
  value,
  options,
  onValueChange,
  accessibilityLabel = 'Select option',
}: PromoModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? value;

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) blurActiveElement();
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={accessibilityLabel}
          aria-expanded={open}
          style={{
            ...triggerStyle,
            ...(open ? triggerOpenStyle : null),
            ...NO_FOCUS_RING,
          }}
        >
          <span style={triggerTextStyle}>{selectedLabel}</span>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={ADMIN_THEME.colors.mutedForeground}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          collisionPadding={8}
          style={{
            ...contentStyle,
            ...NO_FOCUS_RING,
            // Keep menu shadow; NO_FOCUS_RING clears ring-style shadow only on the trigger.
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            blurActiveElement();
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <DropdownMenu.Item
                key={opt.value}
                textValue={opt.label}
                style={{
                  ...itemStyle,
                  ...(isSelected ? itemSelectedStyle : null),
                  ...NO_FOCUS_RING,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                }}
                onSelect={() => {
                  onValueChange(opt.value);
                  blurActiveElement();
                }}
              >
                <span style={{ ...itemTextStyle, ...(isSelected ? itemTextActiveStyle : null) }}>
                  {opt.label}
                </span>
                {isSelected ? (
                  <Ionicons name="checkmark" size={14} color={ADMIN_THEME.colors.foreground} />
                ) : (
                  <View style={{ width: 14, height: 14 }} />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const triggerStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  minHeight: 40,
  margin: 0,
  padding: '0 12px',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: ADMIN_THEME.colors.border,
  borderRadius: ADMIN_THEME.radius.md,
  backgroundColor: ADMIN_THEME.colors.inputBackground,
  cursor: 'pointer',
  fontFamily: FONTS.uiMedium,
  fontSize: 13,
  color: ADMIN_THEME.colors.foreground,
  textAlign: 'left',
};

const triggerOpenStyle: CSSProperties = {
  borderColor: ADMIN_THEME.colors.foreground,
};

const triggerTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: FONTS.uiMedium,
  fontSize: 13,
  color: ADMIN_THEME.colors.foreground,
};

const contentStyle: CSSProperties = {
  zIndex: 1000,
  boxSizing: 'border-box',
  minWidth: 'var(--radix-dropdown-menu-trigger-width, 220px)',
  borderRadius: ADMIN_THEME.radius.md,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: ADMIN_THEME.colors.border,
  backgroundColor: ADMIN_THEME.colors.popover,
  padding: '6px 4px',
};

const itemStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  minHeight: 36,
  padding: '8px 10px',
  borderRadius: ADMIN_THEME.radius.sm,
  cursor: 'pointer',
};

const itemSelectedStyle: CSSProperties = {
  backgroundColor: ADMIN_THEME.colors.secondary,
};

const itemTextStyle: CSSProperties = {
  flex: 1,
  fontFamily: FONTS.ui,
  fontSize: 13,
  color: ADMIN_THEME.colors.foreground,
};

const itemTextActiveStyle: CSSProperties = {
  fontFamily: FONTS.uiMedium,
  color: ADMIN_THEME.colors.foreground,
};
