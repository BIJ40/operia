/**
 * SocialHubPage — Page principale du module Social Hub (HC Social)
 * Phase 1 : Squelette avec sélecteur mois, filtres, layout 2 colonnes, toggle calendrier/liste.
 */

import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, ChevronLeft, ChevronRight, CalendarDays, List, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAwarenessDaysForMonth } from '@/data/socialAwarenessDays';

type ViewMode = 'calendar' | 'list';
type TopicFilter = 'all' | 'awareness_day' | 'seasonal_tip' | 'realisation' | 'local_branding';
type PlatformFilter = 'all' | 'facebook' | 'instagram' | 'google_business' | 'linkedin';

const TOPIC_LABELS: Record<TopicFilter, string> = {
  all: 'Tous',
  awareness_day: 'Journées',
  seasonal_tip: 'Conseils',
  realisation: 'Réalisations',
  local_branding: 'Marque',
};

const PLATFORM_LABELS: Record<PlatformFilter, string> = {
  all: 'Toutes',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_business: 'Google',
  linkedin: 'LinkedIn',
};

export default function SocialHubPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr });

  const awarenessForMonth = useMemo(
    () => getAwarenessDaysForMonth(currentMonth.getMonth() + 1),
    [currentMonth]
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Phase 2: invoke edge function social-suggest
    setTimeout(() => setIsGenerating(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-foreground">Social Hub</h2>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="default"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Générer les suggestions
        </Button>
      </div>

      {/* ─── Controls bar ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        {/* Month nav */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* View toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          className="h-8"
        >
          <ToggleGroupItem value="calendar" className="h-8 px-2 text-xs gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Calendrier
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="h-8 px-2 text-xs gap-1">
            <List className="w-3.5 h-3.5" />
            Liste
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Filters */}
        <div className="flex gap-2 ml-auto">
          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v as TopicFilter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TOPIC_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Main content area ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Left: Calendar or List */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          {viewMode === 'calendar' ? (
            <CalendarPlaceholder monthKey={monthKey} awarenessCount={awarenessForMonth.length} />
          ) : (
            <ListPlaceholder monthKey={monthKey} />
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="rounded-lg border border-border bg-card p-4">
          <DetailPanelPlaceholder />
        </div>
      </div>
    </div>
  );
}

// ─── Placeholder sub-components (Phase 2 will replace) ───────

function CalendarPlaceholder({ monthKey, awarenessCount }: { monthKey: string; awarenessCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
      <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Calendrier éditorial</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Mois : {monthKey} — {awarenessCount} journées pertinentes détectées
        </p>
      </div>
      <p className="text-xs text-muted-foreground/50 max-w-sm">
        Cliquez sur « Générer les suggestions » pour remplir le calendrier avec des idées de posts adaptées à votre agence.
      </p>
    </div>
  );
}

function ListPlaceholder({ monthKey }: { monthKey: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
      <List className="w-12 h-12 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Pipeline éditorial</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Vue par statut : Brouillons → Approuvés → Planifiés → Publiés
        </p>
      </div>
      <p className="text-xs text-muted-foreground/50 max-w-sm">
        Aucune suggestion pour {monthKey}. Générez des idées pour commencer.
      </p>
    </div>
  );
}

function DetailPanelPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
      <Share2 className="w-10 h-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Sélectionnez un post</p>
      <p className="text-xs text-muted-foreground/50 max-w-[200px]">
        Le détail du post s'affichera ici avec les variantes par plateforme et l'aperçu visuel.
      </p>
    </div>
  );
}
