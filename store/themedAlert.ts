import { create } from 'zustand';

export type ThemedAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type ThemedAlertButton = {
  text: string;
  style?: ThemedAlertButtonStyle;
  onPress?: () => void;
};

export type ThemedAlertState = {
  visible: boolean;
  title: string;
  message: string;
  buttons: ThemedAlertButton[];
  show: (title: string, message?: string, buttons?: ThemedAlertButton[]) => void;
  hide: () => void;
};

const DEFAULT_OK: ThemedAlertButton = { text: 'OK', style: 'default' };

export const useThemedAlertStore = create<ThemedAlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],

  show: (title, message = '', buttons) => {
    const resolved =
      buttons && buttons.length > 0 ? buttons : [{ ...DEFAULT_OK }];
    set({
      visible: true,
      title,
      message: message ?? '',
      buttons: resolved,
    });
  },

  hide: () => {
    set({
      visible: false,
      title: '',
      message: '',
      buttons: [],
    });
  },
}));

/** Imperative API — drop-in replacement for React Native `Alert.alert` chrome. */
export function showThemedAlert(
  title: string,
  message?: string,
  buttons?: ThemedAlertButton[]
): void {
  useThemedAlertStore.getState().show(title, message, buttons);
}

export function hideThemedAlert(): void {
  useThemedAlertStore.getState().hide();
}
