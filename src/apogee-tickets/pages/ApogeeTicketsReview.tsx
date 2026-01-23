/**
 * Page de revue/édition en masse des tickets avec filtres
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  SkipForward,
  FileSpreadsheet,
  Filter,
  X,
  Save,
  Eye,
  Flame,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { HeatPriorityBadge, HEAT_PRIORITY_OPTIONS } from '../components/HeatPriorityBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from '../components/OwnerSideSlider';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { useTicketTags } from '../hooks/useTicketTags';
import { getHeatPriorityConfig } from '@/utils/heatPriority';
import type { ApogeeTicket, TicketFilters, MissingFieldFilter } from '../types';
import { ROUTES } from '@/config/routes';

// Helper pour afficher le label du filtre champ manquant
const getMissingFieldLabel = (field: MissingFieldFilter): string => {
  const labels: Record<MissingFieldFilter, string> = {
    complete: 'Complets',
    incomplete: 'Incomplets (tous)',
    no_module: 'Sans module',
    no_heat: 'Sans priorité',
    no_hours: 'Sans estimation',
    no_description: 'Sans description',
  };
  return labels[field] || field;
};

export default function ApogeeTicketsReview() {
  const [filters, setFilters] = useState<TicketFilters>({});
  const { tickets: liveTickets, modules, priorities, statuses, updateTicket, isLoading } = useApogeeTickets(filters);
  const { tags: availableTags } = useTicketTags();
  
  // États locaux pour les filtres (synchro avec filters)
  const [heatRange, setHeatRange] = useState<[number, number]>([0, 12]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Liste stable de tickets pour la session de revue (ne change pas quand on complète un ticket)
  const [stableTickets, setStableTickets] = useState<ApogeeTicket[]>([]);
  const filtersRef = useRef<string>('');

  // Mettre à jour la liste stable uniquement quand les filtres changent (pas quand les données changent)
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(filters);
    if (currentFiltersKey !== filtersRef.current && liveTickets.length > 0) {
      filtersRef.current = currentFiltersKey;
      setStableTickets(liveTickets);
    }
  }, [filters, liveTickets]);

  // Initialiser avec les premiers tickets chargés
  useEffect(() => {
    if (stableTickets.length === 0 && liveTickets.length > 0) {
      setStableTickets(liveTickets);
      filtersRef.current = JSON.stringify(filters);
    }
  }, [liveTickets]);

  // Formulaire local pour le ticket courant
  const [formValues, setFormValues] = useState<Partial<ApogeeTicket>>({});

  // Utiliser la liste stable pour la navigation
  const tickets = stableTickets;
  const currentTicket = tickets[currentIndex];
  const totalTickets = tickets.length;
  const progressPercent = totalTickets > 0 ? Math.round(((currentIndex + 1) / totalTickets) * 100) : 0;

  // Synchroniser formValues avec le ticket courant
  useEffect(() => {
    if (currentTicket) {
      setFormValues({
        element_concerne: currentTicket.element_concerne,
        description: currentTicket.description,
        module: currentTicket.module,
        priority: currentTicket.priority,
        kanban_status: currentTicket.kanban_status,
        h_min: currentTicket.h_min,
        h_max: currentTicket.h_max,
        severity: currentTicket.severity,
        notes_internes: currentTicket.notes_internes,
        heat_priority: currentTicket.heat_priority,
        owner_side: currentTicket.owner_side,
      });
      setHasChanges(false);
    }
  }, [currentTicket?.id]);

  const updateField = (field: keyof ApogeeTicket, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentTicket || !hasChanges) return;

    await updateTicket.mutateAsync({
      id: currentTicket.id,
      ...formValues,
    });
    setHasChanges(false);
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (currentIndex < totalTickets - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < totalTickets - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const updateFilter = (key: keyof TicketFilters, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    setCurrentIndex(0); // Reset to first ticket when filters change
    // Force refresh de la liste stable au prochain chargement
    filtersRef.current = '';
  };

  // Handler pour le slider de priorité heat
  const handleHeatRangeChange = (values: number[]) => {
    setHeatRange([values[0], values[1]]);
  };

  const applyHeatFilter = () => {
    const newFilters = { ...filters };
    if (heatRange[0] > 0 || heatRange[1] < 12) {
      newFilters.heat_priority_min = heatRange[0];
      newFilters.heat_priority_max = heatRange[1];
    } else {
      delete newFilters.heat_priority_min;
      delete newFilters.heat_priority_max;
    }
    setFilters(newFilters);
    setCurrentIndex(0);
    filtersRef.current = '';
  };

  // Handler pour les tags
  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    
    const newFilters = { ...filters };
    if (newTags.length > 0) {
      newFilters.tags = newTags;
    } else {
      delete newFilters.tags;
    }
    setFilters(newFilters);
    setCurrentIndex(0);
    filtersRef.current = '';
  };

  const clearFilters = () => {
    setFilters({});
    setHeatRange([0, 12]);
    setSelectedTags([]);
    setCurrentIndex(0);
    filtersRef.current = '';
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={ROUTES.projects.kanban}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Kanban
          </Button>
        </Link>
        {totalTickets > 0 && (
          <Badge variant="outline">
            {currentIndex + 1} / {totalTickets}
          </Badge>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearFilters}
                className="animate-pulse hover:animate-none"
              >
                <X className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Ligne 1: Filtres principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Filtre Module avec "Tous" et "Sans module" */}
            <Select
              value={filters.module === '__none__' ? '__none__' : filters.module || 'all'}
              onValueChange={(v) => updateFilter('module', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">📋 Tous les modules</SelectItem>
                <SelectItem value="__none__">❌ Sans module</SelectItem>
                <Separator className="my-1" />
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre Qualification avec "Tous" */}
            <Select
              value={filters.is_qualified === true ? 'true' : filters.is_qualified === false ? 'false' : 'all'}
              onValueChange={(v) => updateFilter('is_qualified', v === 'all' ? undefined : v === 'true')}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Qualification" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">📋 Tous</SelectItem>
                <SelectItem value="true">✓ Qualifiés IA</SelectItem>
                <SelectItem value="false">À qualifier</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre Complétude avec sous-options de champs manquants */}
            <Select
              value={filters.missing_field || 'all'}
              onValueChange={(v) => updateFilter('missing_field', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Complétude" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">📋 Tous</SelectItem>
                <SelectItem value="complete">✅ Complets</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="incomplete">⚠️ Incomplets (tous)</SelectItem>
                <SelectItem value="no_module">❌ Sans module</SelectItem>
                <SelectItem value="no_heat">❌ Sans priorité</SelectItem>
                <SelectItem value="no_hours">❌ Sans estimation</SelectItem>
                <SelectItem value="no_description">❌ Sans description</SelectItem>
              </SelectContent>
            </Select>

            {/* Recherche */}
            <Input
              placeholder="Rechercher..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Ligne 2: Priorité Heat + Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre Priorité Heat (slider range) */}
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" />
                  Priorité Heat
                </label>
                <span className="text-xs font-medium">
                  {getHeatPriorityConfig(heatRange[0]).emoji} {heatRange[0]} - {heatRange[1]} {getHeatPriorityConfig(heatRange[1]).emoji}
                </span>
              </div>
              <Slider
                min={0}
                max={12}
                step={1}
                value={heatRange}
                onValueChange={handleHeatRangeChange}
                onValueCommit={applyHeatFilter}
                className="w-full"
              />
            </div>

            {/* Filtre Tags (multi-select popover) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-auto min-h-[42px] justify-start px-3 py-2">
                  <Tag className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-sm">
                    {selectedTags.length > 0 
                      ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} sélectionné${selectedTags.length > 1 ? 's' : ''}`
                      : 'Filtrer par tag'}
                  </span>
                  {selectedTags.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {selectedTags.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-2">Sélectionner des tags</p>
                  {availableTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">Aucun tag disponible</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          <Checkbox
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          <Badge variant="outline" className="text-xs">
                            {tag.label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtres actifs affichés comme badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.module && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => updateFilter('module', undefined)}
                >
                  {filters.module === '__none__' ? 'Sans module' : modules.find(m => m.id === filters.module)?.label || filters.module}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.is_qualified !== undefined && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => updateFilter('is_qualified', undefined)}
                >
                  {filters.is_qualified ? 'Qualifiés IA' : 'À qualifier'}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.missing_field && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => updateFilter('missing_field', undefined)}
                >
                  {getMissingFieldLabel(filters.missing_field)}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.search && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => updateFilter('search', undefined)}
                >
                  Recherche: "{filters.search}"
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {(filters.heat_priority_min !== undefined || filters.heat_priority_max !== undefined) && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => {
                    setHeatRange([0, 12]);
                    const newFilters = { ...filters };
                    delete newFilters.heat_priority_min;
                    delete newFilters.heat_priority_max;
                    setFilters(newFilters);
                    setCurrentIndex(0);
                    filtersRef.current = '';
                  }}
                >
                  <Flame className="h-3 w-3 mr-1" />
                  Priorité: {filters.heat_priority_min ?? 0} - {filters.heat_priority_max ?? 12}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.tags && filters.tags.length > 0 && filters.tags.map((tag) => (
                <Badge 
                  key={tag}
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => handleTagToggle(tag)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {totalTickets > 0 && (
        <div className="space-y-2">
          <Progress value={progressPercent} />
          <p className="text-sm text-center text-muted-foreground">
            {progressPercent}% parcouru
          </p>
        </div>
      )}

      {/* Empty state */}
      {totalTickets === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Aucun ticket trouvé</h2>
            <p className="text-muted-foreground">
              Modifiez vos filtres pour afficher des tickets.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ticket card */}
      {currentTicket && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {currentTicket.apogee_modules?.label && (
                    <Badge className="bg-blue-500 text-white">
                      {currentTicket.apogee_modules.label}
                    </Badge>
                  )}
                  {currentTicket.is_qualified && (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Qualifié IA
                    </Badge>
                  )}
                  {/* Champs manquants */}
                  {!currentTicket.module && (
                    <Badge variant="outline" className="text-red-500 border-red-300 line-through">
                      Module
                    </Badge>
                  )}
                  {(currentTicket.heat_priority === null || currentTicket.heat_priority === undefined) && (
                    <Badge variant="outline" className="text-red-500 border-red-300 line-through">
                      Heures
                    </Badge>
                  )}
                  {!currentTicket.description && (
                    <Badge variant="outline" className="text-orange-500 border-orange-300 line-through">
                      Description
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">
                  Ticket #{currentIndex + 1}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDrawerOpen(true)}
                  title="Voir / Éditer le ticket"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {hasChanges && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Modifié
                  </Badge>
                )}
              </div>
            </div>

            {/* Source info */}
            {(currentTicket.source_sheet || currentTicket.source_row_index) && (
              <CardDescription className="flex items-center gap-2 mt-2 bg-muted/50 rounded p-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="font-mono text-xs">
                  Onglet: <strong>{currentTicket.source_sheet || '—'}</strong>
                  {' | '}
                  Ligne: <strong>{currentTicket.source_row_index ?? '—'}</strong>
                </span>
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Titre / Élément concerné */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Titre / Élément concerné
              </label>
              <Textarea
                value={formValues.element_concerne || ''}
                onChange={(e) => updateField('element_concerne', e.target.value)}
                rows={2}
                className="mt-1 font-semibold resize-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </label>
              <Textarea
                value={formValues.description || ''}
                onChange={(e) => updateField('description', e.target.value || null)}
                rows={5}
                placeholder="Décrivez le ticket en détail..."
                className="mt-1 resize-none"
              />
            </div>

            <Separator />

            {/* Paramètres en grille */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Statut</label>
                <Select
                  value={formValues.kanban_status || ''}
                  onValueChange={(v) => updateField('kanban_status', v)}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Module</label>
                <Select
                  value={formValues.module || ''}
                  onValueChange={(v) => updateField('module', v || null)}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div>
                <label className="text-xs text-muted-foreground">Estimation (h)</label>
                <div className="flex gap-1 mt-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={formValues.h_min ?? ''}
                    onChange={(e) => updateField('h_min', e.target.value ? Number(e.target.value) : null)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={formValues.h_max ?? ''}
                    onChange={(e) => updateField('h_max', e.target.value ? Number(e.target.value) : null)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Priorité */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priorité (0-12)
              </label>
              <div className="mt-2 flex items-center gap-4">
                <HeatPriorityBadge priority={formValues.heat_priority as number | undefined} size="default" showLabel />
                <div className="flex-1">
                  <Slider
                    value={[(formValues.heat_priority as number) ?? 3]}
                    min={0}
                    max={12}
                    step={1}
                    onValueChange={(v) => updateField('heat_priority', v[0])}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Porteur du projet */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Porteur du projet
              </label>
              <div className="mt-2">
                <OwnerSideSlider
                  value={ownerSideToSliderValue(formValues.owner_side as string | null)}
                  onChange={(v) => updateField('owner_side', sliderValueToOwnerSide(v))}
                />
              </div>
            </div>

            {/* Notes internes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes internes
              </label>
              <Textarea
                value={formValues.notes_internes || ''}
                onChange={(e) => updateField('notes_internes', e.target.value || null)}
                rows={3}
                placeholder="Notes privées..."
                className="mt-1 resize-none"
              />
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              <div className="flex gap-2">
                {hasChanges && (
                  <Button variant="secondary" onClick={handleSave} disabled={updateTicket.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                )}
                <Button variant="ghost" onClick={handleSkip} disabled={currentIndex === totalTickets - 1}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Passer
                </Button>
                <Button
                  onClick={handleSaveAndNext}
                  disabled={updateTicket.isPending || (!hasChanges && currentIndex === totalTickets - 1)}
                >
                  {updateTicket.isPending ? (
                    'Enregistrement...'
                  ) : currentIndex === totalTickets - 1 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Terminer
                    </>
                  ) : (
                    <>
                      {hasChanges ? 'Sauver et suivant' : 'Suivant'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawer pour édition détaillée */}
      <TicketDetailDrawer
        ticket={currentTicket || null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        modules={modules}
        priorities={priorities}
        statuses={statuses}
        onUpdate={(updates) => updateTicket.mutate(updates)}
      />
    </div>
  );
}
