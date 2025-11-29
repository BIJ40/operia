import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePageMetadata } from '@/hooks/use-page-metadata';

interface PageHeaderProps {
  pageKey: string;
  defaultSubtitle?: string;
  backTo?: string;
  backLabel?: string;
}

/**
 * Composant simplifié pour afficher :
 * - Un lien retour (optionnel)
 * - Une description/sous-titre (depuis page_metadata ou défaut)
 * 
 * Le titre principal et le crayon d'édition sont maintenant dans UnifiedHeader.
 */
export function PageHeader({
  pageKey,
  defaultSubtitle,
  backTo,
  backLabel,
}: PageHeaderProps) {
  const { data: metadata, isLoading } = usePageMetadata(pageKey);
  
  // Description affichée (métadonnées ou défaut)
  const subtitle = metadata?.header_subtitle || defaultSubtitle || '';

  // Ne rien afficher si pas de lien retour ni de description
  if (!backTo && !subtitle && !isLoading) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Lien retour */}
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel || 'Retour'}
        </Link>
      )}

      {/* Description / sous-titre */}
      {(subtitle || isLoading) && (
        <p className="text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement...
            </span>
          ) : (
            subtitle
          )}
        </p>
      )}
    </div>
  );
}
