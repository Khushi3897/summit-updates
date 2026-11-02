import { useEffect, useRef, useState } from 'react';
import { USERS } from '../lib/constants';
import { CATEGORY_LABELS, dateAndTime } from '../lib/presentation';
import { getEmployeeUpdate } from '../lib/rules';
import { confirm } from '../lib/store';
import type { AppState, Employee } from '../lib/types';

export function UpdateDetail({ id, user, state }: { id: string; user: Employee; state: AppState }) {
  const update = getEmployeeUpdate(user, id, state.announcements, state.acknowledgments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  if (!update) {
    return (
      <section className="empty-state">
        <h1>This update isn't available</h1>
        <a className="back-link" href="#/">Back to feed</a>
      </section>
    );
  }
  const { announcement, confirmation } = update;
  const author = USERS.find(person => person.id === announcement.authorId);

  function handleConfirm() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    // Yield to render the disabled saving state before the synchronous store write.
    saveTimer.current = setTimeout(() => {
      const result = confirm(id);
      if (!result.ok) setError(result.error);
      savingRef.current = false;
      setSaving(false);
    }, 0);
  }

  return (
    <article className={`update-detail${confirmation.kind !== 'routine' ? ' has-confirmation' : ''}`}>
      <a className="back-link" href="#/">← Back to feed</a>
      <div className="detail-content">
        <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
        <h1>{announcement.title}</h1>
        <p className="byline">
          <span>{author?.name}</span>
          <time dateTime={announcement.publishedAt}>{dateAndTime(announcement.publishedAt)}</time>
        </p>
        <p className="full-body">{announcement.body}</p>
      </div>
      {confirmation.kind !== 'routine' && (
        <div className="confirmation-bar">
          <div className="confirmation-inner">
            {error && <p className="save-error" role="alert">{error}</p>}
            {confirmation.kind === 'confirmed' ? (
              <p className="confirmed-message" role="status">
                Confirmed on <time dateTime={confirmation.ackedAt}>{dateAndTime(confirmation.ackedAt)}</time>
              </p>
            ) : (
              <button className="confirm-button" type="button" disabled={saving}
                aria-busy={saving} onClick={handleConfirm}>
                {saving ? 'Saving…' : "Confirm I've read this"}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
