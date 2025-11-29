/**
 * Page de classification des tickets "À spécifier"
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle2, FolderOpen, SkipForward, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { HeatPriorityBadge } from '../components/HeatPriorityBadge';
import { OwnerSideSlider, ownerSideToSliderValue, sliderValueToOwnerSide } from '../components/OwnerSideSlider';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import type { ApogeeTicket, OwnerSide } from '../types';
import { ROUTES } from '@/config/routes';

export default function ApogeeTicketsClassify() {
  const navigate = useNavigate();
  const { tickets: allTickets, modules, priorities, statuses, updateTicket, isLoading } = useApogeeTickets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ownerSliderValue, setOwnerSliderValue] = useState<number | null>(null);
  const [hMin, setHMin] = useState<string>('');
  const [hMax, setHMax] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Liste stable de tickets "À spécifier" pour la session
  const [stableTickets, setStableTickets] = useState<ApogeeTicket[]>([]);
  const isInitialized = useRef(false);

  // Initialiser la liste stable une seule fois au chargement
  useEffect(() => {
    if (!isInitialized.current && allTickets.length > 0) {
      const toClassify = allTickets.filter(t => t.kanban_status === 'SPEC_A_FAIRE');
      setStableTickets(toClassify);
      isInitialized.current = true;
    }
  }, [allTickets]);

  const ticketsToClassify = stableTickets;
  const currentTicket = ticketsToClassify[currentIndex];
  const totalTickets = ticketsToClassify.length;

  // Réinitialiser les valeurs quand on change de ticket
  useEffect(() => {
    if (currentTicket) {
      setOwnerSliderValue(ownerSideToSliderValue(currentTicket.owner_side));
      setHMin(currentTicket.h_min?.toString() || '');
      setHMax(currentTicket.h_max?.toString() || '');
    }
  }, [currentTicket?.id]);
  const progressPercent = totalTickets > 0 ? Math.round((currentIndex / totalTickets) * 100) : 0;

  // Statuts disponibles pour la classification (exclure "À spécifier" et "Clôturé")
  const targetStatuses = statuses
    .filter(s => s.id !== 'SPEC_A_FAIRE' && s.id !== 'CLOTURE')
    .sort((a, b) => a.display_order - b.display_order);

  const handleClassify = async (newStatus: string) => {
    if (!currentTicket) return;

    const hMinValue = hMin ? parseFloat(hMin) : null;
    const hMaxValue = hMax ? parseFloat(hMax) : null;

    await updateTicket.mutateAsync({
      id: currentTicket.id,
      kanban_status: newStatus,
      owner_side: sliderValueToOwnerSide(ownerSliderValue),
      h_min: hMinValue,
      h_max: hMaxValue,
    });

    // Si c'est le dernier ticket, rediriger vers le Kanban
    if (currentIndex >= totalTickets - 1) {
      toast.success('Tous les tickets ont été classifiés !');
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
            <h2 className="text-xl font-semibold mb-2">Aucun ticket à classifier !</h2>
            <p className="text-muted-foreground">
              Tous les tickets "À spécifier" ont été classifiés.
            </p>
            <Link to={ROUTES.admin.apogeeTickets}>
              <Button className="mt-4">Voir le Kanban</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {progressPercent}% classifié
        </p>
      </div>

      {/* Ticket card */}
      {currentTicket && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
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
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDrawerOpen(true)}
                  title="Voir / Éditer le ticket"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {currentTicket.heat_priority !== null && (
                  <HeatPriorityBadge priority={currentTicket.heat_priority} size="sm" />
                )}
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  À classifier
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

            {/* Infos complémentaires */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {currentTicket.module && (
                <div>
                  <span className="text-muted-foreground">Module:</span>{' '}
                  <span className="font-medium">{currentTicket.module}</span>
                </div>
              )}
              {currentTicket.reported_by && (
                <div>
                  <span className="text-muted-foreground">Signalé par:</span>{' '}
                  <span className="font-medium">{currentTicket.reported_by}</span>
                </div>
              )}
            </div>

            {/* Estimation heures */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Estimation (heures)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={hMin}
                  onChange={(e) => setHMin(e.target.value)}
                  className="w-24"
                  min={0}
                  step={0.5}
                />
                <span className="text-muted-foreground">à</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={hMax}
                  onChange={(e) => setHMax(e.target.value)}
                  className="w-24"
                  min={0}
                  step={0.5}
                />
                <span className="text-muted-foreground text-sm">h</span>
                {(!hMin && !hMax) && (
                  <Badge variant="outline" className="text-destructive border-destructive/30 text-xs line-through">
                    Temps
                  </Badge>
                )}
              </div>
            </div>

            {/* Porteur du projet - Slider Apogée ↔ HC */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Porteur du projet
              </p>
              <OwnerSideSlider
                value={ownerSliderValue}
                onChange={setOwnerSliderValue}
                disabled={updateTicket.isPending}
              />
            </div>

            {/* Boutons de classification */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Où classer ce ticket ?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {targetStatuses.map((status) => (
                  <Button
                    key={status.id}
                    variant="outline"
                    onClick={() => handleClassify(status.id)}
                    disabled={updateTicket.isPending}
                    className="justify-start h-auto py-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: status.color || '#6b7280' }}
                    />
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              <Button variant="ghost" onClick={handleSkip}>
                <SkipForward className="h-4 w-4 mr-2" />
                Passer
              </Button>
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
