import { useState } from 'react';
import { AckProgress } from '../components/AckProgress';
import { USERS } from '../lib/constants';
import { CATEGORY_LABELS, dateAndTime, relativeDate } from '../lib/presentation';
import { getAckSummary, getFollowUpAnnouncements, getManagerAnnouncements } from '../lib/rules';
import type { AppState, Manager } from '../lib/types';

export function ManagerUpdates({ user, state }: { user: Manager; state: AppState }) {
  const [followUp, setFollowUp] = useState(false);
  const visible = getManagerAnnouncements(user, state.announcements);
  const announcements = followUp
    ? getFollowUpAnnouncements(user, state.announcements, state.acknowledgments) : visible;
  return (
    <section aria-labelledby="manager-updates">
      <div className="updates-heading">
        <h1 id="manager-updates">Updates</h1>
        <label className="check-label">
          <input type="checkbox" checked={followUp} onChange={event => setFollowUp(event.target.checked)} />
          Needs follow-up
        </label>
      </div>
      {visible.length === 0 ? (
        <div className="empty-state"><h2>No updates yet</h2><p>Post your first update to get started.</p></div>
      ) : announcements.length === 0 ? (
        <div className="empty-state"><h2>No updates need follow-up</h2></div>
      ) : (
        <ul className="update-list">
          {announcements.map(announcement => (
            <li key={announcement.id}>
              <a className="update-card" href={`#/update/${encodeURIComponent(announcement.id)}`}>
                <div className="update-meta">
                  <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
                  <time dateTime={announcement.publishedAt} title={dateAndTime(announcement.publishedAt)}>
                    {relativeDate(announcement.publishedAt, new Date())}
                  </time>
                </div>
                <h2>{announcement.title}</h2>
                {announcement.requiresAck ? (
                  <AckProgress summary={getAckSummary(announcement, state.acknowledgments, USERS, user)} />
                ) : <p className="no-ack">No acknowledgment required</p>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
