import { AckProgress } from '../components/AckProgress';
import { audienceNames, CATEGORY_LABELS, dateAndTime, storeName } from '../lib/presentation';
import { getManagerUpdate } from '../lib/rules';
import type { AckBreakdown, AppState, Manager } from '../lib/types';

function PeopleList({ summary, kind }: { summary: AckBreakdown; kind: 'acknowledged' | 'pending' }) {
  return kind === 'acknowledged' ? (
    <ul className="people-list">
      {summary.acknowledged.map(({ user, ackedAt }) => (
        <li key={user.id}><span>{user.name}</span><time dateTime={ackedAt}>{dateAndTime(ackedAt)}</time></li>
      ))}
    </ul>
  ) : (
    <ul className="people-list">{summary.pending.map(user => <li key={user.id}>{user.name}</li>)}</ul>
  );
}

export function ManagerTracking({ id, user, state, published }: {
  id: string; user: Manager; state: AppState; published: boolean;
}) {
  const update = getManagerUpdate(user, id, state.announcements, state.acknowledgments);
  if (!update) return (
    <section className="empty-state">
      <h1>This update isn't available</h1><a className="back-link" href="#/">Back to updates</a>
    </section>
  );
  const { announcement, summary, groupByStore } = update;
  return (
    <article className="update-detail manager-tracking">
      <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to updates</a>
      {published && <p className="publish-success" role="status">
        Published to {audienceNames(announcement.audienceStoreIds)}. {announcement.recipientIds.length} employees can see it.
      </p>}
      <div className="detail-content">
        <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
        <h1>{announcement.title}</h1>
        <p className="byline"><time dateTime={announcement.publishedAt}>{dateAndTime(announcement.publishedAt)}</time></p>
        <p className="full-body">{announcement.body}</p>
        <p className="sent-to"><strong>Sent to:</strong> {audienceNames(announcement.audienceStoreIds)}</p>
        {announcement.quickCheck && <section className="quick-check" aria-labelledby="published-check-heading">
          <h2 id="published-check-heading">Quick check</h2>
          <p>{announcement.quickCheck.question}</p>
          <p><strong>Correct answer:</strong> {announcement.quickCheck.options[announcement.quickCheck.correctOptionIndex]}</p>
          <p className="field-help">{announcement.quickCheck.explanation}</p>
        </section>}
      </div>
      {announcement.requiresAck ? (
        <>
          <AckProgress summary={summary} />
          {(['acknowledged', 'pending'] as const).map(kind => (
            kind === 'pending' && summary.pendingCount === 0 ? (
              <p key={kind} className="everyone-acknowledged">Everyone has acknowledged</p>
            ) : (
              <section key={kind} className="tracking-list" aria-labelledby={`list-${kind}`}>
                <h2 id={`list-${kind}`}>
                  {kind === 'acknowledged' ? 'Acknowledged' : 'Still pending'} ({summary[kind].length})
                </h2>
                {groupByStore ? summary.byStore.map(store => (
                  <div className="store-group" key={store.storeId}>
                    <h3>{storeName(store.storeId)} ({store[kind].length})</h3>
                    <PeopleList summary={store} kind={kind} />
                  </div>
                )) : <PeopleList summary={summary} kind={kind} />}
              </section>
            )
          ))}
        </>
      ) : <p className="no-ack">No acknowledgment required</p>}
    </article>
  );
}
