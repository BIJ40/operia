/**
 * RealisationsPage — Main back-office listing with KPIs, filters, table & gallery views
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Download, Columns3, Search, Filter, LayoutGrid, LayoutList,
  Image, Clock, Globe, FileText, CheckCircle2, XCircle, Camera, MapPin, Wrench, User, Calendar, Star, Sparkles, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealisations } from '../hooks/useRealisations';
import { useChangeValidationStatus, useChangePublicationStatus } from '../hooks/useRealisationMutations';
import {
  VALIDATION_STATUS_LABELS, VALIDATION_STATUS_COLORS,
  PUBLICATION_STATUS_LABELS, PUBLICATION_STATUS_COLORS,
  ARTICLE_STATUS_LABELS, SERVICE_FAMILIES,
  type RealisationFilters, type RealisationWithMeta, type ValidationStatus, type PublicationStatus,
} from '../types';

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, type }: { status: string; type: 'validation' | 'publication' }) {
  const labels = type === 'validation' ? VALIDATION_STATUS_LABELS : PUBLICATION_STATUS_LABELS;
  const colors = type === 'validation' ? VALIDATION_STATUS_COLORS : PUBLICATION_STATUS_COLORS;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function ScoreIndicator({ score, max = 100 }: { score: number | null; max?: number }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = (score / max) * 100;
  const color = pct >= 70 ? 'text-primary' : pct >= 40 ? 'text-accent-foreground' : 'text-destructive';
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
}

export default function RealisationsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [filters, setFilters] = useState<RealisationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { data: realisations = [], isLoading } = useRealisations(filters);
  const changeValidation = useChangeValidationStatus();
  const changePub = useChangePublicationStatus();

  const kpis = useMemo(() => {
    const total = realisations.length;
    const pending = realisations.filter(r => r.validation_status === 'pending_review').length;
    const webReady = realisations.filter(r => r.publication_status === 'web_ready').length;
    const published = realisations.filter(r => r.publication_status === 'published').length;
    const notUsed = realisations.filter(r => r.article_status === 'not_used' && r.validation_status === 'approved').length;
    return { total, pending, webReady, published, notUsed };
  }, [realisations]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Camera className="w-7 h-7 text-primary" />
                Réalisations
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos réalisations terrain, photos avant/après et contenu marketing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" /> Exports
              </Button>
              <Button onClick={() => navigate('/realisations/new')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Nouvelle réalisation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total" value={kpis.total} icon={Image} color="bg-primary/10 text-primary" />
          <KpiCard label="En attente" value={kpis.pending} icon={Clock} color="bg-accent/20 text-accent-foreground" />
          <KpiCard label="Prêtes web" value={kpis.webReady} icon={Globe} color="bg-primary/15 text-primary" />
          <KpiCard label="Publiées" value={kpis.published} icon={CheckCircle2} color="bg-primary/20 text-primary" />
          <KpiCard label="Non exploitées" value={kpis.notUsed} icon={FileText} color="bg-muted text-muted-foreground" />
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, ville, description..."
              className="pl-9"
              value={filters.search || ''}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-1" /> Filtres
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="icon"
              className="w-9 h-9"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'gallery' ? 'default' : 'outline'}
              size="icon"
              className="w-9 h-9"
              onClick={() => setViewMode('gallery')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="border-border/50">
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={filters.validation_status || ''} onValueChange={(v) => setFilters(f => ({ ...f, validation_status: v as ValidationStatus || undefined }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Statut validation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {Object.entries(VALIDATION_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.publication_status || ''} onValueChange={(v) => setFilters(f => ({ ...f, publication_status: v as PublicationStatus || undefined }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Statut publication" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {Object.entries(PUBLICATION_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.service_family || ''} onValueChange={(v) => setFilters(f => ({ ...f, service_family: v || undefined }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Métier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {SERVICE_FAMILIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Ville" className="text-xs" value={filters.city || ''} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
              <Input placeholder="Technicien" className="text-xs" value={filters.technician_name || ''} onChange={e => setFilters(f => ({ ...f, technician_name: e.target.value }))} />
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : realisations.length === 0 ? (
          <EmptyState onNew={() => navigate('/realisations/new')} />
        ) : viewMode === 'table' ? (
          <TableView items={realisations} onOpen={(id) => navigate(`/realisations/${id}`)} />
        ) : (
          <GalleryView items={realisations} onOpen={(id) => navigate(`/realisations/${id}`)} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Camera className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Aucune réalisation</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Commencez à documenter vos interventions terrain avec photos avant/après pour valoriser votre expertise.
      </p>
      <Button onClick={onNew}>
        <Plus className="w-4 h-4 mr-1" /> Créer une réalisation
      </Button>
    </div>
  );
}

function TableView({ items, onOpen }: { items: RealisationWithMeta[]; onOpen: (id: string) => void }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs font-medium">
              <th className="text-left p-3">Titre</th>
              <th className="text-left p-3 hidden sm:table-cell">Ville</th>
              <th className="text-left p-3 hidden md:table-cell">Métier</th>
              <th className="text-left p-3 hidden lg:table-cell">Technicien</th>
              <th className="text-center p-3">Médias</th>
              <th className="text-center p-3 hidden sm:table-cell">Av/Ap</th>
              <th className="text-center p-3">Validation</th>
              <th className="text-center p-3 hidden md:table-cell">Publication</th>
              <th className="text-center p-3 hidden lg:table-cell">Qualité</th>
              <th className="text-center p-3 hidden lg:table-cell">SEO</th>
              <th className="text-left p-3 hidden xl:table-cell">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(r => (
              <tr key={r.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onOpen(r.id)}>
                <td className="p-3 font-medium text-foreground max-w-[200px] truncate">{r.title || 'Sans titre'}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{r.city || '—'}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{r.service_family || '—'}</td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground">{r.technician_name || '—'}</td>
                <td className="p-3 text-center">
                  <span className="text-xs font-medium">{r.media_count || 0}</span>
                </td>
                <td className="p-3 text-center hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    {r.has_before && <span className="w-2 h-2 rounded-full bg-accent" title="Avant" />}
                    {r.has_after && <span className="w-2 h-2 rounded-full bg-primary" title="Après" />}
                    {!r.has_before && !r.has_after && <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                </td>
                <td className="p-3 text-center"><StatusBadge status={r.validation_status} type="validation" /></td>
                <td className="p-3 text-center hidden md:table-cell"><StatusBadge status={r.publication_status} type="publication" /></td>
                <td className="p-3 text-center hidden lg:table-cell"><ScoreIndicator score={r.quality_score} /></td>
                <td className="p-3 text-center hidden lg:table-cell"><ScoreIndicator score={r.seo_score} /></td>
                <td className="p-3 hidden xl:table-cell text-muted-foreground text-xs">
                  {r.intervention_date ? new Date(r.intervention_date).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="p-3">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GalleryView({ items, onOpen }: { items: RealisationWithMeta[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(r => (
        <Card
          key={r.id}
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-border/50"
          onClick={() => onOpen(r.id)}
        >
          {/* Placeholder image */}
          <div className="aspect-[4/3] bg-muted flex items-center justify-center relative">
            <Camera className="w-12 h-12 text-muted-foreground/30" />
            <div className="absolute top-2 right-2 flex gap-1">
              <StatusBadge status={r.validation_status} type="validation" />
            </div>
            {r.media_count ? (
              <div className="absolute bottom-2 left-2 bg-foreground/70 text-background text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Image className="w-3 h-3" /> {r.media_count}
              </div>
            ) : null}
          </div>
          <CardContent className="p-3 space-y-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{r.title || 'Sans titre'}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
              {r.service_family && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{r.service_family}</span>}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {r.has_before && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Avant</Badge>}
                {r.has_after && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Après</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {r.quality_score !== null && <span className="text-xs" title="Qualité"><Star className="w-3 h-3 inline text-accent" /> {r.quality_score}</span>}
                {r.seo_score !== null && <span className="text-xs" title="SEO"><Sparkles className="w-3 h-3 inline text-primary" /> {r.seo_score}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
