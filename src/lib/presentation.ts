import { EMPLOYEES, MANAGERS, STORES } from './constants';
import type { Category } from './types';

export const VIEWER_GROUPS = [
  { label: 'Managers', users: MANAGERS },
  ...STORES.map(store => ({
    label: store.name,
    users: EMPLOYEES.filter(employee => employee.storeId === store.id),
  })),
];

export const CATEGORY_LABELS: Record<Category, string> = {
  safety: 'Safety', policy: 'Policy', general: 'General',
};

export function storeName(id: string): string {
  return STORES.find(store => store.id === id)?.name ?? id;
}

export function audienceNames(storeIds: readonly string[]): string {
  return storeIds.map(storeName).join(', ');
}

export function relativeDate(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function dateAndTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso));
}

export type Route = { screen: 'feed' } | { screen: 'post' } | { screen: 'update'; id: string };

export function parseHash(hash: string): Route {
  if (hash === '#/post') return { screen: 'post' };
  const match = /^#\/update\/([^/]+)$/.exec(hash);
  if (match) {
    try { return { screen: 'update', id: decodeURIComponent(match[1]) }; }
    catch { return { screen: 'update', id: '' }; }
  }
  return { screen: 'feed' };
}
