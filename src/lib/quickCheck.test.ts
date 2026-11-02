import { describe, expect, it } from 'vitest';
import { EMPLOYEES, MANAGERS, STORAGE_KEY } from './constants';
import {
  acknowledge, createAnnouncement, evaluateQuickCheck, getAckSummary, setAcknowledgmentRequired,
  setAnnouncementCategory, setQuickCheckEnabled, validateAnnouncementInput,
} from './rules';
import { buildSeed } from './seed';
import { createStore } from './store';
import type { AnnouncementInput, QuickCheck } from './types';

const now = new Date('2026-11-01T20:00:00.000Z');
const rachel = MANAGERS.find(user => user.id === 'rachel-kim')!;
const check: QuickCheck = {
  question: 'Who should help with closing?', options: ['Nobody', 'Another team member'],
  correctOptionIndex: 1, explanation: 'Close with a second team member.',
};
const input: AnnouncementInput = {
  title: 'Closing checklist', body: 'Close with a second team member.', category: 'safety',
  requiresAck: true, audienceStoreIds: ['bellevue'], quickCheck: check,
};

describe('optional quick checks', () => {
  it('rejects missing, wrong, and out-of-range answers without changing counts; correct answers still need an explicit confirmation', () => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    const announcement = state.announcements[0];
    for (const answer of [undefined, 0, -1, 2, 0.5, NaN]) {
      expect(acknowledge(state, announcement.id, 'alex-rivera', now, answer)).toEqual({
        ok: false, error: 'Answer the quick check correctly before confirming.',
      });
      expect(state).toEqual(before);
    }
    expect(evaluateQuickCheck(announcement.quickCheck, 1).canConfirm).toBe(true);
    expect(state).toEqual(before);
    const result = acknowledge(state, announcement.id, 'alex-rivera', now, 1);
    if (!result.ok) throw new Error(result.error);
    expect(getAckSummary(announcement, result.state.acknowledgments, EMPLOYEES, rachel))
      .toMatchObject({ acknowledgedCount: 3, pendingCount: 1, total: 4 });
    expect(acknowledge(result.state, announcement.id, 'alex-rivera', now)).toEqual({ ok: true, state: result.state });
  });

  it('still rejects non-recipients and managers with a correct answer', () => {
    const state = buildSeed(now);
    for (const userId of ['maya-chen', 'rachel-kim', 'michael-torres']) {
      expect(acknowledge(state, 'closing-safety', userId, now, 1).ok).toBe(false);
    }
  });

  it('ordinary required acknowledgments remain one tap without an answer', () => {
    const state = buildSeed(now);
    const result = createAnnouncement(state, { ...input, quickCheck: undefined }, rachel, now);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(evaluateQuickCheck(result.announcement.quickCheck).canConfirm).toBe(true);
    expect(acknowledge(result.state, result.announcement.id, 'alex-rivera', now).ok).toBe(true);
  });

  it.each([
    [null, 'Add a valid quick check.'],
    [{ ...check, question: ' \t ' }, 'Add a quick-check question.'],
    [{ ...check, question: 'x'.repeat(161) }, 'Question is too long (160 max).'],
    [{ ...check, options: ['One'] }, 'Add two answer choices.'],
    [{ ...check, options: ['One', 2] }, 'Add two answer choices.'],
    [{ ...check, options: ['', 'Two'] }, 'Add two answer choices.'],
    [{ ...check, options: ['One', 'x'.repeat(121)] }, 'Answer choice is too long (120 max).'],
    [{ ...check, options: [' SAME ', 'same'] }, 'Use two different answer choices.'],
    [{ ...check, correctOptionIndex: 2 }, 'Choose the correct answer.'],
    [{ ...check, correctOptionIndex: '1' }, 'Choose the correct answer.'],
    [{ ...check, explanation: ' ' }, 'Add an explanation to help employees try again.'],
    [{ ...check, explanation: 'x'.repeat(301) }, 'Explanation is too long (300 max).'],
  ])('rejects invalid question data %# at publication', (quickCheck, error) => {
    const state = buildSeed(now);
    const before = structuredClone(state);
    expect(createAnnouncement(state, { ...input, quickCheck: quickCheck as QuickCheck }, rachel, now))
      .toEqual({ ok: false, errors: { quickCheck: error } });
    expect(state).toEqual(before);
  });

  it('requires acknowledgment, but permits a manager to add a check to any important category', () => {
    expect(validateAnnouncementInput({ ...input, requiresAck: false }, rachel))
      .toEqual({ ok: false, errors: { quickCheck: 'A quick check requires acknowledgment.' } });
    expect(validateAnnouncementInput({ ...input, category: 'general' }, rachel)).toEqual({ ok: true });
  });

  it('trims and snapshots the question and choices, including maximum lengths', () => {
    const draft: AnnouncementInput = {
      ...input, quickCheck: {
        question: ` ${'q'.repeat(160)} `, options: [` ${'a'.repeat(120)} `, ' Another teammate '],
        correctOptionIndex: 1, explanation: ` ${'e'.repeat(300)} `,
      },
    };
    const result = createAnnouncement(buildSeed(now), draft, rachel, now);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.announcement.quickCheck).toEqual({
      question: 'q'.repeat(160), options: ['a'.repeat(120), 'Another teammate'],
      correctOptionIndex: 1, explanation: 'e'.repeat(300),
    });
    draft.quickCheck!.question = 'Changed draft';
    draft.quickCheck!.options[1] = 'Changed choice';
    expect(result.announcement.quickCheck!.options[1]).toBe('Another teammate');
    expect(result.announcement.quickCheck!.question).toHaveLength(160);
  });

  it('keeps checks off by default and clears draft questions when acknowledgment is removed', () => {
    const ordinary = { ...input, requiresAck: false, quickCheck: undefined };
    expect(setQuickCheckEnabled(ordinary, true).quickCheck).toBeUndefined();
    expect(setQuickCheckEnabled(input, false).quickCheck).toBeUndefined();
    expect(setAcknowledgmentRequired(input, false).quickCheck).toBeUndefined();
    expect(setAnnouncementCategory(input, 'general')).toMatchObject({ category: 'general', requiresAck: false });
    expect(setAnnouncementCategory(input, 'general').quickCheck).toBeUndefined();
    expect(setAnnouncementCategory(input, 'policy').quickCheck).toEqual(check);
    expect(setAnnouncementCategory({ ...input, requiresAck: false, quickCheck: undefined }, 'safety').requiresAck).toBe(false);
  });

  it('saves a published question and confirmation, and duplicate confirmations stay idempotent after reload', () => {
    let saved: string | null = null;
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
    const store = createStore({ storage, now: () => now });
    const result = store.publish(input);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    store.switchUser('alex-rivera');
    expect(store.confirm(result.announcement.id).ok).toBe(false);
    expect(store.confirm(result.announcement.id, 0).ok).toBe(false);
    expect(store.confirm(result.announcement.id, 1).ok).toBe(true);
    const reloaded = createStore({ storage, now: () => now });
    expect(reloaded.getState()).toEqual(store.getState());
    expect(reloaded.confirm(result.announcement.id).ok).toBe(true);
    expect(reloaded.getState().acknowledgments.filter(ack => ack.announcementId === result.announcement.id))
      .toHaveLength(1);
  });

  it('recovers from unknown employees or viewers and malformed saved questions', () => {
    for (const mutate of [
      (state: ReturnType<typeof buildSeed>) => { state.currentUserId = 'unknown-viewer'; },
      (state: ReturnType<typeof buildSeed>) => { state.announcements[0].recipientIds.push('ethan-nguyen'); },
      (state: ReturnType<typeof buildSeed>) => { state.announcements[0].quickCheck = null as unknown as QuickCheck; },
      (state: ReturnType<typeof buildSeed>) => { state.announcements[0].quickCheck!.correctOptionIndex = 3 as 1; },
    ]) {
      const old = buildSeed(now);
      mutate(old);
      const storage = {
        getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify(old) : null,
        setItem: () => {},
      };
      expect(createStore({ storage, now: () => now }).getState()).toEqual(buildSeed(now));
    }
    expect(createStore({ now: () => now }).switchUser('unknown-viewer')).toBe(false);
  });
});
