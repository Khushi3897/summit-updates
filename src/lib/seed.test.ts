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
  it('assigns every employee to exactly one of the five stores, four per store', () => {
    const grouped = STORES.flatMap(store => EMPLOYEES.filter(employee => employee.storeId === store.id));
    expect(EMPLOYEES).toHaveLength(20);
    expect(new Set(EMPLOYEES.map(employee => employee.id)).size).toBe(20);
    expect(grouped).toHaveLength(20);
    for (const employee of EMPLOYEES) {
      expect(STORES.filter(store => store.id === employee.storeId)).toHaveLength(1);
      expect(grouped.filter(member => member.id === employee.id)).toHaveLength(1);
    }
    for (const store of STORES) {
      expect(EMPLOYEES.filter(employee => employee.storeId === store.id)).toHaveLength(4);
    }
    expect(alex.storeId).toBe('bellevue');
    expect(maya.storeId).toBe('tacoma');
  });

  it('seed has 8 announcements, 20 employees, 5 stores', () => {
    const state = buildSeed(now);
    expect(state.announcements).toHaveLength(8);
    expect(EMPLOYEES).toHaveLength(20);
    expect(STORES).toHaveLength(5);
    expect(MANAGERS).toHaveLength(2);
    expect(new Set(USERS.map(user => user.id)).size).toBe(22);
    expect(STORES.map(store => EMPLOYEES.filter(user => user.storeId === store.id).length))
      .toEqual([4, 4, 4, 4, 4]);
    for (const announcement of state.announcements) {
      expect(announcement.recipientIds).toEqual(EMPLOYEES
        .filter(user => announcement.audienceStoreIds.includes(user.storeId)).map(user => user.id));
      expect(announcement.body.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      expect(announcement.body.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(5);
    }
  });

  it('closing safety is 2 of 4; Alex has exactly 1 item needing confirmation; Maya Chen has 0', () => {
    const state = buildSeed(now);
    const closing = state.announcements.find(item => item.id === 'closing-safety')!;
    expect(getAckSummary(closing, state.acknowledgments, USERS, michael))
      .toMatchObject({ acknowledgedCount: 2, pendingCount: 2, total: 4 });
    expect(hasAcknowledged(closing.id, alex.id, state.acknowledgments)).toBe(false);
    expect(getEmployeeFeed(alex, state.announcements, state.acknowledgments).needsConfirmation)
      .toEqual([closing]);
    expect(getEmployeeFeed(maya, state.announcements, state.acknowledgments).needsConfirmation).toEqual([]);
  });

  it('return policy is 15 of 20 overall and 3 of 4 in Bellevue', () => {
    const state = buildSeed(now);
    const policy = state.announcements.find(item => item.id === 'return-policy')!;
    const summary = getAckSummary(policy, state.acknowledgments, USERS, michael);
    expect(summary).toMatchObject({ acknowledgedCount: 15, total: 20 });
    expect(summary.byStore.map(store => [store.storeId, store.acknowledgedCount, store.total]))
      .toEqual([['bellevue', 3, 4], ['downtown', 3, 4], ['redmond', 3, 4], ['kirkland', 3, 4], ['tacoma', 3, 4]]);
    expect(getAckSummary(policy, state.acknowledgments, USERS, rachel))
      .toMatchObject({ acknowledgedCount: 3, total: 4 });
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
      .toMatchObject({ total: 8, acknowledgedCount: 6 });
    const discount = state.announcements.find(item => item.id === 'employee-discount')!;
    const summary = getAckSummary(discount, state.acknowledgments, USERS, michael);
    expect(summary).toMatchObject({ total: 20, acknowledgedCount: 18 });
    expect(new Set(summary.pending.map(user => user.storeId)).size).toBe(2);
    expect(summary.pending.map(user => user.id)).not.toContain(alex.id);
    expect(summary.pending.map(user => user.id)).not.toContain(maya.id);
  });
});
