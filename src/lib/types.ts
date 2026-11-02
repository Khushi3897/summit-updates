export type Category = 'safety' | 'policy' | 'general';

export interface Store { readonly id: string; readonly name: string }
interface Person { readonly id: string; readonly name: string }
export interface Employee extends Person {
  readonly role: 'employee';
  readonly storeId: string;
}
export interface OperationsManager extends Person {
  readonly role: 'operations-manager';
}
export interface StoreManager extends Person {
  readonly role: 'store-manager';
  readonly storeId: string;
}
export type Manager = OperationsManager | StoreManager;
export type User = Employee | Manager;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: Category;
  requiresAck: boolean;
  audienceStoreIds: string[];
  recipientIds: string[];
  authorId: string;
  publishedAt: string;
}
export interface Acknowledgment {
  announcementId: string;
  userId: string;
  ackedAt: string;
}
export interface AppState {
  version: 1;
  currentUserId: string;
  announcements: Announcement[];
  acknowledgments: Acknowledgment[];
}
export interface AnnouncementInput {
  title: string;
  body: string;
  category: Category;
  requiresAck: boolean;
  audienceStoreIds: string[];
}
export type ValidationErrors = Partial<Record<keyof AnnouncementInput | 'author', string>>;
export type ValidationResult = { ok: true } | { ok: false; errors: ValidationErrors };
export type PublishResult =
  | { ok: true; state: AppState; announcement: Announcement }
  | { ok: false; errors: ValidationErrors };
export type AcknowledgeResult = { ok: true; state: AppState } | { ok: false; error: string };

export interface AckBreakdown {
  total: number;
  acknowledgedCount: number;
  pendingCount: number;
  acknowledged: { user: Employee; ackedAt: string }[];
  pending: Employee[];
}
export interface AckSummary extends AckBreakdown {
  byStore: (AckBreakdown & { storeId: string })[];
}
