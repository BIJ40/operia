/**
 * Tableau cockpit RH - Vue synthétique style LUCCA
 * Remplace les 6 onglets par une vue unique avec indicateurs visuels
 */

 import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { calculateCockpitIndicators, useRHCockpitIndicatorsBatch, CockpitIndicators } from '@/hooks/rh/useRHCockpitIndicators';
import { RHCockpitRow } from './RHCockpitRow';
import { RHCockpitFilters, CockpitFilterId } from './RHCockpitFilters';
import { 
  RHCockpitDrawer, 
  DrawerDomain 
} from './RHCockpitDrawer';
import { RHCockpitDrawerContact } from './RHCockpitDrawerContact';
import { RHCockpitDrawerICE } from './RHCockpitDrawerICE';
import { RHCockpitDrawerRH } from './RHCockpitDrawerRH';
import { RHCockpitDrawerEPI } from './RHCockpitDrawerEPI';
import { RHCockpitDrawerParc } from './RHCockpitDrawerParc';
import { RHCockpitDrawerDocs } from './RHCockpitDrawerDocs';
import { RHCockpitDrawerCompetences } from './RHCockpitDrawerCompetences';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { differenceInDays, parseISO } from 'date-fns';

interface RHCockpitTableProps {
  collaborators: RHCollaborator[];
  epiSummaries?: CollaboratorEpiSummary[];
  isLoading?: boolean;
  onRefresh: () => void;
  onOpenProfile: (collaborator: RHCollaborator) => void;
  className?: string;
}

