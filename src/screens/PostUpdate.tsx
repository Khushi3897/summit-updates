import { useRef, useState, type FormEvent } from 'react';
import { CATEGORY_LABELS } from '../lib/presentation';
import { getPostingOptions, setAcknowledgmentRequired, setAnnouncementCategory, setQuickCheckEnabled } from '../lib/rules';
import { publish } from '../lib/store';
import type { Announcement, Manager, QuickCheck, ValidationErrors } from '../lib/types';

export function PostUpdate({ user, onPublished }: { user: Manager; onPublished: (announcement: Announcement) => void }) {
  const options = getPostingOptions(user);
  const [input, setInput] = useState(options.initialInput);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const quickCheck = input.quickCheck;

  function updateQuickCheck(patch: Partial<QuickCheck>) {
    if (quickCheck) setInput({ ...input, quickCheck: { ...quickCheck, ...patch } });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = publish(input);
    if (!result.ok) {
      setErrors(result.errors);
      // Move keyboard focus to the first field with a validation error.
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    } else {
      onPublished(result.announcement);
      window.location.hash = `/update/${encodeURIComponent(result.announcement.id)}`;
    }
  }

  return (
    <section aria-labelledby="post-update">
      <h1 id="post-update">Post an update</h1>
      <form ref={form} className="post-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <div className="field-heading"><label htmlFor="title">Title</label><span id="title-count">{input.title.length}/80</span></div>
          <input id="title" type="text" value={input.title} aria-invalid={!!errors.title}
            aria-describedby={`title-count${errors.title ? ' title-error' : ''}`}
            onChange={event => setInput({ ...input, title: event.target.value })} />
          {errors.title && <p id="title-error" className="field-error">{errors.title}</p>}
        </div>
        <div className="form-field">
          <div className="field-heading"><label htmlFor="message">Message</label><span id="message-count">{input.body.length}/1000</span></div>
          <textarea id="message" rows={6} value={input.body} aria-invalid={!!errors.body}
            aria-describedby={`message-count${errors.body ? ' message-error' : ''}`}
            onChange={event => setInput({ ...input, body: event.target.value })} />
          {errors.body && <p id="message-error" className="field-error">{errors.body}</p>}
        </div>
        <fieldset>
          <legend>Category</legend>
          <div className="category-buttons">
            {(['safety', 'policy', 'general'] as const).map(category => (
              <button key={category} type="button" aria-pressed={input.category === category}
                onClick={() => setInput(setAnnouncementCategory(input, category))}>
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="ack-field">
          <label className="check-label">
            <input type="checkbox" role="switch" checked={input.requiresAck} aria-describedby="ack-help"
              onChange={event => setInput(setAcknowledgmentRequired(input, event.target.checked))} />
            Requires acknowledgment
          </label>
          <p id="ack-help" className="field-help">Employees will be asked to tap “Confirm I've read this”. Best for safety and policy updates.</p>
        </div>
        {input.requiresAck && <div className="quick-check-editor">
          <label className="check-label">
            <input type="checkbox" role="switch" checked={!!quickCheck} aria-describedby="quick-check-help"
              onChange={event => setInput(setQuickCheckEnabled(input, event.target.checked))} />
            Add a quick check
          </label>
          <p className="field-help" id="quick-check-help">Optional: one question about a key detail, answered before confirming. Use sparingly for important updates.</p>
          {quickCheck && <fieldset className="quick-check-fields" aria-describedby={errors.quickCheck ? 'quick-check-error' : undefined}>
            <legend>Quick check</legend>
            <div className="form-field">
              <label htmlFor="check-question">Question</label>
              <input id="check-question" value={quickCheck.question} aria-invalid={!!errors.quickCheck}
                aria-describedby={errors.quickCheck ? 'quick-check-error' : undefined}
                onChange={event => updateQuickCheck({ question: event.target.value })} />
              <p className="field-help">Up to 160 characters.</p>
            </div>
            {quickCheck.options.map((option, index) => <div className="form-field" key={index}>
              <label htmlFor={`check-option-${index}`}>Answer choice {index + 1}</label>
              <input id={`check-option-${index}`} value={option} aria-invalid={!!errors.quickCheck}
                aria-describedby={errors.quickCheck ? 'quick-check-error' : undefined}
                onChange={event => {
                  const options: [string, string] = [...quickCheck.options];
                  options[index] = event.target.value;
                  updateQuickCheck({ options });
                }} />
              <p className="field-help">Up to 120 characters.</p>
            </div>)}
            <div className="form-field">
              <label htmlFor="check-correct">Correct answer</label>
              <select id="check-correct" value={quickCheck.correctOptionIndex}
                onChange={event => updateQuickCheck({ correctOptionIndex: Number(event.target.value) as 0 | 1 })}>
                <option value={0}>Answer choice 1</option>
                <option value={1}>Answer choice 2</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="check-explanation">Explanation for a retry</label>
              <textarea id="check-explanation" rows={3} value={quickCheck.explanation} aria-invalid={!!errors.quickCheck}
                aria-describedby={errors.quickCheck ? 'quick-check-error' : 'explanation-help'}
                onChange={event => updateQuickCheck({ explanation: event.target.value })} />
              <p className="field-help" id="explanation-help">Point employees back to the key detail. Up to 300 characters.</p>
            </div>
            {errors.quickCheck && <p className="field-error" id="quick-check-error">{errors.quickCheck}</p>}
          </fieldset>}
        </div>}
        <fieldset aria-describedby={errors.audienceStoreIds ? 'audience-error' : undefined}>
          <legend>Audience</legend>
          {!options.audienceLocked && <button className="all-stores" type="button"
            onClick={() => setInput({ ...input, audienceStoreIds: options.stores.map(store => store.id) })}>All stores</button>}
          {options.stores.map(store => (
            <label key={store.id} className="check-label">
              <input type="checkbox" checked={input.audienceStoreIds.includes(store.id)} disabled={options.audienceLocked}
                aria-invalid={!!errors.audienceStoreIds} aria-describedby={errors.audienceStoreIds ? 'audience-error' : undefined}
                onChange={event => setInput({ ...input, audienceStoreIds: event.target.checked
                  ? [...input.audienceStoreIds, store.id] : input.audienceStoreIds.filter(id => id !== store.id) })} />
              {store.name}
            </label>
          ))}
          {options.audienceLocked && <p className="field-help">You can post to your own store.</p>}
          {errors.audienceStoreIds && <p id="audience-error" className="field-error">{errors.audienceStoreIds}</p>}
        </fieldset>
        {errors.author && <p className="field-error" role="alert">{errors.author}</p>}
        <div className="publish-actions">
          <p className="field-help">Published updates can't be edited. Recipients are fixed when you publish.</p>
          <button className="confirm-button" type="submit">Publish update</button>
        </div>
      </form>
    </section>
  );
}
