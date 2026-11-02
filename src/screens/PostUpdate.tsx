import { useRef, useState, type FormEvent } from 'react';
import { CATEGORY_LABELS } from '../lib/presentation';
import { defaultRequiresAck, getPostingOptions } from '../lib/rules';
import { publish } from '../lib/store';
import type { Announcement, Manager, ValidationErrors } from '../lib/types';

export function PostUpdate({ user, onPublished }: { user: Manager; onPublished: (announcement: Announcement) => void }) {
  const options = getPostingOptions(user);
  const [input, setInput] = useState(options.initialInput);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const form = useRef<HTMLFormElement>(null);

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
                onClick={() => {
                  if (input.category !== category) setInput({ ...input, category, requiresAck: defaultRequiresAck(category) });
                }}>
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="ack-field">
          <label className="check-label">
            <input type="checkbox" role="switch" checked={input.requiresAck} aria-describedby="ack-help"
              onChange={event => setInput({ ...input, requiresAck: event.target.checked })} />
            Requires acknowledgment
          </label>
          <p id="ack-help" className="field-help">Employees will be asked to tap “Confirm I've read this”. Best for safety and policy updates.</p>
        </div>
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
