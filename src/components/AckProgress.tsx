import type { AckBreakdown } from '../lib/types';

export function AckProgress({ summary }: { summary: AckBreakdown }) {
  const label = `${summary.acknowledgedCount} of ${summary.total} acknowledged`;
  return (
    <div className="ack-progress">
      <p>{label}</p>
      <progress aria-label={label} max={summary.total || 1} value={summary.acknowledgedCount} />
    </div>
  );
}
