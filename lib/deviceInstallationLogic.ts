const INSTALL_KEY = 'doubledown_install_id_v1';

function isValidInstallId(id: string): boolean {
  return id.length >= 12 && /^[a-zA-Z0-9_:._-]+$/.test(id);
}

function newInstallId(): string {
  return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

export interface InstallIdStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export async function getOrCreateInstallationIdWithStore(store: InstallIdStore): Promise<string> {
  try {
    const existing = await store.getItem(INSTALL_KEY);
    if (existing && isValidInstallId(existing)) {
      return existing;
    }
    if (existing) {
      await store.deleteItem(INSTALL_KEY);
    }
    const id = newInstallId();
    await store.setItem(INSTALL_KEY, id);
    return id;
  } catch {
    return newInstallId();
  }
}

export { INSTALL_KEY };
