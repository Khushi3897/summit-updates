import { STORES, USERS } from './constants';
import type {
  AckBreakdown, AcknowledgeResult, Acknowledgment, AckSummary, Announcement,
  AnnouncementInput, AppState, Category, Employee, Manager, PublishResult,
  QuickCheck, User, ValidationErrors, ValidationResult,
} from './types';

export function getRecipients(announcement: Announcement, users: readonly User[]): Employee[] {
  return users.filter((user): user is Employee =>
    user.role === 'employee' && announcement.recipientIds.includes(user.id));
}

export function hasAcknowledged(
  announcementId: string, userId: string, acknowledgments: readonly Acknowledgment[],
): boolean {
  return acknowledgments.some(ack => ack.announcementId === announcementId && ack.userId === userId);
}

export function getConfirmationStatus(
  announcement: Announcement, userId: string, acknowledgments: readonly Acknowledgment[],
): { kind: 'routine' } | { kind: 'pending' } | { kind: 'confirmed'; ackedAt: string } {
  if (!announcement.requiresAck) return { kind: 'routine' };
  const acknowledgment = acknowledgments.find(ack =>
    ack.announcementId === announcement.id && ack.userId === userId);
  return acknowledgment ? { kind: 'confirmed', ackedAt: acknowledgment.ackedAt } : { kind: 'pending' };
}

export function getEmployeeUpdate(
  user: Employee, announcementId: string, announcements: readonly Announcement[],
  acknowledgments: readonly Acknowledgment[],
) {
  const announcement = announcements.find(item => item.id === announcementId);
  if (!announcement || !getRecipients(announcement, USERS).some(recipient => recipient.id === user.id)) {
    return null;
  }
  return { announcement, confirmation: getConfirmationStatus(announcement, user.id, acknowledgments) };
}

