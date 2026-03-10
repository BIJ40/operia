/**
 * RealisationsPage — Simple list with photo count and sync status
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealisations } from '../hooks/useRealisations';
import { SYNC_STATUS_LABELS, SYNC_STATUS_COLORS, type ExternalSyncStatus } from '../types';

export default function RealisationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: realisations = [], isLoading } = useRealisations(search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" />
            Réalisations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Photos terrain</p>
        </div>
        <Button onClick={() => navigate('/realisations/new')} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nouvelle
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : realisations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Aucune réalisation</h2>
          <p className="text-muted-foreground max-w-md mb-6">Ajoutez des photos de vos interventions.</p>
          <Button onClick={() => navigate('/realisations/new')}>
            <Plus className="w-4 h-4 mr-1" /> Créer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {realisations.map(r => (
            <Card
              key={r.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-border/50"
              onClick={() => navigate(`/realisations/${r.id}`)}
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center relative">
                <Camera className="w-12 h-12 text-muted-foreground/30" />
                <div className="absolute top-2 right-2">
                  <SyncBadge status={r.external_sync_status as ExternalSyncStatus} />
                </div>
                {r.media_count > 0 && (
                  <div className="absolute bottom-2 left-2 bg-foreground/70 text-background text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Image className="w-3 h-3" /> {r.media_count}
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold text-foreground text-sm truncate">{r.title || 'Sans titre'}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(r.intervention_date).toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncBadge({ status }: { status: ExternalSyncStatus }) {
  if (status === 'not_queued') return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SYNC_STATUS_COLORS[status]}`}>
      {SYNC_STATUS_LABELS[status]}
    </span>
  );
}
