/**
 * RealisationDetailPage — Vue simple : infos + galerie photos
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image, MapPin, Wrench, Calendar, User, Loader2, Upload, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealisation } from '../hooks/useRealisations';
import { useRealisationMedia, useUploadMedia, useDeleteMedia } from '../hooks/useRealisationMedia';
import { VALIDATION_STATUS_LABELS, VALIDATION_STATUS_COLORS, MEDIA_ROLE_LABELS, type MediaRole } from '../types';
import { toast } from 'sonner';

export default function RealisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: realisation, isLoading } = useRealisation(id);
  const { data: media = [] } = useRealisationMedia(id);
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const [uploadRole, setUploadRole] = useState<MediaRole>('after');

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
        mediaRole: uploadRole,
      });
    }
    e.target.value = '';
  };

  const beforeMedia = media.filter(m => m.media_role === 'before');
  const duringMedia = media.filter(m => m.media_role === 'during');
  const afterMedia = media.filter(m => m.media_role === 'after');
  const otherMedia = media.filter(m => !['before', 'during', 'after'].includes(m.media_role));

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
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                <StatusBadge status={r.validation_status} />
                {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                {r.service_family && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{r.service_family}</span>}
                {r.technician_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.technician_name}</span>}
                {r.intervention_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.intervention_date).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Description */}
        {r.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{r.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Ajouter des photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ajouter des photos</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border border-border rounded px-2 py-1.5 bg-background"
                  value={uploadRole}
                  onChange={e => setUploadRole(e.target.value as MediaRole)}
                >
                  <option value="before">Avant</option>
                  <option value="during">Pendant</option>
                  <option value="after">Après</option>
                </select>
                <label className="cursor-pointer">
                  <Button size="sm" asChild>
                    <span><Upload className="w-4 h-4 mr-1" /> Ajouter</span>
                  </Button>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Galerie par catégorie */}
        <MediaSection label="Avant" items={beforeMedia} onDelete={(m) => deleteMedia.mutate(m)} />
        <MediaSection label="Pendant" items={duringMedia} onDelete={(m) => deleteMedia.mutate(m)} />
        <MediaSection label="Après" items={afterMedia} onDelete={(m) => deleteMedia.mutate(m)} />
        {otherMedia.length > 0 && <MediaSection label="Autres" items={otherMedia} onDelete={(m) => deleteMedia.mutate(m)} />}

        {media.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune photo. Utilisez le bouton ci-dessus pour en ajouter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaSection({ label, items, onDelete }: { label: string; items: any[]; onDelete: (m: any) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        {label}
        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(m => (
          <div key={m.id} className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-square">
            {m.signedUrl ? (
              <img src={m.signedUrl} alt={m.file_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground/30" /></div>
            )}
            <button
              onClick={() => onDelete(m)}
              className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${VALIDATION_STATUS_COLORS[status as keyof typeof VALIDATION_STATUS_COLORS] || 'bg-muted text-muted-foreground'}`}>
      {VALIDATION_STATUS_LABELS[status as keyof typeof VALIDATION_STATUS_LABELS] || status}
    </span>
  );
}
