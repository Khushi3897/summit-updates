import { useState } from 'react';
import type { Route } from '../lib/presentation';
import type { AppState, Manager } from '../lib/types';
import { ManagerTracking } from './ManagerTracking';
import { ManagerUpdates } from './ManagerUpdates';
import { PostUpdate } from './PostUpdate';

export function ManagerExperience({ user, state, route }: { user: Manager; state: AppState; route: Route }) {
  const [publishedId, setPublishedId] = useState<string>();
  return (
    <>
      <nav className="manager-tabs" aria-label="Manager navigation">
        <a href="#/" aria-current={route.screen !== 'post' ? 'page' : undefined}>Updates</a>
        <a href="#/post" aria-current={route.screen === 'post' ? 'page' : undefined}>Post an update</a>
      </nav>
      {route.screen === 'post' ? <PostUpdate user={user} onPublished={announcement => setPublishedId(announcement.id)} /> :
        route.screen === 'update' ? <ManagerTracking id={route.id} user={user} state={state} published={publishedId === route.id} /> :
          <ManagerUpdates user={user} state={state} />}
    </>
  );
}
