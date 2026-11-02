import { UpdateCard } from '../components/UpdateCard';
import { getEmployeeFeed } from '../lib/rules';
import type { AppState, Employee } from '../lib/types';

export function Feed({ user, state }: { user: Employee; state: AppState }) {
  const feed = getEmployeeFeed(user, state.announcements, state.acknowledgments);
  if (feed.needsConfirmation.length + feed.recent.length === 0) {
    return (
      <section className="empty-state" aria-labelledby="no-updates">
        <h1 id="no-updates">No updates yet</h1>
        <p>When your manager posts something for your store, it will show up here.</p>
      </section>
    );
  }
  return (
    <>
      {feed.needsConfirmation.length > 0 ? (
        <section className="feed-section" aria-labelledby="needs-confirmation">
          <h1 id="needs-confirmation">Needs your confirmation</h1>
          <ul className="update-list">
            {feed.needsConfirmation.map(announcement => <UpdateCard key={announcement.id}
              announcement={announcement} userId={user.id} acknowledgments={state.acknowledgments} />)}
          </ul>
        </section>
      ) : (
        <section className="empty-state caught-up" aria-labelledby="caught-up">
          <h1 id="caught-up">You're all caught up</h1>
          <p>Nothing needs your confirmation right now.</p>
        </section>
      )}
      <section className="feed-section" aria-labelledby="recent-updates">
        <h2 id="recent-updates">Recent updates</h2>
        <ul className="update-list">
          {feed.recent.map(announcement => <UpdateCard key={announcement.id}
            announcement={announcement} userId={user.id} acknowledgments={state.acknowledgments} />)}
        </ul>
      </section>
    </>
  );
}
