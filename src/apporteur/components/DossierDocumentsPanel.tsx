/**
 * DossierDocumentsPanel — Affiche les documents générés d'un dossier
 * 
 * RÈGLES:
 * - Chargement UNIQUEMENT après action explicite (clic sur un dossier)
 * - generatedDocs traité comme optionnel/nullable
 * - En cas d'échec: état dégradé propre, jamais de crash Dialog
 * - Liens PDF uniquement si URL exploitable
 * - Ne JAMAIS relancer automatiquement en boucle
 */

import { FileText, FileCheck, Wrench, FolderOpen, Loader2, AlertCircle, ExternalLink, FileX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { groupDocsByCategory, type NormalizedDoc } from '@/services/normalizeGeneratedDocs';

interface Props {
  /** Ref du dossier — déclenche le chargement */
  dossierRef: string | null;
  /** Slug agence pour l'appel API */
  agencySlug: string | null;
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  factures: FileText,
  devis: FileCheck,
  interventions: Wrench,
  projects: FolderOpen,
};

const CATEGORY_ORDER = ['factures', 'devis', 'interventions', 'projects'];

export default function DossierDocumentsPanel({ dossierRef, agencySlug }: Props) {
  const { data, isLoading, isError } = useProjectDetail({
    ref: dossierRef,
    agencySlug,
  });

  // Pas de ref = rien à charger
  if (!dossierRef) return null;

  // Chargement
  if (isLoading) {
    return (
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Documents</p>
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement des documents...
        </div>
      </div>
    );
  }

  // Erreur — état dégradé propre, jamais de crash
  if (isError || !data?.success) {
    return (
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Documents</p>
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <AlertCircle className="w-4 h-4" />
          Documents indisponibles pour ce dossier
        </div>
      </div>
    );
  }

  const documents = data.data?.documents || [];

  // Aucun document
  if (documents.length === 0) {
    return (
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Documents</p>
        <p className="text-sm text-muted-foreground py-2">Aucun document disponible</p>
      </div>
    );
  }

  const grouped = groupDocsByCategory(documents);

  return (
    <div className="border-t pt-4">
      <p className="text-sm font-medium mb-3">
        Documents ({documents.filter(d => d.status === 'available').length} disponible{documents.filter(d => d.status === 'available').length !== 1 ? 's' : ''})
      </p>
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          const docs = grouped[cat];
          if (!docs || docs.length === 0) return null;
          
          const Icon = CATEGORY_ICONS[cat] || FileText;
          const categoryLabel = docs[0]?.categoryLabel || cat;
          
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {categoryLabel}
                </span>
              </div>
              <div className="space-y-1 ml-5">
                {docs.map(doc => (
                  <DocItem key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocItem({ doc }: { doc: NormalizedDoc }) {
  const formattedDate = doc.date 
    ? new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;

  if (doc.status === 'available' && doc.url) {
    return (
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group text-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{doc.docLabel}</span>
          {formattedDate && (
            <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
          )}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
      </a>
    );
  }

  // Document référencé mais non consultable
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground">
      <FileX className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{doc.docLabel}</span>
      {formattedDate && (
        <span className="text-xs shrink-0">{formattedDate}</span>
      )}
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
        Non consultable
      </Badge>
    </div>
  );
}
