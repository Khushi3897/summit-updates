import { describe, expect, it } from 'vitest';
import { EMPLOYEES, MANAGERS, USERS } from './constants';
import { createAnnouncement, getAckSummary, getEmployeeFeed, getEmployeeUpdate, getManagerUpdate } from './rules';
import { buildSeed } from './seed';
import type { AnnouncementInput } from './types';

const now = new Date('2026-11-01T20:00:00.000Z');
const input: AnnouncementInput = {
  title: 'Closing reminder', body: 'Keep emergency exits clear.', category: 'safety',
  requiresAck: true, audienceStoreIds: ['bellevue'],
};

describe('QA 1: publication boundaries (not just the validator)', () => {
  it.each(MANAGERS)('$name cannot publish blank or overlong content', manager => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    for (const [field, value, error] of [
      ['title', '', 'Add a title.'], ['title', ' \n\t ', 'Add a title.'],
      ['body', '', 'Add a message.'], ['body', ' \n\t ', 'Add a message.'],
      ['title', 'x'.repeat(81), 'Title is too long (80 max).'],
      ['body', 'x'.repeat(1001), 'Message is too long (1000 max).'],
    ]) {
      expect(createAnnouncement(state, { ...input, [field]: value }, manager, now))
        .toEqual({ ok: false, errors: { [field]: error } });
      expect(state).toEqual(before);
    }
    const result = createAnnouncement(state, {
      ...input, title: ` \t${'x'.repeat(80)}\n `, body: ` \n${'x'.repeat(1000)}\t `,
    }, manager, now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.announcement.title).toHaveLength(80);
    expect(result.announcement.body).toHaveLength(1000);
  });
});

describe('QA 2: every employee against every seeded announcement', () => {
  it.each(EMPLOYEES)('$name sees exactly the audience for $storeId, including direct details', employee => {
    const state = buildSeed(now);
    const feed = getEmployeeFeed(employee, state.announcements, state.acknowledgments);
    const visible = [...feed.needsConfirmation, ...feed.recent];
    expect(state.announcements).toHaveLength(8);
    expect(EMPLOYEES).toHaveLength(35);
    for (const announcement of state.announcements) {
      // The oracle uses audience stores, independently of the saved recipient IDs.
      const expected = announcement.audienceStoreIds.includes(employee.storeId);
      expect(visible.filter(item => item.id === announcement.id)).toHaveLength(expected ? 1 : 0);
      expect(getEmployeeUpdate(employee, announcement.id, state.announcements, state.acknowledgments) !== null)
        .toBe(expected);
    }
  });
});

describe('QA 5–6: all manager counts, employee identities, and store groups', () => {
  it.each(MANAGERS)('$name has consistent totals and only permitted employees', manager => {
    const state = buildSeed(now);
    for (const announcement of state.announcements) {
      const accessible = manager.role === 'operations-manager' || announcement.audienceStoreIds.includes(manager.storeId);
      const detail = getManagerUpdate(manager, announcement.id, state.announcements, state.acknowledgments);
      expect(detail !== null).toBe(accessible);
      const expected = EMPLOYEES.filter(employee => accessible &&
        announcement.audienceStoreIds.includes(employee.storeId) &&
        (manager.role === 'operations-manager' || employee.storeId === manager.storeId));
      const summary = getAckSummary(announcement, state.acknowledgments, USERS, manager);
      expect(summary.total).toBe(expected.length);
      for (const group of [summary, ...summary.byStore]) {
        const people = [...group.acknowledged.map(item => item.user), ...group.pending];
        expect(group.acknowledgedCount).toBe(group.acknowledged.length);
        expect(group.pendingCount).toBe(group.pending.length);
        expect(group.acknowledgedCount + group.pendingCount).toBe(group.total);
        expect(new Set(people.map(person => person.id)).size).toBe(group.total);
        if (manager.role === 'store-manager') {
          expect(people.every(person => person.storeId === 'bellevue')).toBe(true);
        }
      }
      expect([...summary.acknowledged.map(item => item.user.id), ...summary.pending.map(user => user.id)].sort())
        .toEqual(expected.map(user => user.id).sort());
      expect(summary.byStore.reduce((sum, group) => sum + group.total, 0)).toBe(summary.total);
    }
  });
});
