import { useSyncExternalStore } from 'react';
import { getState, subscribe } from './store';

export function useAppState() {
  return useSyncExternalStore(subscribe, getState, getState);
}
