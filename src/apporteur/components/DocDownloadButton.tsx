/**
 * DocDownloadButton — Télécharge le PDF d'un devis ou facture à la demande
 * 
 * Au clic : fetch apiGetProjectByRef → trouve le doc → ouvre l'URL
 * Respecte la règle "enrichissement uniquement sur action explicite"
 */

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
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
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 px-2 gap-1', className)}
      onClick={handleClick}
      disabled={loading}
      title={`Télécharger le ${docType === 'devis' ? 'devis' : 'facture'} PDF`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {label && <span className="text-xs">{label}</span>}
    </Button>
  );
}
