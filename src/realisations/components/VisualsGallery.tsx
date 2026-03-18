/**
 * VisualsGallery — Grid of all generated before/after visuals
 * With validate button (guarded by commercial.realisations.valider_envoyer)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Image, Trash2, X, Send, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGeneratedVisuals } from '../hooks/useGeneratedVisuals';
import { useDeleteMedia } from '../hooks/useRealisationMedia';
import { useDispatchVisualWebhook } from '../hooks/useDispatchVisualWebhook';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function VisualsGallery() {
  const navigate = useNavigate();
  const { data: visuals = [], isLoading } = useGeneratedVisuals();
  const deleteMedia = useDeleteMedia();
  const dispatchVisual = useDispatchVisualWebhook();
  const { hasModule } = usePermissions();
  const canValidate = hasModule('commercial.realisations.valider_envoyer');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; realisation_id: string; storage_path: string } | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
      </div>
    );
  }

  if (visuals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Image className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucun visuel généré pour le moment.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Créez des visuels Avant/Après depuis une réalisation.</p>
      </div>
    );
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMedia.mutate(
      { id: deleteTarget.id, realisation_id: deleteTarget.realisation_id, storage_path: deleteTarget.storage_path } as any,
      { onSettled: () => setDeleteTarget(null) },
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visuals.map(v => (
          <div key={v.id} className="group relative rounded-lg overflow-hidden border border-border/50 bg-card">
            <button
              onClick={() => { setLightboxUrl(v.signedUrl); setLightboxTitle(v.realisation_title); }}
              className="w-full"
            >
              <div className="aspect-[4/3]">
                <img
                  src={v.signedUrl}
                  alt={`Visuel ${v.realisation_title}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </button>
            {/* Delete button overlay */}
            <button
              onClick={() => setDeleteTarget({ id: v.id, realisation_id: v.realisation_id, storage_path: v.storage_path })}
              className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="px-2 py-1.5 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => navigate(`/realisations/${v.realisation_id}`)}
                  className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
                >
                  {v.realisation_title}
                </button>
                <button
                  onClick={() => handleDownload(v.signedUrl, v.file_name)}
                  className="shrink-0 p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
              {/* Validate + push button — only if permission granted */}
              {canValidate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs gap-1.5"
                  disabled={sendingId === v.id}
                  onClick={() => {
                    setSendingId(v.id);
                    dispatchVisual.mutate(
                      { mediaId: v.id, realisationId: v.realisation_id },
                      { onSettled: () => setSendingId(null) },
                    );
                  }}
                >
                  {sendingId === v.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Valider & Envoyer
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              className="w-full rounded-lg shadow-2xl"
            />
            <p className="text-white/70 text-sm text-center mt-3">{lightboxTitle}</p>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce visuel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le visuel sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
