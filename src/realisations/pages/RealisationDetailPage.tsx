/**
 * RealisationDetailPage — Photos + sync status
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image, Calendar, Loader2, Upload, X, Trash2, Send, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealisation } from '../hooks/useRealisations';
import { useRealisationMedia, useUploadMedia, useDeleteMedia } from '../hooks/useRealisationMedia';
import { useDispatchWebhook } from '../hooks/useDispatchWebhook';
import { MEDIA_ROLE_LABELS, SYNC_STATUS_LABELS, SYNC_STATUS_COLORS, type MediaRole, type ExternalSyncStatus } from '../types';

export default function RealisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: realisation, isLoading } = useRealisation(id);
  const { data: media = [] } = useRealisationMedia(id);
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const dispatchWebhook = useDispatchWebhook();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!realisation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Réalisation non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  const r = realisation;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadMedia.mutateAsync({
        realisationId: r.id,
        agencyId: r.agency_id,
        file,
        mediaRole: 'before',
      });
    }
    e.target.value = '';
  };

  const syncStatus = r.external_sync_status as ExternalSyncStatus;
  const canDispatch = !['queued', 'processing'].includes(syncStatus);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{r.title || 'Sans titre'}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(r.intervention_date).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  {media.length} photo{media.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Sync Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" />
              Synchronisation contenu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${SYNC_STATUS_COLORS[syncStatus]}`}>
                  {syncStatus === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {syncStatus === 'published' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {SYNC_STATUS_LABELS[syncStatus]}
                </span>
                {r.external_sync_last_at && (
                  <span className="text-xs text-muted-foreground">
                    Dernière tentative : {new Date(r.external_sync_last_at).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={syncStatus === 'not_queued' ? 'default' : 'outline'}
                disabled={!canDispatch || dispatchWebhook.isPending}
                onClick={() => dispatchWebhook.mutate(r.id)}
              >
                {dispatchWebhook.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : syncStatus === 'not_queued' ? (
                  <Send className="w-4 h-4 mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                {syncStatus === 'not_queued' ? 'Envoyer au moteur contenu' : 'Renvoyer'}
              </Button>
            </div>

            {r.external_sync_error && (
              <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-3">
                <strong>Erreur :</strong> {r.external_sync_error}
              </div>
            )}

            {r.published_article_url && (
              <a
                href={r.published_article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Voir l'article publié
              </a>
            )}
          </CardContent>
        </Card>

        {/* Add photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Photos</CardTitle>
              <label className="cursor-pointer">
                <Button size="sm" asChild>
                  <span><Upload className="w-4 h-4 mr-1" /> Ajouter</span>
                </Button>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </CardHeader>
        </Card>

        {/* Gallery */}
        {media.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map(m => (
              <div key={m.id} className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square">
                {m.signedUrl ? (
                  <img src={m.signedUrl} alt={m.file_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <button
                  onClick={() => deleteMedia.mutate(m)}
                  className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune photo. Utilisez le bouton ci-dessus pour en ajouter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
