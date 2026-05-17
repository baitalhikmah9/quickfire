export type PromoModeDropdownOption = { value: string; label: string };

export type PromoModeDropdownProps = {
  value: string;
  options: readonly PromoModeDropdownOption[];
  onValueChange: (value: string) => void;
};
