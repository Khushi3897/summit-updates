import { describe, expect, it } from 'vitest';
import { EMPLOYEES, MANAGERS, STORES, USERS } from './constants';
import { getAckSummary, getEmployeeFeed, hasAcknowledged } from './rules';
import { buildSeed } from './seed';

const now = new Date('2026-11-01T20:00:00.000Z');
const michael = MANAGERS.find(user => user.id === 'michael-torres')!;
const rachel = MANAGERS.find(user => user.id === 'rachel-kim')!;
const alex = EMPLOYEES.find(user => user.id === 'alex-rivera')!;
const maya = EMPLOYEES.find(user => user.id === 'maya-chen')!;

describe('seed', () => {
  it('seed has 8 announcements, 35 employees, 5 stores', () => {
    const state = buildSeed(now);
    expect(state.announcements).toHaveLength(8);
    expect(EMPLOYEES).toHaveLength(35);
    expect(STORES).toHaveLength(5);
    expect(MANAGERS).toHaveLength(2);
    expect(new Set(USERS.map(user => user.id)).size).toBe(37);
    expect(STORES.map(store => EMPLOYEES.filter(user => user.storeId === store.id).length))
      .toEqual([8, 7, 7, 6, 7]);
    for (const announcement of state.announcements) {
      expect(announcement.recipientIds).toEqual(EMPLOYEES
        .filter(user => announcement.audienceStoreIds.includes(user.storeId)).map(user => user.id));
      expect(announcement.body.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      expect(announcement.body.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(5);
    }
  });

  it('closing safety is 5 of 8; Alex has exactly 1 item needing confirmation; Maya Chen has 0', () => {
    const state = buildSeed(now);
    const closing = state.announcements.find(item => item.id === 'closing-safety')!;
    expect(getAckSummary(closing, state.acknowledgments, USERS, michael))
      .toMatchObject({ acknowledgedCount: 5, pendingCount: 3, total: 8 });
    expect(hasAcknowledged(closing.id, alex.id, state.acknowledgments)).toBe(false);
    expect(getEmployeeFeed(alex, state.announcements, state.acknowledgments).needsConfirmation)
      .toEqual([closing]);
    expect(getEmployeeFeed(maya, state.announcements, state.acknowledgments).needsConfirmation).toEqual([]);
  });

  it('return policy is 24 of 35 overall and 6 of 8 in Bellevue', () => {
    const state = buildSeed(now);
    const policy = state.announcements.find(item => item.id === 'return-policy')!;
    const summary = getAckSummary(policy, state.acknowledgments, USERS, michael);
    expect(summary).toMatchObject({ acknowledgedCount: 24, total: 35 });
    expect(summary.byStore.map(store => [store.storeId, store.acknowledgedCount, store.total]))
      .toEqual([['bellevue', 6, 8], ['downtown', 5, 7], ['redmond', 4, 7], ['kirkland', 4, 6], ['tacoma', 5, 7]]);
    expect(getAckSummary(policy, state.acknowledgments, USERS, rachel))
      .toMatchObject({ acknowledgedCount: 6, total: 8 });
    expect(hasAcknowledged(policy.id, alex.id, state.acknowledgments)).toBe(true);
    expect(hasAcknowledged(policy.id, maya.id, state.acknowledgments)).toBe(true);
  });

  it('all eight seed announcements match the specified metadata and relative dates', () => {
    const state = buildSeed(now);
    const all = STORES.map(store => store.id);
    const expected = [
      ['Revised closing safety procedure', 'safety', true, ['bellevue'], 'rachel-kim', 2],
      ['Return policy change: receipt required for refunds over $50', 'policy', true, all, 'michael-torres', 4],
      ['Holiday hours: Nov 27 to Jan 2', 'general', false, all, 'michael-torres', 1],
      ['New window display goes up Friday', 'general', false, ['bellevue', 'downtown'], 'michael-torres', 3],
      ['Ladder and step-stool safety reminder', 'safety', true, ['redmond', 'kirkland'], 'michael-torres', 5],
      ['Break room refrigerator cleanout every Friday', 'general', false, ['tacoma'], 'michael-torres', 6],
      ['Employee discount policy update', 'policy', true, all, 'michael-torres', 21],
      ['Fall promotion results and thank-you', 'general', false, all, 'michael-torres', 35],
    ];
    expect(state.announcements.map(item => [item.title, item.category, item.requiresAck,
      item.audienceStoreIds, item.authorId, (now.getTime() - Date.parse(item.publishedAt)) / 86_400_000]))
      .toEqual(expected);
    expect(buildSeed(now)).toEqual(state);
    const tomorrow = buildSeed(new Date(now.getTime() + 86_400_000));
    expect(Date.parse(tomorrow.announcements[0].publishedAt) - Date.parse(state.announcements[0].publishedAt))
      .toBe(86_400_000);
    for (const ack of state.acknowledgments) {
      const announcement = state.announcements.find(item => item.id === ack.announcementId)!;
      expect(announcement.requiresAck).toBe(true);
      expect(announcement.recipientIds).toContain(ack.userId);
      expect(Date.parse(ack.ackedAt)).toBeGreaterThan(Date.parse(announcement.publishedAt));
      expect(Date.parse(ack.ackedAt)).toBeLessThanOrEqual(now.getTime());
    }
    expect(new Set(state.acknowledgments.map(ack => `${ack.announcementId}:${ack.userId}`)).size)
      .toBe(state.acknowledgments.length);
    const ladder = state.announcements.find(item => item.id === 'ladder-safety')!;
    expect(getAckSummary(ladder, state.acknowledgments, USERS, michael))
      .toMatchObject({ total: 13, acknowledgedCount: 9 });
    const discount = state.announcements.find(item => item.id === 'employee-discount')!;
    const summary = getAckSummary(discount, state.acknowledgments, USERS, michael);
    expect(summary).toMatchObject({ total: 35, acknowledgedCount: 33 });
    expect(new Set(summary.pending.map(user => user.storeId)).size).toBe(2);
    expect(summary.pending.map(user => user.id)).not.toContain(alex.id);
    expect(summary.pending.map(user => user.id)).not.toContain(maya.id);
  });
});
