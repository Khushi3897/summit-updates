import { useEffect, useRef, useState } from 'react';
import { USERS } from '../lib/constants';
import { CATEGORY_LABELS, dateAndTime } from '../lib/presentation';
import { evaluateQuickCheck, getEmployeeUpdate } from '../lib/rules';
import { confirm } from '../lib/store';
import type { AppState, Employee } from '../lib/types';

export function UpdateDetail({ id, user, state }: { id: string; user: Employee; state: AppState }) {
  const update = getEmployeeUpdate(user, id, state.announcements, state.acknowledgments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number>();
  const [checkedAnswer, setCheckedAnswer] = useState<number>();
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
  const checkFeedback = evaluateQuickCheck(announcement.quickCheck, checkedAnswer);

  function handleConfirm() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    // Persist the explicit action now so navigating away cannot cancel it.
    const result = confirm(id, checkedAnswer);
    if (!result.ok) setError(result.error);
    // The timer controls only the brief disabled saving indicator.
    saveTimer.current = setTimeout(() => {
      savingRef.current = false;
      setSaving(false);
    }, 0);
  }

  return (
    <article className={`update-detail${confirmation.kind !== 'routine' ? ' has-confirmation' : ''}`}>
      <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to feed</a>
      <div className="detail-content">
        <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
        <h1>{announcement.title}</h1>
        <p className="byline">
          <span>{author?.name}</span>
          <time dateTime={announcement.publishedAt}>{dateAndTime(announcement.publishedAt)}</time>
        </p>
        <p className="full-body">{announcement.body}</p>
      </div>
      {announcement.quickCheck && confirmation.kind === 'pending' && <section className="quick-check" aria-labelledby="quick-check-heading">
        <h2 id="quick-check-heading">Quick check</h2>
        <p className="field-help">One key detail before you confirm.</p>
        <fieldset aria-describedby="answer-help">
          <legend>{announcement.quickCheck.question}</legend>
          {announcement.quickCheck.options.map((option, index) => <label className="check-label answer-choice" key={index}>
            <input type="radio" name="quick-check-answer" checked={selectedAnswer === index}
              onChange={() => { setSelectedAnswer(index); setCheckedAnswer(undefined); }} />
            {option}
          </label>)}
        </fieldset>
        <button type="button" className="check-answer-button" disabled={selectedAnswer === undefined}
          onClick={() => setCheckedAnswer(selectedAnswer)}>Check answer</button>
        <p className="field-help" id="answer-help">Choose an answer, then check it before confirming.</p>
        {checkFeedback.message && <p className={`check-feedback check-feedback-${checkFeedback.kind}`} role="status">
          {checkFeedback.message}
        </p>}
      </section>}
      {confirmation.kind !== 'routine' && (
        <div className="confirmation-bar">
          <div className="confirmation-inner">
            {error && <p className="save-error" role="alert">{error}</p>}
            {confirmation.kind === 'confirmed' && !saving ? (
              <p className="confirmed-message" role="status">
                Confirmed on <time dateTime={confirmation.ackedAt}>{dateAndTime(confirmation.ackedAt)}</time>
              </p>
            ) : (
              <>
                {!checkFeedback.canConfirm && <p className="field-help confirm-help" id="confirm-help">Answer the quick check above to confirm.</p>}
                <button className="confirm-button" type="button" disabled={saving || !checkFeedback.canConfirm}
                  aria-busy={saving} aria-describedby={!checkFeedback.canConfirm ? 'confirm-help' : undefined} onClick={handleConfirm}>
                  {saving ? 'Saving…' : "Confirm I've read this"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
