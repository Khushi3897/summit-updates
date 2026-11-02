import { CATEGORY_LABELS, relativeDate } from '../lib/presentation';
import { getConfirmationStatus } from '../lib/rules';
import type { Acknowledgment, Announcement } from '../lib/types';

export function UpdateCard({ announcement, userId, acknowledgments, headingLevel = 3 }: {
  announcement: Announcement; userId: string; acknowledgments: readonly Acknowledgment[]; headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const confirmation = getConfirmationStatus(announcement, userId, acknowledgments);
  return (
    <li>
      <a className="update-card" href={`#/update/${encodeURIComponent(announcement.id)}`}>
        <div className="update-meta">
          <span className="category">{CATEGORY_LABELS[announcement.category]}</span>
          <time dateTime={announcement.publishedAt}>{relativeDate(announcement.publishedAt, new Date())}</time>
        </div>
        <Heading>{announcement.title}</Heading>
        <p className="preview">{announcement.body}</p>
        {confirmation.kind === 'pending' && <span className="chip chip-pending">Confirmation needed</span>}
        {confirmation.kind === 'confirmed' && <span className="chip chip-confirmed">Confirmed</span>}
      </a>
    </li>
  );
}