function newestFirst(announcements: readonly Announcement[]): Announcement[] {
  return [...announcements].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function getEmployeeFeed(
  user: Employee, announcements: readonly Announcement[], acknowledgments: readonly Acknowledgment[],
): { needsConfirmation: Announcement[]; recent: Announcement[] } {
  const needsConfirmation: Announcement[] = [];
  const recent: Announcement[] = [];
  for (const announcement of newestFirst(announcements)) {
    if (!announcement.recipientIds.includes(user.id)) continue;
    if (getConfirmationStatus(announcement, user.id, acknowledgments).kind === 'pending') {
      needsConfirmation.push(announcement);
    } else {
      recent.push(announcement);
    }
  }
  return { needsConfirmation, recent };
}

export function getManagerAnnouncements(
  manager: Manager, announcements: readonly Announcement[],
): Announcement[] {
  return newestFirst(announcements.filter(announcement =>
    manager.role === 'operations-manager' || announcement.audienceStoreIds.includes(manager.storeId)));
}

export function getManagerUpdate(
  manager: Manager, id: string, announcements: readonly Announcement[],
  acknowledgments: readonly Acknowledgment[],
) {
  const announcement = getManagerAnnouncements(manager, announcements).find(item => item.id === id);
  if (!announcement) return null;
  return {
    announcement,
    summary: getAckSummary(announcement, acknowledgments, USERS, manager),
    groupByStore: manager.role === 'operations-manager' && announcement.audienceStoreIds.length > 1,
  };
}

export function getPostingOptions(manager: Manager) {
  const audienceLocked = manager.role === 'store-manager';
  const stores = STORES.filter(store => !audienceLocked || store.id === manager.storeId);
  const initialInput: AnnouncementInput = {
    title: '', body: '', category: 'general', requiresAck: defaultRequiresAck('general'),
    audienceStoreIds: audienceLocked ? stores.map(store => store.id) : [],
  };
  return { stores, audienceLocked, initialInput };
}

export function acknowledge(
  state: AppState, announcementId: string, userId: string, now: Date, answerIndex?: number,
): AcknowledgeResult {
  const announcement = state.announcements.find(item => item.id === announcementId);
  if (!announcement) return { ok: false, error: 'Update not found.' };
  if (!announcement.requiresAck) return { ok: false, error: 'This update does not require acknowledgment.' };
  if (!getRecipients(announcement, USERS).some(user => user.id === userId)) {
    return { ok: false, error: 'Only a recipient can acknowledge this update.' };
  }
  if (hasAcknowledged(announcementId, userId, state.acknowledgments)) return { ok: true, state };
  if (!evaluateQuickCheck(announcement.quickCheck, answerIndex).canConfirm) {
    return { ok: false, error: 'Answer the quick check correctly before confirming.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      acknowledgments: [...state.acknowledgments, { announcementId, userId, ackedAt: now.toISOString() }],
    },
  };
}

function summarize(
  recipients: readonly Employee[], announcementId: string, acknowledgments: readonly Acknowledgment[],
): AckBreakdown {
  const acknowledged: AckBreakdown['acknowledged'] = [];
  const pending: Employee[] = [];
  for (const user of recipients) {
    const ack = acknowledgments.find(item => item.announcementId === announcementId && item.userId === user.id);
    if (ack) acknowledged.push({ user, ackedAt: ack.ackedAt });
    else pending.push(user);
  }
  return {
    total: recipients.length,
    acknowledgedCount: acknowledged.length,
    pendingCount: pending.length,
    acknowledged,
    pending,
  };
}

export function getAckSummary(
  announcement: Announcement, acknowledgments: readonly Acknowledgment[], users: readonly User[], viewer: User,
): AckSummary {
  const recipients = getRecipients(announcement, users).filter(user =>
    viewer.role !== 'store-manager' ||
    (announcement.audienceStoreIds.includes(viewer.storeId) && user.storeId === viewer.storeId));
  const storeIds = [...new Set(recipients.map(user => user.storeId))];
  return {
    ...summarize(recipients, announcement.id, acknowledgments),
    byStore: storeIds.map(storeId => ({
      storeId,
      ...summarize(recipients.filter(user => user.storeId === storeId), announcement.id, acknowledgments),
    })),
  };
}

export function getFollowUpAnnouncements(
  manager: Manager, announcements: readonly Announcement[], acknowledgments: readonly Acknowledgment[],
): Announcement[] {
  return getManagerAnnouncements(manager, announcements).filter(announcement =>
    announcement.requiresAck && getAckSummary(announcement, acknowledgments, USERS, manager).pendingCount > 0);
}

export function defaultRequiresAck(category: Category): boolean {
  return category === 'safety' || category === 'policy';
}

export function setAcknowledgmentRequired(input: AnnouncementInput, requiresAck: boolean): AnnouncementInput {
  if (requiresAck) return { ...input, requiresAck };
  const { quickCheck: _quickCheck, ...rest } = input;
  return { ...rest, requiresAck };
}

export function setAnnouncementCategory(input: AnnouncementInput, category: Category): AnnouncementInput {
  return input.category === category ? input :
    setAcknowledgmentRequired({ ...input, category }, defaultRequiresAck(category));
}

export function setQuickCheckEnabled(input: AnnouncementInput, enabled: boolean): AnnouncementInput {
  if (enabled && input.requiresAck) return {
    ...input,
    quickCheck: input.quickCheck ?? { question: '', options: ['', ''], correctOptionIndex: 0, explanation: '' },
  };
  const { quickCheck: _quickCheck, ...rest } = input;
  return rest;
}

export function evaluateQuickCheck(quickCheck: QuickCheck | undefined, answerIndex?: number) {
  if (!quickCheck) return { kind: 'not-required', canConfirm: true, message: '' } as const;
  if (answerIndex === undefined) return { kind: 'unanswered', canConfirm: false, message: '' } as const;
  if (answerIndex === quickCheck.correctOptionIndex) return {
    kind: 'correct', canConfirm: true, message: "That's right. You can now confirm you've read this.",
  } as const;
  return {
    kind: 'incorrect', canConfirm: false,
    message: `${quickCheck.explanation} Review the update and try again.`,
  } as const;
}

export function validateQuickCheck(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return 'Add a valid quick check.';
  const check = value as Record<string, unknown>;
  if (typeof check.question !== 'string' || !check.question.trim()) return 'Add a quick-check question.';
  if (check.question.trim().length > 160) return 'Question is too long (160 max).';
  if (!Array.isArray(check.options) || check.options.length !== 2 ||
      !check.options.every(option => typeof option === 'string' && option.trim())) return 'Add two answer choices.';
  const options = check.options as string[];
  if (options.some(option => option.trim().length > 120)) return 'Answer choice is too long (120 max).';
  if (options[0].trim().toLowerCase() === options[1].trim().toLowerCase()) return 'Use two different answer choices.';
  if (check.correctOptionIndex !== 0 && check.correctOptionIndex !== 1) return 'Choose the correct answer.';
  if (typeof check.explanation !== 'string' || !check.explanation.trim()) return 'Add an explanation to help employees try again.';
  if (check.explanation.trim().length > 300) return 'Explanation is too long (300 max).';
  return undefined;
}

export function validateAnnouncementInput(input: AnnouncementInput, author: User): ValidationResult {
  const errors: ValidationErrors = {};
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) errors.title = 'Add a title.';
  else if (title.length > 80) errors.title = 'Title is too long (80 max).';
  if (!body) errors.body = 'Add a message.';
  else if (body.length > 1000) errors.body = 'Message is too long (1000 max).';
  if (input.audienceStoreIds.length === 0) errors.audienceStoreIds = 'Choose at least one store.';
  else if (input.audienceStoreIds.some(id => !STORES.some(store => store.id === id))) {
    errors.audienceStoreIds = 'Choose valid stores.';
  }
  if (!['safety', 'policy', 'general'].includes(input.category)) errors.category = 'Choose a valid category.';
  if (typeof input.requiresAck !== 'boolean') errors.requiresAck = 'Choose whether acknowledgment is required.';
  if (input.quickCheck !== undefined) {
    const error = validateQuickCheck(input.quickCheck);
    if (!input.requiresAck) errors.quickCheck = 'A quick check requires acknowledgment.';
    else if (error) errors.quickCheck = error;
  }
  if (author.role === 'employee') errors.author = 'Only managers can publish updates.';
  if (author.role === 'store-manager' &&
      (new Set(input.audienceStoreIds).size !== 1 || input.audienceStoreIds[0] !== author.storeId)) {
    // Keep the required empty-audience error when no stores are selected.
    if (input.audienceStoreIds.length) errors.audienceStoreIds = 'Rachel can publish only to Bellevue.';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export function createAnnouncement(
  state: AppState, input: AnnouncementInput, author: User, now: Date,
): PublishResult {
  const validation = validateAnnouncementInput(input, author);
  if (!validation.ok) return validation;
  const baseId = `update-${now.getTime()}`;
  let id = baseId;
  let suffix = 1;
  while (state.announcements.some(item => item.id === id)) id = `${baseId}-${suffix++}`;
  const audienceStoreIds = [...new Set(input.audienceStoreIds)];
  const announcement: Announcement = {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    requiresAck: input.requiresAck,
    ...(input.quickCheck ? { quickCheck: {
      question: input.quickCheck.question.trim(),
      options: input.quickCheck.options.map(option => option.trim()) as [string, string],
      correctOptionIndex: input.quickCheck.correctOptionIndex,
      explanation: input.quickCheck.explanation.trim(),
    } } : {}),
    audienceStoreIds,
    recipientIds: USERS.filter((user): user is Employee =>
      user.role === 'employee' && audienceStoreIds.includes(user.storeId)).map(user => user.id),
    authorId: author.id,
    publishedAt: now.toISOString(),
  };
  return { ok: true, state: { ...state, announcements: [...state.announcements, announcement] }, announcement };
}
