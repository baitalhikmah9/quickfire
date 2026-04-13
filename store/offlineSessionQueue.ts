import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionSavePayload } from '@/features/shared';
import { deserializeGameSession, serializeGameSession } from '@/store/gameSessionPersistence';

const STORAGE_KEY = 'doubledown-offline-session-queue-v1';

/** AsyncStorage-safe payload (`session` is serialized board state). */
export interface StorableSessionQueuePayload {
  clientSessionId: string;
  deviceId: string;
  session: unknown;
  scoreEvents: SessionSavePayload['scoreEvents'];
}

export interface PersistedOfflineQueueItem {
  id: string;
  payload: StorableSessionQueuePayload;
  createdAt: number;
  flushAttempts: number;
  lastError?: string;
}

async function readRaw(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function loadOfflineSessionQueue(): Promise<PersistedOfflineQueueItem[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is PersistedOfflineQueueItem =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as PersistedOfflineQueueItem).id === 'string' &&
        typeof (row as PersistedOfflineQueueItem).createdAt === 'number' &&
        typeof (row as PersistedOfflineQueueItem).flushAttempts === 'number' &&
        typeof (row as PersistedOfflineQueueItem).payload === 'object' &&
        (row as PersistedOfflineQueueItem).payload !== null
    );
  } catch {
    return [];
  }
}

export async function saveOfflineSessionQueue(items: PersistedOfflineQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineSession(payload: SessionSavePayload): Promise<void> {
  const queue = await loadOfflineSessionQueue();
  const id = `q_${payload.clientSessionId}_${Date.now()}`;
  queue.push({
    id,
    payload: {
      clientSessionId: payload.clientSessionId,
      deviceId: payload.deviceId,
      session: serializeGameSession(payload.session),
      scoreEvents: payload.scoreEvents,
    },
    createdAt: Date.now(),
    flushAttempts: 0,
  });
  await saveOfflineSessionQueue(queue);
}

/**
 * Attempts each queued item once per flush. Failed items stay in the queue with incremented flushAttempts.
 */
export async function flushOfflineSessionQueue(
  send: (payload: SessionSavePayload) => Promise<boolean>
): Promise<{ remaining: number; flushed: number }> {
  const queue = await loadOfflineSessionQueue();
  if (queue.length === 0) return { remaining: 0, flushed: 0 };

  const next: PersistedOfflineQueueItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    const session = deserializeGameSession(item.payload.session);
    if (!session) {
      next.push({
        ...item,
        flushAttempts: item.flushAttempts + 1,
        lastError: 'corrupt_session',
      });
      continue;
    }
    const fullPayload: SessionSavePayload = {
      clientSessionId: item.payload.clientSessionId,
      deviceId: item.payload.deviceId,
      session,
      scoreEvents: item.payload.scoreEvents,
    };
    const ok = await send(fullPayload);
    if (ok) {
      flushed += 1;
    } else {
      next.push({
        ...item,
        flushAttempts: item.flushAttempts + 1,
        lastError: 'flush_failed',
      });
    }
  }

  await saveOfflineSessionQueue(next);
  return { remaining: next.length, flushed };
}
