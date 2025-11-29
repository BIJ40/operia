/**
 * Page de revue/édition en masse des tickets avec filtres
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  SkipForward,
  FileSpreadsheet,
  Filter,
  X,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { HeatPriorityBadge, HEAT_PRIORITY_OPTIONS } from '../components/HeatPriorityBadge';
import type { ApogeeTicket, TicketFilters } from '../types';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsReview() {
  const [filters, setFilters] = useState<TicketFilters>({});
  const { tickets, modules, priorities, statuses, updateTicket, isLoading } = useApogeeTickets(filters);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Formulaire local pour le ticket courant
  const [formValues, setFormValues] = useState<Partial<ApogeeTicket>>({});

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
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setCurrentIndex(0); // Reset to first ticket when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentIndex(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

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
        <Link to={ROUTES.admin.apogeeTickets}>
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
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              value={filters.module || ''}
              onValueChange={(v) => updateFilter('module', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.is_qualified === true ? 'true' : filters.is_qualified === false ? 'false' : ''}
              onValueChange={(v) => updateFilter('is_qualified', v === '' ? undefined : v === 'true')}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">✓ Qualifiés IA</SelectItem>
                <SelectItem value="false">À qualifier</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.needs_completion === true ? 'true' : filters.needs_completion === false ? 'false' : ''}
              onValueChange={(v) => updateFilter('needs_completion', v === '' ? undefined : v === 'true')}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Complétude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Incomplets</SelectItem>
                <SelectItem value="false">Complets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3">
            <Input
              placeholder="Rechercher..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="h-9"
            />
          </div>
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
                  {!currentTicket.severity && (
                    <Badge variant="outline" className="text-orange-500 border-orange-300 line-through">
                      Sévérité
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
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Modifié
                </Badge>
              )}
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
                  <SelectContent>
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
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Priorité</label>
                <Select
                  value={formValues.priority || ''}
                  onValueChange={(v) => updateField('priority', v || null)}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sévérité</label>
                <Select
                  value={formValues.severity || ''}
                  onValueChange={(v) => updateField('severity', v || null)}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITIQUE">Critique</SelectItem>
                    <SelectItem value="MAJEUR">Majeur</SelectItem>
                    <SelectItem value="CONFORT">Confort</SelectItem>
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

            {/* Priorité Thermique */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priorité Thermique (0-12)
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
    </div>
  );
}
