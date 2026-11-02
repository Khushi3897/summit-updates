import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from './constants';
import { buildSeed } from './seed';
import { createStore, type StorageAdapter } from './store';
import type { AnnouncementInput } from './types';

const now = new Date('2026-11-01T20:00:00.000Z');
const input: AnnouncementInput = {
  title: 'Shift reminder', body: 'Check the schedule before your next shift.',
  category: 'general', requiresAck: false, audienceStoreIds: ['bellevue'],
};

function memoryStorage(initial?: string): StorageAdapter {
  const values = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('store', () => {
  it('corrupted localStorage JSON falls back to seed; wrong version falls back to seed', () => {
    for (const raw of ['{broken json', JSON.stringify({ ...buildSeed(now), version: 2 })]) {
      const storage = memoryStorage(raw);
      const store = createStore({ storage, now: () => now });
      expect(store.getState()).toEqual(buildSeed(now));
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(buildSeed(now));
    }
  });

  it('resetDemo restores the seed and selects Rachel', () => {
    let currentTime = now;
    const storage = memoryStorage();
    const store = createStore({ storage, now: () => currentTime });
    store.switchUser('alex-rivera');
    expect(store.confirm('closing-safety').ok).toBe(true);
    store.switchUser('michael-torres');
    expect(store.publish(input).ok).toBe(true);
    currentTime = new Date(now.getTime() + 86_400_000);
    store.resetDemo();
    expect(store.getState()).toEqual(buildSeed(currentTime));
    expect(store.getState().currentUserId).toBe('rachel-kim');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(buildSeed(currentTime));
  });

  it('missing or malformed saved data rebuilds the seed without throwing', () => {
    const seed = buildSeed(now);
    for (const raw of [undefined, 'null', '{}', '[]', JSON.stringify({ ...seed, currentUserId: 'unknown' }),
      JSON.stringify({ ...seed, announcements: [null] }),
      JSON.stringify({ ...seed, announcements: [{ ...seed.announcements[0], category: 'invalid' }] }),
      JSON.stringify({ ...seed, acknowledgments: [{ announcementId: 'closing-safety', userId: 'maya-chen', ackedAt: now.toISOString() }] }),
      JSON.stringify({ ...seed, acknowledgments: [...seed.acknowledgments, seed.acknowledgments[0]] }),
    ]) {
      expect(createStore({ storage: memoryStorage(raw), now: () => now }).getState()).toEqual(seed);
    }
  });

  it('switching, publishing, and confirming persist and reload without saving users or stores', () => {
    const storage = memoryStorage();
    const store = createStore({ storage, now: () => now });
    expect(store.getState()).toBe(store.getState());
    store.switchUser('alex-rivera');
    expect(store.confirm('closing-safety').ok).toBe(true);
    store.switchUser('michael-torres');
    expect(store.publish(input).ok).toBe(true);
    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(Object.keys(saved).sort()).toEqual(['acknowledgments', 'announcements', 'currentUserId', 'version']);
    const reloaded = createStore({ storage, now: () => new Date('2027-01-01T20:00:00.000Z') });
    expect(reloaded.getState()).toEqual(store.getState());
  });

  it('subscriptions notify on changes and unsubscribe; rejected or duplicate actions do not notify', () => {
    const store = createStore({ storage: memoryStorage(), now: () => now });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.switchUser('unknown')).toBe(false);
    expect(store.confirm('closing-safety').ok).toBe(false);
    expect(store.publish({ ...input, audienceStoreIds: ['tacoma'] }).ok).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    store.switchUser('alex-rivera');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.publish(input).ok).toBe(false);
    expect(store.confirm('closing-safety').ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    const snapshot = store.getState();
    expect(store.confirm('closing-safety').ok).toBe(true);
    store.switchUser('alex-rivera');
    expect(store.getState()).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.resetDemo();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('unavailable storage still supports the current demo session', () => {
    const storage: StorageAdapter = {
      getItem() { throw new Error('Storage blocked.'); },
      setItem() { throw new Error('Storage full.'); },
    };
    const store = createStore({ storage, now: () => now });
    expect(store.getState()).toEqual(buildSeed(now));
    store.switchUser('alex-rivera');
    expect(store.confirm('closing-safety').ok).toBe(true);
    expect(store.getState().acknowledgments).toHaveLength(buildSeed(now).acknowledgments.length + 1);
  });
});
