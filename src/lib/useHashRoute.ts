import { useSyncExternalStore } from 'react';
import { parseHash } from './presentation';

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '#/');
  return parseHash(hash);
}
