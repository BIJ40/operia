/**
 * Page de complétion des tickets incomplets
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, SkipForward, Snowflake, Flame, ChevronsUpDown, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useIncompleteTickets, useApogeeTickets } from '../hooks/useApogeeTickets';
import { HeatPriorityBadge } from '../components/HeatPriorityBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from '../components/OwnerSideSlider';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import type { ApogeeTicket } from '../types';
import { ROUTES } from '@/config/routes';

// Combobox pour sélection de module (plus fiable que Select pour longues listes)
function ModuleCombobox({ 
  modules, 
  value, 
  onChange 
}: { 
  modules: { id: string; label: string }[]; 
  value: string; 
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedModule = modules.find(m => m.id === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Quel module Apogée est concerné ?
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedModule?.label || "Sélectionner un module..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un module..." />
            <CommandList>
              <CommandEmpty>Aucun module trouvé.</CommandEmpty>
              <CommandGroup>
                {[...modules].sort((a, b) => a.label.localeCompare(b.label, 'fr')).map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.label}
                    onSelect={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === m.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {m.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ApogeeTicketsIncomplete() {
  const navigate = useNavigate();
  const { tickets: rawIncompleteTickets, isLoading } = useIncompleteTickets();
  const { modules, priorities, statuses, updateTicket } = useApogeeTickets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Liste stable de tickets pour la session (ne change pas quand on complète un ticket)
  const [stableTickets, setStableTickets] = useState<ApogeeTicket[]>([]);
  const isInitialized = useRef(false);

  // Déterminer les champs manquants
  const getMissingFields = (ticket: ApogeeTicket) => {
    const missing: string[] = [];
    if (!ticket.module) missing.push('module');
    if (ticket.heat_priority === null || ticket.heat_priority === undefined) missing.push('heat_priority');
    return missing;
  };

  // Initialiser la liste stable une seule fois au chargement
  useEffect(() => {
    if (!isInitialized.current && rawIncompleteTickets.length > 0) {
      const filtered = rawIncompleteTickets.filter(t => getMissingFields(t).length > 0);
      setStableTickets(filtered);
      isInitialized.current = true;
    }
  }, [rawIncompleteTickets]);

  // Utiliser la liste stable pour la navigation
  const incompleteTickets = stableTickets;

  // Formulaire par ticket (conserve les valeurs lors de la navigation)
  const [formValuesByTicket, setFormValuesByTicket] = useState<Record<string, {
    module: string | null;
    heat_priority: number | null;
    owner_side_value: number;
  }>>({});

  // Valeurs du formulaire pour le ticket courant
  const currentTicketId = incompleteTickets[currentIndex]?.id;
  const currentTicketData = incompleteTickets[currentIndex];
  const formValues = currentTicketId ? (formValuesByTicket[currentTicketId] || {
    module: null,
    heat_priority: null,
    owner_side_value: ownerSideToSliderValue(currentTicketData?.owner_side || null),
  }) : { module: null, heat_priority: null, owner_side_value: 50 };

  const setFormValues = (values: { module: string | null; heat_priority: number | null; owner_side_value: number }) => {
    if (currentTicketId) {
      setFormValuesByTicket(prev => ({
        ...prev,
        [currentTicketId]: values
      }));
    }
  };

  const currentTicket = incompleteTickets[currentIndex];
  const totalTickets = incompleteTickets.length;
  const progressPercent = totalTickets > 0 ? Math.round(((currentIndex) / totalTickets) * 100) : 0;

  // Valeur effective de heat_priority (form > ticket > default)
  const effectiveHeatPriority = formValues.heat_priority ?? currentTicket?.heat_priority ?? 3;

  const handleSaveAndNext = async () => {
    if (!currentTicket) return;

    const updates: Partial<ApogeeTicket> & { id: string } = { id: currentTicket.id };
    
    if (formValues.module) updates.module = formValues.module;
    if (formValues.heat_priority !== null) updates.heat_priority = formValues.heat_priority;
    updates.owner_side = sliderValueToOwnerSide(formValues.owner_side_value);

    await updateTicket.mutateAsync(updates);
    
    // Si c'est le dernier ticket, rediriger vers le Kanban
    if (currentIndex >= totalTickets - 1) {
      toast.success('Tous les tickets ont été traités !');
      navigate(ROUTES.admin.apogeeTickets);
    } else {
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

  const handleHeatPriorityChange = (value: number) => {
    setFormValues({ ...formValues, heat_priority: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (totalTickets === 0) {
    return (
      <div className="space-y-6">
        <Link to={ROUTES.admin.apogeeTickets}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Kanban
          </Button>
        </Link>

        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Tous les tickets sont complets !</h2>
            <p className="text-muted-foreground">
              Aucun ticket ne nécessite de complétion.
            </p>
            <Link to={ROUTES.admin.apogeeTickets}>
              <Button className="mt-4">Voir le Kanban</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const missingFields = currentTicket ? getMissingFields(currentTicket) : [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={ROUTES.admin.apogeeTickets}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Kanban
          </Button>
        </Link>
        <Badge variant="outline">
          {currentIndex + 1} / {totalTickets}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progressPercent} />
        <p className="text-sm text-center text-muted-foreground">
          {progressPercent}% complété
        </p>
      </div>

      {/* Ticket card */}
      {currentTicket && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {currentTicket.element_concerne}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentTicket.source_sheet && (
                    <span className="font-mono text-xs">
                      {currentTicket.source_sheet} - Ligne {currentTicket.source_row_index}
                    </span>
                  )}
                </CardDescription>
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
                <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {missingFields.length} champ(s) manquant(s)
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description si présente */}
            {currentTicket.description && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{currentTicket.description}</p>
              </div>
            )}

            {/* Questions pour les champs manquants */}
            <div className="space-y-4">
              {missingFields.includes('module') && (
                <ModuleCombobox
                  modules={modules}
                  value={formValues.module || currentTicket.module || ''}
                  onChange={(v) => setFormValues({ ...formValues, module: v || null })}
                />
              )}

              {missingFields.includes('heat_priority') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Quelle est la priorité de ce ticket ?
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <HeatPriorityBadge priority={effectiveHeatPriority} size="default" showLabel />
                    <button
                      type="button"
                      onClick={() => handleHeatPriorityChange(Math.max(0, effectiveHeatPriority - 1))}
                      className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                      title="Diminuer la priorité"
                    >
                      <Snowflake className="h-5 w-5 text-blue-400" />
                    </button>
                    <div className="flex-1">
                      <Slider
                        value={[effectiveHeatPriority]}
                        min={0}
                        max={12}
                        step={1}
                        onValueChange={(v) => handleHeatPriorityChange(v[0])}
                        className="w-full"
                        trackClassName="bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
                        rangeClassName="bg-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleHeatPriorityChange(Math.min(12, effectiveHeatPriority + 1))}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Augmenter la priorité"
                    >
                      <Flame className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Porteur du projet - toujours visible */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Porteur du projet
                </label>
                <OwnerSideSlider
                  value={formValues.owner_side_value}
                  onChange={(v) => setFormValues({ ...formValues, owner_side_value: v })}
                  disabled={updateTicket.isPending}
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleSkip}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Passer
                </Button>
                <Button
                  onClick={handleSaveAndNext}
                  disabled={updateTicket.isPending}
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
                      Enregistrer et suivant
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
