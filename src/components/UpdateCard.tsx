import { CATEGORY_LABELS, relativeDate } from '../lib/presentation';
import { getConfirmationStatus } from '../lib/rules';
import type { Acknowledgment, Announcement } from '../lib/types';

export function UpdateCard({ announcement, userId, acknowledgments }: {
  announcement: Announcement; userId: string; acknowledgments: readonly Acknowledgment[];
}) {
  const confirmation = getConfirmationStatus(announcement, userId, acknowledgments);
  return (
    <li>
      <a className="update-card" href={`#/update/${encodeURIComponent(announcement.id)}`}>
        <div className="update-meta">
          <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
          <time dateTime={announcement.publishedAt}>{relativeDate(announcement.publishedAt, new Date())}</time>
        </div>
        <h3>{announcement.title}</h3>
        <p className="preview">{announcement.body}</p>
        {confirmation.kind === 'pending' && <span className="chip chip-pending">Confirmation needed</span>}
        {confirmation.kind === 'confirmed' && <span className="chip chip-confirmed">Confirmed</span>}
      </a>
    </li>
  );
}
