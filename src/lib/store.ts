import { DEMO_USER_IDS, STORAGE_KEY, USERS } from './constants';
import { acknowledge, createAnnouncement, validateAnnouncementInput } from './rules';
import { buildSeed } from './seed';
import type { Announcement, AnnouncementInput, AppState } from './types';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string') && new Set(value).size === value.length;
}
function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function isAnnouncement(value: unknown): value is Announcement {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id ||
      typeof value.title !== 'string' || typeof value.body !== 'string' ||
      !['safety', 'policy', 'general'].includes(String(value.category)) ||
      typeof value.requiresAck !== 'boolean' || !stringArray(value.audienceStoreIds) ||
      !stringArray(value.recipientIds) || !isDate(value.publishedAt)) return false;
  const author = USERS.find(user => user.id === value.authorId);
  if (!author || !validateAnnouncementInput(value as unknown as AnnouncementInput, author).ok) return false;
  return value.recipientIds.every(id => USERS.some(user => user.id === id &&
    user.role === 'employee' && (value.audienceStoreIds as string[]).includes(user.storeId)));
}
function isSavedState(value: unknown): value is AppState {
  if (!isRecord(value) || value.version !== 1 || typeof value.currentUserId !== 'string' ||
      !DEMO_USER_IDS.includes(value.currentUserId) ||
      !Array.isArray(value.announcements) || !value.announcements.every(isAnnouncement) ||
      !Array.isArray(value.acknowledgments)) return false;
  const announcements: Announcement[] = value.announcements;
  if (new Set(announcements.map(item => item.id)).size !== announcements.length) return false;
  const seen = new Set<string>();
  return value.acknowledgments.every(ack => {
    if (!isRecord(ack) || typeof ack.announcementId !== 'string' || typeof ack.userId !== 'string' ||
        !isDate(ack.ackedAt)) return false;
    const announcement = announcements.find(item => item.id === ack.announcementId);
    const key = JSON.stringify([ack.announcementId, ack.userId]);
    if (!announcement?.requiresAck || !announcement.recipientIds.includes(ack.userId) || seen.has(key) ||
        Date.parse(ack.ackedAt) < Date.parse(announcement.publishedAt)) return false;
    seen.add(key);
    return true;
  });
}

function browserStorage(): StorageAdapter | undefined {
  try { return globalThis.localStorage; }
  catch { return undefined; }
}

export function createStore(options: { storage?: StorageAdapter; now?: () => Date } = {}) {
  const storage = options.storage;
  const now = options.now ?? (() => new Date());
  const listeners = new Set<() => void>();

  function load(): AppState {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isSavedState(parsed)) return parsed;
      }
    } catch { /* Missing or corrupted storage silently rebuilds the demo. */ }
    return buildSeed(now());
  }
  let state = load();
  function save() {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* Keep the current session usable if browser storage is unavailable. */ }
  }
  function commit(next: AppState) {
    if (state === next) return;
    state = next;
    save();
    listeners.forEach(listener => listener());
  }
  save();

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    switchUser(userId: string): boolean {
      if (!DEMO_USER_IDS.includes(userId)) return false;
      if (state.currentUserId !== userId) commit({ ...state, currentUserId: userId });
      return true;
    },
    publish(input: AnnouncementInput) {
      const author = USERS.find(user => user.id === state.currentUserId)!;
      const result = createAnnouncement(state, input, author, now());
      if (result.ok) commit(result.state);
      return result;
    },
    confirm(announcementId: string, answerIndex?: number) {
      const result = acknowledge(state, announcementId, state.currentUserId, now(), answerIndex);
      if (result.ok) commit(result.state);
      return result;
    },
    resetDemo() { commit(buildSeed(now())); },
  };
}

const store = createStore({ storage: browserStorage() });
export const { getState, subscribe, switchUser, publish, confirm, resetDemo } = store;
