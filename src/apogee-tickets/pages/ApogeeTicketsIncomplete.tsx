/**
 * Page de complétion des tickets incomplets
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, SkipForward, Snowflake, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIncompleteTickets, useApogeeTickets } from '../hooks/useApogeeTickets';
import { HeatPriorityBadge } from '../components/HeatPriorityBadge';
import type { ApogeeTicket, OwnerSide } from '../types';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsIncomplete() {
  const { tickets: rawIncompleteTickets, isLoading } = useIncompleteTickets();
  const { modules, updateTicket } = useApogeeTickets();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Formulaire local pour le ticket courant
  const [formValues, setFormValues] = useState<{
    module: string | null;
    heat_priority: number | null;
    owner_side: OwnerSide | null;
  }>({
    module: null,
    heat_priority: null,
    owner_side: null,
  });

  // Déterminer les champs manquants
  const getMissingFields = (ticket: ApogeeTicket) => {
    const missing: string[] = [];
    if (!ticket.module) missing.push('module');
    if (ticket.heat_priority === null || ticket.heat_priority === undefined) missing.push('heat_priority');
    if (!ticket.owner_side) missing.push('owner_side');
    return missing;
  };

  // Filtrer côté client pour n'afficher que ceux avec vraiment des champs manquants
  const incompleteTickets = rawIncompleteTickets.filter(t => getMissingFields(t).length > 0);

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
    if (formValues.owner_side) updates.owner_side = formValues.owner_side;

    await updateTicket.mutateAsync(updates);
    
    // Reset form et passer au suivant
    setFormValues({ module: null, heat_priority: null, owner_side: null });
    if (currentIndex < totalTickets - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    setFormValues({ module: null, heat_priority: null, owner_side: null });
    if (currentIndex < totalTickets - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFormValues({ module: null, heat_priority: null, owner_side: null });
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
              <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                {missingFields.length} champ(s) manquant(s)
              </Badge>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Quel module Apogée est concerné ?
                  </label>
                  <Select
                    value={formValues.module || currentTicket.module || ''}
                    onValueChange={(v) => setFormValues({ ...formValues, module: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              {missingFields.includes('owner_side') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Qui porte le sujet ?
                  </label>
                  <Select
                    value={formValues.owner_side || currentTicket.owner_side || ''}
                    onValueChange={(v) => setFormValues({ ...formValues, owner_side: (v || null) as OwnerSide })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le propriétaire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HC">Help Confort</SelectItem>
                      <SelectItem value="APOGEE">Apogée</SelectItem>
                      <SelectItem value="PARTAGE">Partagé (HC + Apogée)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
    </div>
  );
}
