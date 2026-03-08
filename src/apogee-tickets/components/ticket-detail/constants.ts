/**
 * TicketDetailDrawer — Constants and types
 * Extracted from TicketDetailDrawer.tsx for maintainability
 */

import type { AuthorType, ReportedBy } from '../../types';

export const AUTHOR_COLORS: Record<AuthorType, string> = {
  HC: 'bg-helpconfort-blue text-white',
  APOGEE: 'bg-purple-600 text-white',
};

export const ORIGINE_OPTIONS: { value: ReportedBy; label: string }[] = [
  { value: 'JEROME', label: 'Jérôme' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'ERIC', label: 'Éric' },
  { value: 'MARIE', label: 'Marie' },
  { value: 'MATHILDE', label: 'Mathilde' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'HUGO', label: 'Hugo (Apogée)' },
  { value: 'AUTRE', label: 'Autre' },
];

export const MAX_VISIBLE_COMMENTS = 3;

/** Format ticket reference: APO-001 */
export function formatTicketRef(ticketNumber: number | undefined): string {
  return `APO-${String(ticketNumber || 0).padStart(3, '0')}`;
}
