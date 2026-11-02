import type { Employee, Manager, Store, User } from './types';

export const STORES: readonly Store[] = [
  { id: 'bellevue', name: 'Summit Bellevue' },
  { id: 'downtown', name: 'Summit Downtown Seattle' },
  { id: 'redmond', name: 'Summit Redmond' },
  { id: 'kirkland', name: 'Summit Kirkland' },
  { id: 'tacoma', name: 'Summit Tacoma' },
];

export const MANAGERS: readonly Manager[] = [
  { id: 'michael-torres', name: 'Michael Torres', role: 'operations-manager' },
  { id: 'rachel-kim', name: 'Rachel Kim', role: 'store-manager', storeId: 'bellevue' },
];

export const EMPLOYEES: readonly Employee[] = [
  { id: 'alex-rivera', name: 'Alex Rivera', role: 'employee', storeId: 'bellevue' },
  { id: 'priya-shah', name: 'Priya Shah', role: 'employee', storeId: 'bellevue' },
  { id: 'jordan-brooks', name: 'Jordan Brooks', role: 'employee', storeId: 'bellevue' },
  { id: 'sofia-martinez', name: 'Sofia Martinez', role: 'employee', storeId: 'bellevue' },
  { id: 'ethan-nguyen', name: 'Ethan Nguyen', role: 'employee', storeId: 'bellevue' },
  { id: 'amina-yusuf', name: 'Amina Yusuf', role: 'employee', storeId: 'bellevue' },
  { id: 'daniel-park', name: 'Daniel Park', role: 'employee', storeId: 'bellevue' },
  { id: 'grace-thompson', name: 'Grace Thompson', role: 'employee', storeId: 'bellevue' },
  { id: 'luis-garcia', name: 'Luis Garcia', role: 'employee', storeId: 'downtown' },
  { id: 'olivia-wilson', name: 'Olivia Wilson', role: 'employee', storeId: 'downtown' },
  { id: 'noah-patel', name: 'Noah Patel', role: 'employee', storeId: 'downtown' },
  { id: 'fatima-hassan', name: 'Fatima Hassan', role: 'employee', storeId: 'downtown' },
  { id: 'benjamin-lee', name: 'Benjamin Lee', role: 'employee', storeId: 'downtown' },
  { id: 'isabella-rossi', name: 'Isabella Rossi', role: 'employee', storeId: 'downtown' },
  { id: 'marcus-johnson', name: 'Marcus Johnson', role: 'employee', storeId: 'downtown' },
  { id: 'harper-davis', name: 'Harper Davis', role: 'employee', storeId: 'redmond' },
  { id: 'arjun-mehta', name: 'Arjun Mehta', role: 'employee', storeId: 'redmond' },
  { id: 'elena-petrova', name: 'Elena Petrova', role: 'employee', storeId: 'redmond' },
  { id: 'samuel-okafor', name: 'Samuel Okafor', role: 'employee', storeId: 'redmond' },
  { id: 'chloe-bennett', name: 'Chloe Bennett', role: 'employee', storeId: 'redmond' },
  { id: 'diego-morales', name: 'Diego Morales', role: 'employee', storeId: 'redmond' },
  { id: 'yuna-kim', name: 'Yuna Kim', role: 'employee', storeId: 'redmond' },
  { id: 'ava-robinson', name: 'Ava Robinson', role: 'employee', storeId: 'kirkland' },
  { id: 'omar-ali', name: 'Omar Ali', role: 'employee', storeId: 'kirkland' },
  { id: 'lucas-anderson', name: 'Lucas Anderson', role: 'employee', storeId: 'kirkland' },
  { id: 'mei-lin', name: 'Mei Lin', role: 'employee', storeId: 'kirkland' },
  { id: 'natalie-cruz', name: 'Natalie Cruz', role: 'employee', storeId: 'kirkland' },
  { id: 'isaac-cohen', name: 'Isaac Cohen', role: 'employee', storeId: 'kirkland' },
  { id: 'maya-chen', name: 'Maya Chen', role: 'employee', storeId: 'tacoma' },
  { id: 'james-wright', name: 'James Wright', role: 'employee', storeId: 'tacoma' },
  { id: 'leila-rahman', name: 'Leila Rahman', role: 'employee', storeId: 'tacoma' },
  { id: 'gabriel-santos', name: 'Gabriel Santos', role: 'employee', storeId: 'tacoma' },
  { id: 'zoe-mitchell', name: 'Zoe Mitchell', role: 'employee', storeId: 'tacoma' },
  { id: 'henry-adams', name: 'Henry Adams', role: 'employee', storeId: 'tacoma' },
  { id: 'nina-desai', name: 'Nina Desai', role: 'employee', storeId: 'tacoma' },
];

export const USERS: readonly User[] = [...MANAGERS, ...EMPLOYEES];
export const DEFAULT_USER_ID = 'rachel-kim';
export const STORAGE_KEY = 'summit-updates:v1';
