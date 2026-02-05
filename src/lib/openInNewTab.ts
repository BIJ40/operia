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

  // En preview, le token peut avoir été perdu via certaines navigations internes.
  // On le mémorise dès qu'on le voit, et on le réutilise ensuite pour les nouveaux onglets.
  const tokenFromUrl = params.get("__lovable_token");
  if (tokenFromUrl) {
    try {
      sessionStorage.setItem("__lovable_token", tokenFromUrl);
    } catch {
      // ignore
    }
  }

  let previewToken: string | null = tokenFromUrl;
  if (!previewToken) {
    try {
      previewToken = sessionStorage.getItem("__lovable_token");
    } catch {
      previewToken = null;
    }
  }

  if (previewToken) {
    url.searchParams.set("__lovable_token", previewToken);
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
