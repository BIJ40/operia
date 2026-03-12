/**
 * RealisationsPage — List with hero photo thumbnails
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Camera, Image, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealisations } from '../hooks/useRealisations';
import { SYNC_STATUS_LABELS, SYNC_STATUS_COLORS, type ExternalSyncStatus } from '../types';

export default function RealisationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: realisations = [], isLoading } = useRealisations(search);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Camera className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Réalisations</h1>
            <p className="text-xs text-muted-foreground">Photos terrain</p>
          </div>
        </div>
        <Button onClick={() => navigate('/realisations/new')} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nouvelle
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : realisations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Aucune réalisation</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">Ajoutez des photos de vos interventions.</p>
          <Button onClick={() => navigate('/realisations/new')} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Créer
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {realisations.map(r => (
            <button
              key={r.id}
              onClick={() => navigate(`/realisations/${r.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/40 transition-colors group"
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-14 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {r.cover_url ? (
                  <img
                    src={r.cover_url}
                    alt={r.title || 'Photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {r.title || 'Sans titre'}
                  </span>
                  <SyncBadge status={r.external_sync_status as ExternalSyncStatus} />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.intervention_date).toLocaleDateString('fr-FR')}
                  </span>
                  {r.media_count > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {r.media_count} photo{r.media_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncBadge({ status }: { status: ExternalSyncStatus }) {
  if (status === 'not_queued') return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${SYNC_STATUS_COLORS[status]}`}>
      {SYNC_STATUS_LABELS[status]}
    </span>
  );
}
