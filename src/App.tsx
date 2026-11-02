import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { USERS } from './lib/constants';
import { useAppState } from './lib/useAppState';
import { useHashRoute } from './lib/useHashRoute';
import { Feed } from './screens/Feed';
import { UpdateDetail } from './screens/UpdateDetail';
import { ManagerExperience } from './screens/ManagerExperience';

export default function App() {
  const state = useAppState();
  const user = USERS.find(person => person.id === state.currentUserId)!;
  const route = useHashRoute();
  const main = useRef<HTMLElement>(null);
  const routeKey = route.screen === 'update' ? `update/${route.id}` : route.screen;
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [routeKey]);
  return (
    <>
      <Header currentUserId={state.currentUserId} />
      <main ref={main} tabIndex={-1}>
        {user.role !== 'employee' ? <ManagerExperience key={user.id} user={user} state={state} route={route} /> :
          route.screen === 'update' ? <UpdateDetail key={`${user.id}/${route.id}`} id={route.id} user={user} state={state} /> :
            <Feed user={user} state={state} />}
      </main>
    </>
  );
}
