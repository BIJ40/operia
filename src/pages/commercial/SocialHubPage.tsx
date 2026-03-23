/**
 * SocialHubPage — Page principale du module Social Hub (HC Social)
 * Simplifié : pas de filtre plateforme, jours sélectionnables pour régénération ciblée.
 */

import { useState, useMemo, useCallback } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, ChevronLeft, ChevronRight, CalendarDays, List, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { useSocialSuggestions, useGenerateSuggestions, useUpdateSuggestionStatus } from '@/hooks/useSocialSuggestions';
import { SocialCalendarView } from '@/components/commercial/social/SocialCalendarView';
import { SocialListView } from '@/components/commercial/social/SocialListView';
import { SocialPostDetailPanel } from '@/components/commercial/social/SocialPostDetailPanel';

type ViewMode = 'calendar' | 'list';
type TopicFilter = 'all' | 'urgence' | 'prevention' | 'amelioration' | 'conseil' | 'preuve' | 'saisonnier' | 'contre_exemple' | 'pedagogique' | 'prospection';

const TOPIC_LABELS: Record<TopicFilter, string> = {
  all: 'Tous',
  urgence: 'Urgence',
  prevention: 'Prévention',
  amelioration: 'Amélioration',
  conseil: 'Conseil',
  preuve: 'Preuve',
  saisonnier: 'Saison',
  contre_exemple: 'Contre-ex.',
  pedagogique: 'Pédago.',
  prospection: 'Prospection',
};

export default function SocialHubPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr });
  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  // Data hooks — poll every 3s while generation is in progress
  const generateMutation = useGenerateSuggestions();
  const { data: suggestions = [], isLoading } = useSocialSuggestions(
    monthKey,
    generateMutation.isGenerating,
    generateMutation.checkGenerationDone,
  );
  const updateStatusMutation = useUpdateSuggestionStatus();

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (topicFilter !== 'all' && s.topic_type !== topicFilter) return false;
      return true;
    });
  }, [suggestions, topicFilter]);

  // Selected suggestion
  const selectedSuggestion = useMemo(
    () => filteredSuggestions.find(s => s.id === selectedSuggestionId) || null,
    [filteredSuggestions, selectedSuggestionId]
  );

  // Actions
  const handleGenerate = useCallback(() => {
    const approvedCount = suggestions.filter(s => s.status === 'approved').length;
    if (approvedCount > 0) {
      const confirmed = window.confirm(
        `⚠️ ${approvedCount} suggestion(s) approuvée(s) seront supprimées.\nToutes les suggestions du mois seront remplacées par le calendrier éditorial complet (1 post/jour).\n\nContinuer ?`
      );
      if (!confirmed) return;
    }
    generateMutation.mutate({ month, year });
  }, [generateMutation, month, year, suggestions]);

  const handleApprove = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, status: 'approved', monthKey });
  }, [updateStatusMutation, monthKey]);

  const handleReject = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, status: 'rejected', monthKey });
  }, [updateStatusMutation, monthKey]);

  const handleRegenerate = useCallback((id: string) => {
    generateMutation.mutate({ month, year, regenerateSingle: true, suggestionId: id });
  }, [generateMutation, month, year]);

  // Day multi-select
  const handleToggleDay = useCallback((dateKey: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);

  const handleRegenerateSelectedDays = useCallback(() => {
    const dates = Array.from(selectedDays);
    if (dates.length === 0) return;

    // Send target_dates to the edge function — it handles archival + generation
    generateMutation.mutate({ month, year, targetDates: dates });
    setSelectedDays(new Set());
  }, [selectedDays, generateMutation, month, year]);

  // Stats
  const stats = useMemo(() => {
    const total = suggestions.length;
    const approved = suggestions.filter(s => s.status === 'approved').length;
    return { total, approved };
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
          disabled={generateMutation.isGenerating}
          variant="default"
        >
          {generateMutation.isGenerating ? (
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDays(new Set()); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDays(new Set()); }}>
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

        {/* Topic filter */}
        <div className="ml-auto">
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
        </div>
      </div>

      {/* ─── Main content area ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-[500px] relative">
          {/* Left: Calendar or List — collapsible */}
          {!isDetailExpanded && (
            <div className="flex-1 min-w-0 rounded-lg border border-border bg-card p-3 mr-0">
              {filteredSuggestions.length === 0 ? (
                <EmptyState viewMode={viewMode} monthKey={monthKey} />
              ) : viewMode === 'calendar' ? (
                <SocialCalendarView
                  currentMonth={currentMonth}
                  suggestions={filteredSuggestions}
                  selectedId={selectedSuggestionId}
                  onSelect={setSelectedSuggestionId}
                  selectedDays={selectedDays}
                  onToggleDay={handleToggleDay}
                  onRegenerateSelected={handleRegenerateSelectedDays}
                  isRegenerating={generateMutation.isGenerating}
                />
              ) : (
                <SocialListView
                  suggestions={filteredSuggestions}
                  selectedId={selectedSuggestionId}
                  onSelect={setSelectedSuggestionId}
                />
              )}
            </div>
          )}

          {/* Toggle handle — vertical bar between panels */}
          <div className="flex items-center self-stretch z-10">
            <button
              onClick={() => setIsDetailExpanded(prev => !prev)}
              title={isDetailExpanded ? 'Afficher le calendrier' : 'Agrandir l\'aperçu visuel'}
              className="flex items-center justify-center w-4 h-24 rounded-sm bg-primary/10 hover:bg-primary/20 border border-border transition-colors cursor-pointer my-auto"
            >
              {isDetailExpanded ? <PanelLeftOpen className="w-4 h-4 text-primary" /> : <PanelLeftClose className="w-4 h-4 text-primary" />}
            </button>
          </div>

          {/* Right: Detail panel — expandable */}
          <div className={cn(
            'rounded-lg border border-border bg-card p-3 transition-all duration-200',
            isDetailExpanded ? 'flex-1' : 'w-[340px] shrink-0'
          )}>
            <SocialPostDetailPanel
              suggestion={selectedSuggestion}
              onApprove={handleApprove}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
              isRegenerating={generateMutation.isGenerating}
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
