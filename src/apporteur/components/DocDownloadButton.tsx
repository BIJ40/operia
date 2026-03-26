/**
 * DocDownloadButton — Télécharge le PDF d'un devis ou facture à la demande
 * 
 * Au clic : fetch apiGetProjectByRef → trouve le doc → ouvre l'URL
 * Respecte la règle "enrichissement uniquement sur action explicite"
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProjectDetail } from '@/services/projectDetailLoader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocDownloadButtonProps {
  /** Ref du dossier */
  dossierRef: string;
  /** Type de document à chercher: 'devis' ou 'factures' */
  docType: 'devis' | 'factures';
  /** Texte affiché à côté de l'icône (optionnel) */
  label?: string;
  /** Classe CSS supplémentaire */
  className?: string;
}

export function DocDownloadButton({ dossierRef, docType, label, className }: DocDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const result = await getProjectDetail(dossierRef);
      if (!result.success || !result.data) {
        toast.error('Impossible de charger les documents');
        return;
      }

      const docs = result.data.documents.filter(
        d => d.category === docType && d.status === 'available' && d.url
      );

      if (docs.length === 0) {
        toast.info(`Aucun PDF de ${docType === 'devis' ? 'devis' : 'facture'} disponible`);
        return;
      }

      // Ouvrir le premier document disponible (le plus récent — déjà trié par date desc)
      window.open(docs[0].url!, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded p-1 gap-1 transition-colors',
        'text-primary hover:text-primary/70 hover:bg-primary/10',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      onClick={handleClick}
      disabled={loading}
      title={`Télécharger le ${docType === 'devis' ? 'devis' : 'facture'} PDF`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
}
