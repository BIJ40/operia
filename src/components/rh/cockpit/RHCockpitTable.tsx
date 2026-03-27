/**
 * Tableau cockpit RH - Vue synthétique style LUCCA
 * Remplace les 6 onglets par une vue unique avec indicateurs visuels
 */

 import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { calculateCockpitIndicators, useRHCockpitIndicatorsBatch, CockpitIndicators } from '@/hooks/rh/useRHCockpitIndicators';
import { RHCockpitRow } from './RHCockpitRow';

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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { HRDocumentManager } from '@/components/collaborators/documents';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';

interface RHCockpitTableProps {
  collaborators: RHCollaborator[];
  epiSummaries?: CollaboratorEpiSummary[];
  isLoading?: boolean;
  onRefresh: () => void;
  onOpenProfile: (collaborator: RHCollaborator) => void;
  onCreateAccount?: (collaborator: RHCollaborator) => void;
  className?: string;
}

export function RHCockpitTable({
  collaborators,
  epiSummaries = [],
  isLoading,
  onRefresh,
  onOpenProfile,
  onCreateAccount,
  className,
}: RHCockpitTableProps) {
  
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

  // État du gestionnaire de documents (dialog plein écran)
  const [docManagerCollab, setDocManagerCollab] = useState<RHCollaborator | null>(null);
  const canManage = useHasMinLevel(2);

  // Calcul des indicateurs pour tous les collaborateurs
  const indicatorsMap = useRHCockpitIndicatorsBatch(collaborators, epiSummaries);



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
        return <RHCockpitDrawerDocs {...commonProps} onOpenFinder={() => {
          setDocManagerCollab(drawer.collaborator);
          handleCloseDrawer(false);
        }} />;
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.length === 0 ? (
                <TableRow>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground">
                    Aucun collaborateur
                  </td>
                </TableRow>
              ) : (
                collaborators.map((collab) => {
                  const indicators = indicatorsMap.get(collab.id) ?? calculateCockpitIndicators(collab);

                  return (
                    <RHCockpitRow
                      key={collab.id}
                      collaborator={collab}
                      indicators={indicators}
                      onOpenDrawer={(domain) => handleOpenDrawer(collab, domain)}
                      onOpenProfile={() => onOpenProfile(collab)}
                      onDoubleClick={() => onOpenProfile(collab)}
                      onCreateAccount={onCreateAccount}
                      canCreateAccount={canManage}
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
      {/* Dialog gestionnaire de documents */}
      <Dialog open={!!docManagerCollab} onOpenChange={(open) => !open && setDocManagerCollab(null)}>
        <DialogContent className="max-w-6xl w-[96vw] h-[90vh] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="font-semibold truncate">
                Documents — {docManagerCollab?.first_name} {docManagerCollab?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Gestion complète des documents du collaborateur
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {docManagerCollab && (
                <HRDocumentManager collaboratorId={docManagerCollab.id} canManage={canManage} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
