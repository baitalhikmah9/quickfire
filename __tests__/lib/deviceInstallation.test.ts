import { describe, expect, it } from '@jest/globals';
import {
  getOrCreateInstallationIdWithStore,
  INSTALL_KEY,
  type InstallIdStore,
} from '@/lib/deviceInstallationLogic';

function memoryStore(): { store: InstallIdStore; map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    store: {
      getItem: async (key) => map.get(key) ?? null,
      setItem: async (key, value) => {
        map.set(key, value);
      },
      deleteItem: async (key) => {
        map.delete(key);
      },
    },
  };
}

describe('deviceInstallationLogic', () => {
  it('creates one install ID and reuses stored ID', async () => {
    const { store, map } = memoryStore();
    const a = await getOrCreateInstallationIdWithStore(store);
    const b = await getOrCreateInstallationIdWithStore(store);
    expect(a).toBe(b);
    expect(a.startsWith('inst_')).toBe(true);
    expect(map.get(INSTALL_KEY)).toBe(a);
  });

  it('recovers from corrupt storage', async () => {
    const { store, map } = memoryStore();
    map.set(INSTALL_KEY, '!!!');
    const id = await getOrCreateInstallationIdWithStore(store);
    expect(id.startsWith('inst_')).toBe(true);
    const again = await getOrCreateInstallationIdWithStore(store);
    expect(again).toBe(id);
  });
});
