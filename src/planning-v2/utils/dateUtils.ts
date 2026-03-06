/**
 * Planning V2 — Date utilities (timezone-safe)
 * Uses local date components instead of UTC to avoid day-shift bugs.
 */

/** Format a Date as "YYYY-MM-DD" using LOCAL timezone */
export function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
