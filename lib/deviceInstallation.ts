import * as SecureStore from 'expo-secure-store';
import { getOrCreateInstallationIdWithStore } from '@/lib/deviceInstallationLogic';

/**
 * Stable per-install identifier (SecureStore). Survives app restarts; not guaranteed across reinstall.
 */
export async function getOrCreateInstallationId(): Promise<string> {
  return getOrCreateInstallationIdWithStore({
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    deleteItem: (key) => SecureStore.deleteItemAsync(key),
  });
}