export function RHCockpitTable({
  collaborators,
  epiSummaries = [],
  isLoading,
  onRefresh,
  onOpenProfile,
  className,
}: RHCockpitTableProps) {
  // État des filtres
  const [activeFilters, setActiveFilters] = useState<CockpitFilterId[]>([]);
  
  // État du drawer
  const [drawer, setDrawer] = useState<{
    open: boolean;
    domain: DrawerDomain;
    collaborator: RHCollaborator | null;
  }>({
    open: false,
    domain: 'contact',
    collaborator: null,
  });

  // Calcul des indicateurs pour tous les collaborateurs
  const indicatorsMap = useRHCockpitIndicatorsBatch(collaborators, epiSummaries);

  // Calcul des compteurs de filtres
  const filterCounts = useMemo(() => {
    const counts: Record<CockpitFilterId, number> = {
      incomplete: 0,
      new: 0,
      epi_missing: 0,
      docs_missing: 0,
      no_vehicle: 0,
      no_competences: 0,
    };

    for (const collab of collaborators) {
      const ind = indicatorsMap.get(collab.id);
      if (!ind) continue;

      // Incomplet = complétude < 80%
      if (ind.completeness < 80) counts.incomplete++;

      // Nouveau = embauché il y a moins de 30 jours
      if (collab.hiring_date) {
        const days = differenceInDays(new Date(), parseISO(collab.hiring_date));
        if (days <= 30 && days >= 0) counts.new++;
      }

      // EPI incomplets
      if (ind.epiTailles === 'warning' || ind.epiTailles === 'error') counts.epi_missing++;

      // Docs manquants
      if (ind.documents.filled < ind.documents.total) counts.docs_missing++;

      // Sans véhicule (technicien uniquement)
      if (collab.type === 'TECHNICIEN' && ind.parc === 'none') counts.no_vehicle++;

      // Sans compétences
      if (ind.competences === 0) counts.no_competences++;
    }

    return counts;
  }, [collaborators, indicatorsMap]);

  // Filtrage des collaborateurs
  const filteredCollaborators = useMemo(() => {
    if (activeFilters.length === 0) return collaborators;

    return collaborators.filter((collab) => {
      // Toujours calculer les indicateurs, même si pas encore dans la map
      const ind = indicatorsMap.get(collab.id) ?? calculateCockpitIndicators(collab);

      // OR logic entre les filtres actifs
      for (const filter of activeFilters) {
        switch (filter) {
          case 'incomplete':
            if (ind.completeness < 80) return true;
            break;
          case 'new':
            if (collab.hiring_date) {
              const days = differenceInDays(new Date(), parseISO(collab.hiring_date));
              if (days <= 30 && days >= 0) return true;
            }
            break;
          case 'epi_missing':
            if (ind.epiTailles === 'warning' || ind.epiTailles === 'error') return true;
            break;
          case 'docs_missing':
            if (ind.documents.filled < ind.documents.total) return true;
            break;
          case 'no_vehicle':
            if (collab.type === 'TECHNICIEN' && ind.parc === 'none') return true;
            break;
          case 'no_competences':
            if (ind.competences === 0) return true;
            break;
        }
      }

      return false;
    });
  }, [collaborators, activeFilters, indicatorsMap]);

  // Toggle un filtre
  const handleFilterToggle = useCallback((filterId: CockpitFilterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  // Ouvrir le drawer
  const handleOpenDrawer = useCallback((collaborator: RHCollaborator, domain: DrawerDomain) => {
    setDrawer({
      open: true,
      domain,
      collaborator,
    });
  }, []);

  // Fermer le drawer
  const handleCloseDrawer = useCallback((open: boolean) => {
    if (!open) {
      setDrawer((prev) => ({ ...prev, open: false }));
    }
  }, []);

  // Contenu du drawer selon le domaine
  const renderDrawerContent = () => {
    if (!drawer.collaborator) return null;

    const commonProps = {
      collaborator: drawer.collaborator,
      onRefresh,
    };

    switch (drawer.domain) {
      case 'contact':
        return <RHCockpitDrawerContact {...commonProps} />;
      case 'ice':
        return <RHCockpitDrawerICE {...commonProps} />;
      case 'rh':
        return <RHCockpitDrawerRH {...commonProps} />;
      case 'epi':
        return <RHCockpitDrawerEPI {...commonProps} />;
      case 'parc':
        return <RHCockpitDrawerParc {...commonProps} />;
      case 'docs':
        return <RHCockpitDrawerDocs {...commonProps} />;
      case 'competences':
        return <RHCockpitDrawerCompetences {...commonProps} />;
      default:
        return null;
    }
  };

  // Indicateur du drawer
  const drawerIndicators = drawer.collaborator 
    ? indicatorsMap.get(drawer.collaborator.id) 
    : undefined;

  // Statut du drawer pour le message pédagogique
  const getDrawerStatus = () => {
    if (!drawerIndicators || !drawer.domain) return 'ok';
    
    switch (drawer.domain) {
      case 'contact':
        return drawerIndicators.contact;
      case 'ice':
        return drawerIndicators.iceStatus;
      case 'rh':
        return drawerIndicators.rh;
      case 'epi':
        return drawerIndicators.epiTailles;
      case 'docs':
        return drawerIndicators.documentsStatus;
      case 'competences':
        return drawerIndicators.competencesStatus;
      default:
        return 'ok';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2 h-full', className)}>
      {/* Filtres rapides + bouton reset */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <RHCockpitFilters
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
          counts={filterCounts}
        />
        {activeFilters.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveFilters([])}
          >
            Tout afficher
          </Button>
        )}
      </div>

      {/* Tableau avec scroll */}
      <Card className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[220px] sticky left-0 bg-background z-30">
                  Collaborateur
                </TableHead>
                <TableHead className="w-[70px] text-center">Contact</TableHead>
                <TableHead className="w-[60px] text-center">ICE</TableHead>
                <TableHead className="w-[80px] text-center">EPI</TableHead>
                <TableHead className="w-[60px] text-center">Parc</TableHead>
                <TableHead className="w-[70px] text-center">Docs</TableHead>
                <TableHead className="w-[80px] text-center">Compét.</TableHead>
                <TableHead className="w-[50px] text-center">%</TableHead>
                <TableHead className="w-[60px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollaborators.length === 0 ? (
                <TableRow>
                  <td colSpan={9} className="h-32 text-center text-muted-foreground">
                    {activeFilters.length > 0
                      ? 'Aucun collaborateur ne correspond aux filtres'
                      : 'Aucun collaborateur'}
                  </td>
                </TableRow>
              ) : (
                filteredCollaborators.map((collab) => {
                  const indicators = indicatorsMap.get(collab.id) ?? calculateCockpitIndicators(collab);

                  return (
                    <RHCockpitRow
                      key={collab.id}
                      collaborator={collab}
                      indicators={indicators}
                      onOpenDrawer={(domain) => handleOpenDrawer(collab, domain)}
                      onOpenProfile={() => onOpenProfile(collab)}
                      onDoubleClick={() => onOpenProfile(collab)}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Drawer latéral */}
      <RHCockpitDrawer
        open={drawer.open}
        onOpenChange={handleCloseDrawer}
        domain={drawer.domain}
        collaborator={drawer.collaborator}
        status={getDrawerStatus()}
      >
        {renderDrawerContent()}
      </RHCockpitDrawer>
    </div>
  );
}
