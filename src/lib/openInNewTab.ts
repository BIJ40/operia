/**
 * openInNewTab - Ouvre une route dans un nouvel onglet.
 *
 * IMPORTANT (Preview Lovable) : certaines sessions de preview nécessitent le param
 * `__lovable_token` dans l'URL. Si on ouvre un nouvel onglet sans ce paramètre,
 * l'utilisateur peut être renvoyé vers l'accueil.
 */

export function openInNewTabPreservingPreviewToken(pathname: string) {
  if (typeof window === "undefined" || !pathname) return;

  const url = new URL(pathname, window.location.origin);
  const params = new URLSearchParams(window.location.search);
  const previewToken = params.get("__lovable_token");

  if (previewToken) {
    url.searchParams.set("__lovable_token", previewToken);
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
