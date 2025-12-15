/**
 * Client-side navigation helper to avoid full page reloads.
 *
 * Useful for navigation triggered outside React Router hooks/components
 * (e.g., utility files, editor helpers).
 */
export function clientNavigate(to: string) {
  // If there's no window (SSR) or to is empty, do nothing.
  if (typeof window === "undefined" || !to) return;

  // Push a new history state and let React Router handle the popstate.
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
