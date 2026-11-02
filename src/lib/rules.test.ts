import { describe, expect, it } from 'vitest';
import { EMPLOYEES, MANAGERS, STORES, USERS } from './constants';
import {
  acknowledge, createAnnouncement, defaultRequiresAck, getAckSummary, getEmployeeFeed,
  getConfirmationStatus, getEmployeeUpdate,
  getFollowUpAnnouncements, getManagerAnnouncements, getRecipients, hasAcknowledged,
  getManagerUpdate, getPostingOptions,
  validateAnnouncementInput,
} from './rules';
import { buildSeed } from './seed';
import type { AnnouncementInput, Category } from './types';

const now = new Date('2026-11-01T20:00:00.000Z');
const michael = MANAGERS.find(user => user.id === 'michael-torres')!;
const rachel = MANAGERS.find(user => user.id === 'rachel-kim')!;
const alex = EMPLOYEES.find(user => user.id === 'alex-rivera')!;
const maya = EMPLOYEES.find(user => user.id === 'maya-chen')!;
const input: AnnouncementInput = {
  title: 'Team reminder', body: 'Please check the updated shift schedule.', category: 'general',
  requiresAck: false, audienceStoreIds: ['bellevue'],
};

describe('rules', () => {
  it('tracking enforces manager access, scoped counts, and grouping without creating acknowledgments', () => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    expect(getManagerUpdate(rachel, 'ladder-safety', state.announcements, state.acknowledgments)).toBeNull();
    expect(getManagerUpdate(michael, 'missing', state.announcements, state.acknowledgments)).toBeNull();
    const rachelPolicy = getManagerUpdate(rachel, 'return-policy', state.announcements, state.acknowledgments)!;
    expect(rachelPolicy).toMatchObject({ groupByStore: false,
      summary: { acknowledgedCount: 3, pendingCount: 1, total: 4 } });
    const michaelPolicy = getManagerUpdate(michael, 'return-policy', state.announcements, state.acknowledgments)!;
    expect(michaelPolicy).toMatchObject({ groupByStore: true,
      summary: { acknowledgedCount: 15, pendingCount: 5, total: 20 } });
    expect(michaelPolicy.summary.byStore.map(store => [store.acknowledged.length, store.pending.length]))
      .toEqual([[3, 1], [3, 1], [3, 1], [3, 1], [3, 1]]);
    expect(getManagerUpdate(michael, 'closing-safety', state.announcements, state.acknowledgments)?.groupByStore).toBe(false);
    expect(state).toEqual(before);
  });

  it('posting options lock Rachel to Bellevue and let Michael choose any store', () => {
    const rachelOptions = getPostingOptions(rachel);
    expect(rachelOptions.audienceLocked).toBe(true);
    expect(rachelOptions.stores.map(store => store.id)).toEqual(['bellevue']);
    expect(rachelOptions.initialInput).toEqual({ title: '', body: '', category: 'general',
      requiresAck: false, audienceStoreIds: ['bellevue'] });
    const michaelOptions = getPostingOptions(michael);
    expect(michaelOptions.audienceLocked).toBe(false);
    expect(michaelOptions.stores).toEqual(STORES);
    expect(michaelOptions.initialInput.audienceStoreIds).toEqual([]);
  });

  it('detail access uses fixed recipients and reading details never acknowledges', () => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    const detail = getEmployeeUpdate(alex, 'closing-safety', state.announcements, state.acknowledgments);
    expect(detail?.confirmation).toEqual({ kind: 'pending' });
    expect(getEmployeeUpdate(maya, 'closing-safety', state.announcements, state.acknowledgments)).toBeNull();
    expect(getEmployeeUpdate(alex, 'missing', state.announcements, state.acknowledgments)).toBeNull();
    const reassigned = { ...alex, storeId: 'tacoma' };
    expect(getEmployeeUpdate(reassigned, 'closing-safety', state.announcements, state.acknowledgments))
      .toEqual(detail);
    expect(state).toEqual(before);
  });

  it('detail and card confirmation status agree before and after an explicit confirmation', () => {
    const state = buildSeed(now);
    const routine = state.announcements.find(item => item.id === 'holiday-hours')!;
    expect(getConfirmationStatus(routine, alex.id, state.acknowledgments)).toEqual({ kind: 'routine' });
    const policy = getEmployeeUpdate(alex, 'return-policy', state.announcements, state.acknowledgments)!;
    expect(policy.confirmation.kind).toBe('confirmed');
    const result = acknowledge(state, 'closing-safety', alex.id, now, 1);
    if (!result.ok) throw new Error(result.error);
    const detail = getEmployeeUpdate(alex, 'closing-safety', result.state.announcements, result.state.acknowledgments)!;
    expect(detail.confirmation).toEqual({ kind: 'confirmed', ackedAt: now.toISOString() });
    expect(getConfirmationStatus(detail.announcement, alex.id, result.state.acknowledgments))
      .toEqual(detail.confirmation);
  });

  it('an employee only sees announcements whose recipients include them', () => {
    const state = buildSeed(now);
    for (const employee of EMPLOYEES) {
      const feed = getEmployeeFeed(employee, state.announcements, state.acknowledgments);
      const all = [...feed.needsConfirmation, ...feed.recent];
      expect(all.map(item => item.id).sort()).toEqual(state.announcements
        .filter(item => item.recipientIds.includes(employee.id)).map(item => item.id).sort());
      expect(new Set(all.map(item => item.id)).size).toBe(all.length);
      for (const section of [feed.needsConfirmation, feed.recent]) {
        const times = section.map(item => Date.parse(item.publishedAt));
        expect(times).toEqual([...times].sort((a, b) => b - a));
      }
      expect(feed.needsConfirmation.every(item => item.requiresAck &&
        !hasAcknowledged(item.id, employee.id, state.acknowledgments))).toBe(true);
      expect(feed.recent.every(item => !item.requiresAck ||
        hasAcknowledged(item.id, employee.id, state.acknowledgments))).toBe(true);
    }
  });

  it('Maya (Tacoma) does not see the Bellevue-only closing safety update', () => {
    const state = buildSeed(now);
    const feed = getEmployeeFeed(maya, state.announcements, state.acknowledgments);
    expect([...feed.needsConfirmation, ...feed.recent].map(item => item.id)).not.toContain('closing-safety');
  });

  it('building the feed never creates an acknowledgment', () => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    getEmployeeFeed(alex, state.announcements, state.acknowledgments);
    getEmployeeFeed(alex, state.announcements, state.acknowledgments);
    expect(state).toEqual(before);
  });

  it('acknowledging twice leaves exactly ONE record', () => {
    const state = buildSeed(now);
    const first = acknowledge(state, 'closing-safety', alex.id, now, 1);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    const second = acknowledge(first.state, 'closing-safety', alex.id, new Date(now.getTime() + 1000));
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.error);
    expect(second.state).toBe(first.state);
    expect(second.state.acknowledgments.filter(ack => ack.announcementId === 'closing-safety' && ack.userId === alex.id))
      .toEqual([{ announcementId: 'closing-safety', userId: alex.id, ackedAt: now.toISOString() }]);
    expect(state.acknowledgments).toHaveLength(first.state.acknowledgments.length - 1);
    const feed = getEmployeeFeed(alex, second.state.announcements, second.state.acknowledgments);
    expect(feed.needsConfirmation).toEqual([]);
    expect(feed.recent.map(item => item.id)).toContain('closing-safety');
  });

  it('a non-recipient cannot acknowledge', () => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    for (const userId of [maya.id, rachel.id, michael.id, 'unknown']) {
      expect(acknowledge(state, 'closing-safety', userId, now).ok).toBe(false);
    }
    expect(acknowledge(state, 'missing-update', alex.id, now).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it("acknowledging an announcement that doesn't require it is rejected", () => {
    const state = buildSeed(now);
    expect(acknowledge(state, 'holiday-hours', alex.id, now).ok).toBe(false);
    expect(hasAcknowledged('holiday-hours', alex.id, state.acknowledgments)).toBe(false);
  });

  it('acknowledgedCount + pendingCount = total, and list lengths match, for every seeded announcement', () => {
    const state = buildSeed(now);
    for (const viewer of MANAGERS) {
      for (const announcement of state.announcements) {
        const summary = getAckSummary(announcement, state.acknowledgments, USERS, viewer);
        for (const counts of [summary, ...summary.byStore]) {
          expect(counts.acknowledgedCount).toBe(counts.acknowledged.length);
          expect(counts.pendingCount).toBe(counts.pending.length);
          expect(counts.acknowledgedCount + counts.pendingCount).toBe(counts.total);
        }
        expect(summary.byStore.reduce((sum, store) => sum + store.total, 0)).toBe(summary.total);
      }
    }
  });

  it('for Rachel, a company-wide announcement counts only Bellevue employees', () => {
    const state = buildSeed(now);
    const policy = state.announcements.find(item => item.id === 'return-policy')!;
    const summary = getAckSummary(policy, state.acknowledgments, USERS, rachel);
    expect(summary.total).toBe(4);
    expect([...summary.acknowledged.map(ack => ack.user), ...summary.pending]
      .every(user => user.storeId === 'bellevue')).toBe(true);
    expect(summary.byStore.map(store => store.storeId)).toEqual(['bellevue']);
  });

  it('blank title and whitespace-only title are rejected; blank body and whitespace-only body are rejected', () => {
    for (const value of ['', '  \t\n  ']) {
      expect(validateAnnouncementInput({ ...input, title: value }, rachel))
        .toEqual({ ok: false, errors: { title: 'Add a title.' } });
      expect(validateAnnouncementInput({ ...input, body: value }, rachel))
        .toEqual({ ok: false, errors: { body: 'Add a message.' } });
    }
  });

  it('no stores selected is rejected', () => {
    for (const author of MANAGERS) {
      expect(validateAnnouncementInput({ ...input, audienceStoreIds: [] }, author))
        .toEqual({ ok: false, errors: { audienceStoreIds: 'Choose at least one store.' } });
    }
  });

  it('title over 80 characters and body over 1000 characters are rejected', () => {
    expect(validateAnnouncementInput({ ...input, title: 'x'.repeat(81), body: 'x'.repeat(1001) }, michael))
      .toEqual({ ok: false, errors: { title: 'Title is too long (80 max).', body: 'Message is too long (1000 max).' } });
    expect(validateAnnouncementInput({ ...input, title: `  ${'x'.repeat(80)}  `,
      body: `  ${'x'.repeat(1000)}  ` }, michael)).toEqual({ ok: true });
  });

  it('Rachel cannot publish to any store other than Bellevue', () => {
    const state = buildSeed(now);
    for (const audienceStoreIds of [['downtown'], ['bellevue', 'tacoma'], STORES.map(store => store.id)]) {
      expect(createAnnouncement(state, { ...input, audienceStoreIds }, rachel, now).ok).toBe(false);
    }
    expect(createAnnouncement(state, input, rachel, now).ok).toBe(true);
    expect(state.announcements).toHaveLength(8);
  });

  it('Michael can publish to all stores', () => {
    const result = createAnnouncement(buildSeed(now), { ...input, audienceStoreIds: STORES.map(store => store.id) }, michael, now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.announcement.recipientIds).toHaveLength(20);
    expect(result.announcement.authorId).toBe(michael.id);
    expect(result.state.announcements).toHaveLength(9);
  });

  it("a new announcement's recipients equal the employees of the chosen stores", () => {
    const state = buildSeed(now);
    const draft = { ...input, title: '  Stockroom notice  ', body: '  Please keep the aisle clear.  ',
      audienceStoreIds: ['redmond', 'tacoma'] };
    const result = createAnnouncement(state, draft, michael, now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.announcement.recipientIds).toEqual(EMPLOYEES
      .filter(user => ['redmond', 'tacoma'].includes(user.storeId)).map(user => user.id));
    expect(result.announcement).toMatchObject({ title: 'Stockroom notice', body: 'Please keep the aisle clear.',
      publishedAt: now.toISOString() });
    draft.audienceStoreIds.push('bellevue');
    expect(result.announcement.audienceStoreIds).toEqual(['redmond', 'tacoma']);
    const reassigned = USERS.map(user => user.role === 'employee' ? { ...user, storeId: 'bellevue' } : user);
    expect(getRecipients(result.announcement, reassigned).map(user => user.id)).toEqual(result.announcement.recipientIds);
    expect(result.state.announcements.slice(0, 8)).toEqual(state.announcements);
    const second = createAnnouncement(result.state, input, michael, now);
    if (!second.ok) throw new Error(JSON.stringify(second.errors));
    expect(second.announcement.id).not.toBe(result.announcement.id);
  });

  it('manager visibility and follow-up use the manager scope and exclude updates without acknowledgment', () => {
    const state = buildSeed(now);
    expect(getManagerAnnouncements(michael, state.announcements)).toHaveLength(8);
    expect(getManagerAnnouncements(rachel, state.announcements).map(item => item.id))
      .toEqual(['holiday-hours', 'closing-safety', 'window-display', 'return-policy', 'employee-discount', 'fall-results']);
    expect(getFollowUpAnnouncements(michael, state.announcements, state.acknowledgments).map(item => item.id))
      .toEqual(['closing-safety', 'return-policy', 'ladder-safety', 'employee-discount']);
    const bellevueAcks = EMPLOYEES.filter(user => user.storeId === 'bellevue').map(user => ({
      announcementId: 'return-policy', userId: user.id, ackedAt: now.toISOString(),
    }));
    const acknowledgments = [...state.acknowledgments.filter(ack => ack.announcementId !== 'return-policy'), ...bellevueAcks];
    expect(getFollowUpAnnouncements(rachel, state.announcements, acknowledgments).map(item => item.id))
      .toEqual(['closing-safety', 'employee-discount']);
    expect(getFollowUpAnnouncements(michael, state.announcements, acknowledgments).map(item => item.id)).toContain('return-policy');
  });

  it('category defaults can be overridden, while invalid categories, unknown stores, and employee authors are rejected', () => {
    expect(defaultRequiresAck('safety')).toBe(true);
    expect(defaultRequiresAck('policy')).toBe(true);
    expect(defaultRequiresAck('general')).toBe(false);
    for (const [category, requiresAck] of [['safety', false], ['general', true]] as const) {
      const result = createAnnouncement(buildSeed(now), { ...input, category, requiresAck }, michael, now);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      expect(result.announcement.requiresAck).toBe(requiresAck);
    }
    expect(validateAnnouncementInput({ ...input, category: 'other' as Category }, michael).ok).toBe(false);
    expect(validateAnnouncementInput({ ...input, audienceStoreIds: ['unknown'] }, michael).ok).toBe(false);
    expect(createAnnouncement(buildSeed(now), input, alex, now).ok).toBe(false);
  });
});
