interface PageHeaderProps {
  pageKey: string;
  backTo?: string;
  backLabel?: string;
}

/**
 * Composant déprécié - tout est maintenant dans UnifiedHeader
 * Conservé pour compatibilité avec les pages existantes.
 * @deprecated Utiliser UnifiedHeader à la place
 */
export function PageHeader(_props: PageHeaderProps) {
  // Le titre, sous-titre, et bouton retour sont désormais dans UnifiedHeader
  return null;
}
