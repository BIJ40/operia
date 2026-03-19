/**
 * SocialHubPage — Page principale du module Social Hub (HC Social)
 * Phase 2 : Fonctionnel avec génération IA, CRUD, calendrier et liste.
 *
 * Conventions figées :
 * - Storage path : {agency_id}/{year}/{month}/{suggestion_id}/{filename}
 * - Univers normalisés : plomberie, electricite, serrurerie, vitrerie, menuiserie, renovation, volets, pmr, general
 * - Statuts : suggestion = validation éditoriale, variant = statut plateforme, calendar = exécution planning
 */

import { useState, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, ChevronLeft, ChevronRight, CalendarDays, List, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useSocialSuggestions, useGenerateSuggestions, useUpdateSuggestionStatus } from '@/hooks/useSocialSuggestions';
import { SocialCalendarView } from '@/components/commercial/social/SocialCalendarView';
import { SocialListView } from '@/components/commercial/social/SocialListView';
import { SocialPostDetailPanel } from '@/components/commercial/social/SocialPostDetailPanel';

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
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr });
  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  // Data hooks
  const { data: suggestions = [], isLoading } = useSocialSuggestions(monthKey);
  const generateMutation = useGenerateSuggestions();
  const updateStatusMutation = useUpdateSuggestionStatus();

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (topicFilter !== 'all' && s.topic_type !== topicFilter) return false;
      if (platformFilter !== 'all') {
        const targets = Array.isArray(s.platform_targets) ? s.platform_targets : [];
        if (!targets.includes(platformFilter)) return false;
      }
      return true;
    });
  }, [suggestions, topicFilter, platformFilter]);

  // Selected suggestion
  const selectedSuggestion = useMemo(
    () => filteredSuggestions.find(s => s.id === selectedSuggestionId) || null,
    [filteredSuggestions, selectedSuggestionId]
  );

  // Actions
  const handleGenerate = useCallback(() => {
    generateMutation.mutate({ month, year });
  }, [generateMutation, month, year]);

  const handleApprove = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, status: 'approved', monthKey });
  }, [updateStatusMutation, monthKey]);

  const handleReject = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, status: 'rejected', monthKey });
  }, [updateStatusMutation, monthKey]);

  const handleRegenerate = useCallback((id: string) => {
    generateMutation.mutate({ month, year, regenerateSingle: true, suggestionId: id });
  }, [generateMutation, month, year]);

  // Stats
  const stats = useMemo(() => {
    const total = suggestions.length;
    const approved = suggestions.filter(s => s.status === 'approved').length;
    const draft = suggestions.filter(s => s.status === 'draft').length;
    return { total, approved, draft };
  }, [suggestions]);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Social Hub</h2>
          <Badge variant="outline" className="text-xs">Beta</Badge>
          {stats.total > 0 && (
            <div className="flex gap-1.5 ml-2">
              <Badge variant="secondary" className="text-[10px]">{stats.total} posts</Badge>
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{stats.approved} approuvés</Badge>
            </div>
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          variant="default"
        >
          {generateMutation.isPending ? (
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
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
          {/* Left: Calendar or List */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
            {filteredSuggestions.length === 0 ? (
              <EmptyState viewMode={viewMode} monthKey={monthKey} />
            ) : viewMode === 'calendar' ? (
              <SocialCalendarView
                currentMonth={currentMonth}
                suggestions={filteredSuggestions}
                selectedId={selectedSuggestionId}
                onSelect={setSelectedSuggestionId}
              />
            ) : (
              <SocialListView
                suggestions={filteredSuggestions}
                selectedId={selectedSuggestionId}
                onSelect={setSelectedSuggestionId}
              />
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="rounded-lg border border-border bg-card p-4">
            <SocialPostDetailPanel
              suggestion={selectedSuggestion}
              onApprove={handleApprove}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
              isRegenerating={generateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ viewMode, monthKey }: { viewMode: ViewMode; monthKey: string }) {
  const Icon = viewMode === 'calendar' ? CalendarDays : List;
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
      <Icon className="w-12 h-12 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {viewMode === 'calendar' ? 'Calendrier éditorial' : 'Pipeline éditorial'}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Aucune suggestion pour {monthKey}.
        </p>
      </div>
      <p className="text-xs text-muted-foreground/50 max-w-sm">
        Cliquez sur « Générer les suggestions » pour remplir le calendrier avec des idées de posts adaptées à votre agence.
      </p>
    </div>
  );
}
