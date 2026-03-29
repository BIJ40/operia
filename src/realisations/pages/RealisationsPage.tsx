/**
 * RealisationsPage — Tabs: Réalisations list + Avant/Après visuals gallery
 * Onglet Avant/Après conditionné par le droit commercial.realisations.onglet_avap
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Camera, Image, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealisations } from '../hooks/useRealisations';
import { useGeneratedVisuals } from '../hooks/useGeneratedVisuals';
import { VisualsGallery } from '../components/VisualsGallery';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { SYNC_STATUS_LABELS, SYNC_STATUS_COLORS, type ExternalSyncStatus } from '../types';

type Tab = 'realisations' | 'avant-apres';

export default function RealisationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('realisations');
  const { data: realisations = [], isLoading } = useRealisations(search);
  const { data: visuals = [] } = useGeneratedVisuals();
  const { hasModule } = usePermissions();

  const canSeeAvapTab = hasModule('commercial.realisations.onglet_avap');
  const canAddPhotos = hasModule('commercial.realisations.photos');

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
        {activeTab === 'realisations' && canAddPhotos && (
          <Button onClick={() => navigate('/realisations/new')} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nouvelle
          </Button>
        )}
      </div>

      {/* Tabs — only show if AV/AP tab is enabled */}
      {canSeeAvapTab && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('realisations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'realisations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Réalisations
            </span>
          </button>
          <button
            onClick={() => setActiveTab('avant-apres')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'avant-apres'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Avant / Après
              {visuals.length > 0 && (
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {visuals.length}
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'realisations' || !canSeeAvapTab ? (
        <RealisationsListContent
          realisations={realisations}
          isLoading={isLoading}
          search={search}
          setSearch={setSearch}
          navigate={navigate}
          canAddPhotos={canAddPhotos}
        />
      ) : (
        <VisualsGallery />
      )}
    </div>
  );
}

// ─── Réalisations list ────────────────────────────────────────
function RealisationsListContent({
  realisations,
  isLoading,
  search,
  setSearch,
  navigate,
  canAddPhotos,
}: {
  realisations: any[];
  isLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  navigate: (path: string) => void;
  canAddPhotos: boolean;
}) {
  return (
    <>
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
          {canAddPhotos && (
            <Button onClick={() => navigate('/realisations/new')} size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Créer
            </Button>
          )}
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
    </>
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
