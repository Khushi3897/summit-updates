// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { EMPLOYEES, MANAGERS, STORAGE_KEY } from './lib/constants';
import { buildSeed } from './lib/seed';
import { createStore } from './lib/store';

let store: ReturnType<typeof createStore>;
vi.mock('./lib/store', async importOriginal => {
  const original = await importOriginal<typeof import('./lib/store')>();
  return {
    ...original,
    getState: () => store.getState(),
    subscribe: (listener: () => void) => store.subscribe(listener),
    switchUser: (id: string) => store.switchUser(id),
    publish: (...args: Parameters<typeof store.publish>) => store.publish(...args),
    confirm: (id: string, answerIndex?: number) => store.confirm(id, answerIndex),
    resetDemo: () => store.resetDemo(),
  };
});

const now = new Date('2026-11-01T20:00:00.000Z');
function reloadStore() {
  store = createStore({ storage: localStorage, now: () => now });
}
function route(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
function viewer(id: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Viewing as' }), { target: { value: id } });
  route('#/');
}
function finishSaving() {
  act(() => vi.runOnlyPendingTimers());
}
function passClosingCheck() {
  fireEvent.click(screen.getByRole('radio', { name: 'No, with another team member' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
}
function publishFromForm() {
  route('#/post');
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'QA closing checklist' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Check every emergency exit before closing.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Safety' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish update' }));
  const announcement = store.getState().announcements.at(-1)!;
  route(`#/update/${announcement.id}`);
  return announcement;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('scrollTo', vi.fn());
  localStorage.clear();
  window.history.replaceState(null, '', '#/');
  reloadStore();
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('QA behavior', () => {
  it('shows only the four demo identities while retaining four employees per store', () => {
    render(<App />);
    expect(screen.getAllByRole('option').map(option => option.textContent))
      .toEqual(['Michael Torres', 'Rachel Kim', 'Alex Rivera', 'Maya Chen']);
    expect(EMPLOYEES).toHaveLength(20);
  });

  it('a quick-check answer never confirms by itself, and changing a passed answer removes confirmation eligibility', () => {
    store.switchUser('alex-rivera');
    route('#/update/closing-safety');
    render(<App />);
    const before = structuredClone(store.getState());
    const confirm = screen.getByRole('button', { name: "Confirm I've read this" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(confirm);
    fireEvent.click(screen.getByRole('radio', { name: /^Yes$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByRole('status').textContent).toContain('Review the update and try again.');
    expect(store.getState()).toEqual(before);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    passClosingCheck();
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    expect(store.getState()).toEqual(before);
    fireEvent.click(screen.getByRole('radio', { name: /^Yes$/ }));
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    passClosingCheck();
    fireEvent.click(confirm);
    finishSaving();
    expect(screen.getByRole('status').textContent).toMatch(/^Confirmed on /);
    expect(screen.queryByRole('button', { name: 'Check answer' })).toBeNull();
    viewer('rachel-kim');
    route('#/update/closing-safety');
    expect(screen.getByText('3 of 4 acknowledged')).toBeTruthy();
  });

  it('validates a manager-written question, publishes it, and completes the employee check after reload', () => {
    route('#/post');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Check the exit' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Keep the exit clear. Tell the manager if it is blocked.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Safety' }));
    expect((screen.getByRole('switch', { name: 'Add a quick check' }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Add a quick check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' }));
    finishSaving();
    expect(screen.getByText('Add a quick-check question.')).toBeTruthy();
    expect(store.getState().announcements).toHaveLength(8);
    expect(document.activeElement).toBe(screen.getByLabelText('Question'));
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'What if the exit is blocked?' } });
    fireEvent.change(screen.getByLabelText('Answer choice 1'), { target: { value: 'Tell the manager' } });
    fireEvent.change(screen.getByLabelText('Answer choice 2'), { target: { value: 'Ignore it' } });
    fireEvent.change(screen.getByLabelText('Explanation for a retry'), { target: { value: 'Report blocked exits to the manager.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' }));
    const announcement = store.getState().announcements.at(-1)!;
    route(`#/update/${announcement.id}`);
    expect(screen.getByText('0 of 4 acknowledged')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Quick check' }).textContent).toContain('Tell the manager');
    viewer('alex-rivera');
    route(`#/update/${announcement.id}`);
    cleanup();
    reloadStore();
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'Tell the manager' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(store.getState().acknowledgments.some(ack => ack.announcementId === announcement.id)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: "Confirm I've read this" }));
    finishSaving();
    viewer('rachel-kim');
    route(`#/update/${announcement.id}`);
    expect(screen.getByText('1 of 4 acknowledged')).toBeTruthy();
  });

  it('removes an optional draft check when acknowledgment is turned off', () => {
    route('#/post');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Safety' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Add a quick check' }));
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Draft question' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Requires acknowledgment' }));
    expect(screen.queryByLabelText('Question')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Requires acknowledgment' }));
    expect((screen.getByRole('switch', { name: 'Add a quick check' }) as HTMLInputElement).checked).toBe(false);
  });

  it('1: form submission rejects whitespace and focuses the invalid field', () => {
    route('#/post');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: ' \t ' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '\n ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' }));
    finishSaving();
    expect(screen.getByText('Add a title.')).toBeTruthy();
    expect(screen.getByText('Add a message.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Title'));
    expect(store.getState().announcements).toHaveLength(8);
  });

  it('3: opening, rerendering, and reloading details never acknowledges', () => {
    store.switchUser('alex-rivera');
    render(<App />);
    const before = structuredClone(store.getState());
    const link = screen.getByRole('link', { name: /Revised closing safety procedure/ });
    fireEvent.click(link);
    route(link.getAttribute('href')!);
    expect(screen.getByRole('button', { name: "Confirm I've read this" })).toBeTruthy();
    finishSaving();
    cleanup();
    reloadStore();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Revised closing safety procedure' })).toBeTruthy();
    expect(store.getState()).toEqual(before);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(before);
  });

  it('4: five rapid confirmation clicks create one record and increase the manager count by one', () => {
    store.switchUser('alex-rivera');
    route('#/update/closing-safety');
    render(<App />);
    const before = store.getState().acknowledgments.length;
    passClosingCheck();
    const button = screen.getByRole('button', { name: "Confirm I've read this" });
    act(() => { for (let i = 0; i < 5; i++) fireEvent.click(button); });
    expect(screen.getByRole('button', { name: 'Saving…' }).hasAttribute('disabled')).toBe(true);
    finishSaving();
    expect(store.getState().acknowledgments).toHaveLength(before + 1);
    expect(store.getState().acknowledgments.filter(ack => ack.announcementId === 'closing-safety' && ack.userId === 'alex-rivera'))
      .toHaveLength(1);
    expect(screen.getByRole('status').textContent).toMatch(/^Confirmed on /);
    expect(screen.queryByRole('button', { name: "Confirm I've read this" })).toBeNull();
    viewer('rachel-kim');
    route('#/update/closing-safety');
    expect(screen.getByText('3 of 4 acknowledged')).toBeTruthy();
  });

  it.each(MANAGERS)('5–6: $name sees correct rendered counts and list contents for every seeded detail', manager => {
    store.switchUser(manager.id);
    render(<App />);
    for (const announcement of store.getState().announcements) {
      route(`#/update/${announcement.id}`);
      if (manager.role === 'store-manager' && !announcement.audienceStoreIds.includes(manager.storeId)) {
        expect(screen.getByRole('heading', { name: "This update isn't available" })).toBeTruthy();
        continue;
      }
      if (!announcement.requiresAck) {
        expect(screen.getByText('No acknowledgment required')).toBeTruthy();
        expect(document.querySelectorAll('.people-list li')).toHaveLength(0);
        continue;
      }
      const recipients = EMPLOYEES.filter(employee => announcement.audienceStoreIds.includes(employee.storeId) &&
        (manager.role !== 'store-manager' || employee.storeId === manager.storeId));
      const acknowledged = recipients.filter(employee => store.getState().acknowledgments.some(ack =>
        ack.announcementId === announcement.id && ack.userId === employee.id));
      expect(screen.getByText(`${acknowledged.length} of ${recipients.length} acknowledged`)).toBeTruthy();
      const ackList = screen.getByRole('region', { name: `Acknowledged (${acknowledged.length})` });
      const pendingList = screen.getByRole('region', { name: `Still pending (${recipients.length - acknowledged.length})` });
      expect(within(ackList).getAllByRole('listitem')).toHaveLength(acknowledged.length);
      expect(within(pendingList).getAllByRole('listitem')).toHaveLength(recipients.length - acknowledged.length);
      for (const employee of EMPLOYEES) {
        const listed = document.querySelector('.manager-tracking')?.textContent?.includes(employee.name);
        expect(listed).toBe(recipients.some(recipient => recipient.id === employee.id));
      }
    }
  });

  it('7, 9: Rachel publishes, Alex confirms, Rachel sees 0→1 of 4, Maya cannot access it, and all changes reload', () => {
    render(<App />);
    const announcement = publishFromForm();
    expect(screen.getByText('0 of 4 acknowledged')).toBeTruthy();
    viewer('alex-rivera');
    expect(screen.getByRole('link', { name: /QA closing checklist/ })).toBeTruthy();
    route(`#/update/${announcement.id}`);
    fireEvent.click(screen.getByRole('button', { name: "Confirm I've read this" }));
    finishSaving();
    viewer('rachel-kim');
    route(`#/update/${announcement.id}`);
    expect(screen.getByText('1 of 4 acknowledged')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Acknowledged (1)' }).textContent).toContain('Alex Rivera');
    viewer('maya-chen');
    expect(screen.queryByRole('link', { name: /QA closing checklist/ })).toBeNull();
    expect(screen.getByRole('heading', { name: "You're all caught up" })).toBeTruthy();
    route(`#/update/${announcement.id}`);
    expect(screen.getByRole('heading', { name: "This update isn't available" })).toBeTruthy();
    const expected = structuredClone(store.getState());
    cleanup();
    reloadStore();
    render(<App />);
    expect(store.getState()).toEqual(expected);
    expect((screen.getByRole('combobox', { name: 'Viewing as' }) as HTMLSelectElement).value).toBe('maya-chen');
    viewer('rachel-kim');
    route(`#/update/${announcement.id}`);
    expect(screen.getByText('1 of 4 acknowledged')).toBeTruthy();
  });

  it.each([null, '', ' ', '{broken', 'null', '[]', '{}',
    JSON.stringify({ ...buildSeed(now), version: 0 }),
    JSON.stringify({ ...buildSeed(now), announcements: [null] }),
    JSON.stringify({ ...buildSeed(now), acknowledgments: [null] }),
  ])('8: malformed or missing localStorage (%s) renders seed without crashing', raw => {
    localStorage.clear();
    if (raw !== null) localStorage.setItem(STORAGE_KEY, raw);
    reloadStore();
    render(<App />);
    expect(store.getState()).toEqual(buildSeed(now));
    expect(screen.getByRole('heading', { name: 'Updates' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(buildSeed(now));
  });

  it.each(['rachel-kim', 'michael-torres', 'alex-rivera', 'maya-chen'])('10: reload every screen and bad routes as %s', userId => {
    store.switchUser(userId);
    for (const hash of ['#/', '#/post', '#/update/closing-safety', '#/update/nope', '#/update/%E0%A4%A', '#/unknown']) {
      route(hash);
      render(<App />);
      const heading = screen.getAllByRole('heading')[0].textContent;
      expect(heading).toBeTruthy();
      expect(screen.getByRole('main')).toBe(document.activeElement);
      if (hash.includes('nope') || hash.includes('%E0')) {
        expect(screen.getByRole('heading', { name: "This update isn't available" })).toBeTruthy();
      }
      cleanup();
      reloadStore();
      render(<App />);
      expect(screen.getAllByRole('heading')[0].textContent).toBe(heading);
      expect(store.getState().currentUserId).toBe(userId);
      cleanup();
    }
  });

  it('11: labeled native controls support focus, form submission, and keyboard-origin confirmation', () => {
    route('#/post');
    render(<App />);
    const title = screen.getByRole('textbox', { name: 'Title' });
    const message = screen.getByRole('textbox', { name: 'Message' });
    const safety = screen.getByRole('button', { name: 'Safety' });
    const submit = screen.getByRole('button', { name: 'Publish update' });
    for (const control of [title, message, safety, submit]) {
      control.focus();
      expect(document.activeElement).toBe(control);
      expect(control.tabIndex).toBe(0);
    }
    expect(title.tagName).toBe('INPUT');
    expect(message.tagName).toBe('TEXTAREA');
    expect(safety.tagName).toBe('BUTTON');
    expect(submit.getAttribute('type')).toBe('submit');
    fireEvent.change(title, { target: { value: 'Keyboard posting' } });
    fireEvent.change(message, { target: { value: 'Keep emergency exits clear.' } });
    safety.focus();
    fireEvent.keyDown(safety, { key: ' ' });
    fireEvent.keyUp(safety, { key: ' ' });
    // jsdom has no native keyboard default actions. A browser emits a detail:0
    // click for keyboard activation; the real Tab/Enter/Space path is also checked in-browser.
    fireEvent.click(safety, { detail: 0 });
    expect((screen.getByRole('switch', { name: 'Requires acknowledgment' }) as HTMLInputElement).checked).toBe(true);
    submit.focus();
    fireEvent.keyDown(submit, { key: 'Enter' });
    fireEvent.submit(submit.closest('form')!);
    const announcement = store.getState().announcements.at(-1)!;
    expect(announcement.title).toBe('Keyboard posting');
    expect(announcement.recipientIds).toHaveLength(4);
    viewer('alex-rivera');
    route(`#/update/${announcement.id}`);
    const confirmButton = screen.getByRole('button', { name: "Confirm I've read this" });
    expect(confirmButton.tagName).toBe('BUTTON');
    expect(confirmButton.tabIndex).toBe(0);
    confirmButton.focus();
    expect(document.activeElement).toBe(confirmButton);
    fireEvent.keyDown(confirmButton, { key: ' ' });
    fireEvent.keyUp(confirmButton, { key: ' ' });
    fireEvent.click(confirmButton, { detail: 0 });
    finishSaving();
    expect(screen.getByRole('status').textContent).toMatch(/^Confirmed on /);
    expect(store.getState().acknowledgments.filter(ack => ack.announcementId === announcement.id && ack.userId === 'alex-rivera'))
      .toHaveLength(1);
  });

  it('regression: an explicit confirmation survives immediate navigation away', () => {
    store.switchUser('alex-rivera');
    route('#/update/closing-safety');
    render(<App />);
    passClosingCheck();
    fireEvent.click(screen.getByRole('button', { name: "Confirm I've read this" }));
    route('#/');
    finishSaving();
    cleanup();
    reloadStore();
    expect(store.getState().acknowledgments.filter(ack => ack.announcementId === 'closing-safety' && ack.userId === 'alex-rivera'))
      .toHaveLength(1);
  });

  it('regression: switching viewers immediately after confirming keeps the acknowledgment with Alex', () => {
    store.switchUser('alex-rivera');
    route('#/update/closing-safety');
    render(<App />);
    passClosingCheck();
    fireEvent.click(screen.getByRole('button', { name: "Confirm I've read this" }));
    viewer('maya-chen');
    finishSaving();
    const acknowledgments = store.getState().acknowledgments.filter(ack => ack.announcementId === 'closing-safety');
    expect(acknowledgments.filter(ack => ack.userId === 'alex-rivera')).toHaveLength(1);
    expect(acknowledgments.some(ack => ack.userId === 'maya-chen')).toBe(false);
  });
});
