/**
 * Page principale du module Suivi RH - Vue cockpit unifiée style LUCCA
 * Accessible N2+ uniquement
 */

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRHCollaborators } from '@/hooks/useRHSuivi';
import { RHCockpitTable } from '@/components/rh/cockpit';
import { CompetencesMatrixPrint } from '@/components/rh/CompetencesMatrixPrint';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCollaboratorsEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { useProfile } from '@/contexts/ProfileContext';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { CollaboratorFormData } from '@/types/collaborator';
import { Button } from '@/components/ui/button';
import { UserPlus, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

// Système d'onglets navigateur
import { RHTabsProvider, RHTabsBar, RHTabsContent, useRHTabs } from '@/components/rh/browser-tabs';
import { ApogeeSyncButton } from '@/components/rh/ApogeeSync';
import { RHCollaborator } from '@/types/rh-suivi';

function RHSuiviContent() {
  const queryClient = useQueryClient();
  const { agencyId, agence } = useProfile();
  const { openCollaborator } = useRHTabs();
  
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators({ includeFormer: false });
  const { data: epiSummaries = [] } = useCollaboratorsEpiSummary(agencyId || undefined);
  
  const [showCompetencesMatrix, setShowCompetencesMatrix] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [editingCollaboratorId, setEditingCollaboratorId] = useState<string | null>(null);

  // Hook collaborateurs pour création/update fiche RH
  const { createMutation, updateMutation, collaborators: allCollaborators } = useCollaborators();
  
  // Récupérer les données sensibles du collaborateur en cours d'édition
  const { sensitiveData } = useSensitiveData(editingCollaboratorId || undefined);
  
  // Trouver le collaborateur à éditer
  const editingCollaborator = useMemo(() => {
    if (!editingCollaboratorId) return null;
    return allCollaborators.find(c => c.id === editingCollaboratorId) || null;
  }, [editingCollaboratorId, allCollaborators]);
  
  // Construire les données initiales pour le wizard en mode édition
  const wizardInitialData = useMemo(() => {
    if (!editingCollaborator) return undefined;
    return {
      id: editingCollaborator.id,
      first_name: editingCollaborator.first_name,
      last_name: editingCollaborator.last_name,
      email: editingCollaborator.email || '',
      phone: editingCollaborator.phone || '',
      type: editingCollaborator.type || 'AUTRE',
      role: editingCollaborator.role,
      notes: editingCollaborator.notes || '',
      hiring_date: editingCollaborator.hiring_date || '',
      leaving_date: editingCollaborator.leaving_date || '',
      street: editingCollaborator.street || '',
      postal_code: editingCollaborator.postal_code || '',
      city: editingCollaborator.city || '',
      birth_place: editingCollaborator.birth_place || '',
      apogee_user_id: editingCollaborator.apogee_user_id || undefined,
      // Données sensibles
      birth_date: sensitiveData?.birth_date || '',
      social_security_number: sensitiveData?.social_security_number || '',
      emergency_contact: sensitiveData?.emergency_contact || '',
      emergency_phone: sensitiveData?.emergency_phone || '',
      competences: [],
    };
  }, [editingCollaborator, sensitiveData]);

  // Handler de création collaborateur
  const handleCreateCollaborator = (data: CollaboratorFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowWizard(false);
        setEditingCollaboratorId(null);
        queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
        queryClient.invalidateQueries({ queryKey: ['collaborators'] });
        refetch();
      },
    });
  };
  
  // Handler d'update collaborateur
  const handleUpdateCollaborator = (data: CollaboratorFormData) => {
    if (!editingCollaboratorId) return;
    updateMutation.mutate({ id: editingCollaboratorId, data }, {
      onSuccess: () => {
        setShowWizard(false);
        setEditingCollaboratorId(null);
        queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
        queryClient.invalidateQueries({ queryKey: ['collaborators'] });
        refetch();
      },
    });
  };
  
  // Ouvrir le wizard en mode création
  const handleOpenCreate = () => {
    setWizardMode('create');
    setEditingCollaboratorId(null);
    setShowWizard(true);
  };
  
  // Fermer le wizard
  const handleCloseWizard = (open: boolean) => {
    if (!open) {
      setShowWizard(false);
      setEditingCollaboratorId(null);
    }
  };

  // Handler pour ouvrir un profil dans un onglet navigateur
  const handleOpenProfile = (collaborator: RHCollaborator) => {
    openCollaborator(collaborator);
  };

  // Contenu de l'onglet "Vue d'ensemble" - maintenant le cockpit
  const overviewContent = (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tableau cockpit */}
      <RHCockpitTable
        collaborators={collaborators}
        epiSummaries={epiSummaries}
        isLoading={isLoading}
        onRefresh={refetch}
        onOpenProfile={handleOpenProfile}
        className="flex-1"
      />
    </div>
  );

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <PageHeader
        title="Suivi RH"
        subtitle="Vue cockpit de tous les collaborateurs"
        backTo="/rh"
        backLabel="Retour RH"
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompetencesMatrix(true)}
            >
              <Printer className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Matrice compétences</span>
            </Button>
            <ApogeeSyncButton
              agencySlug={agence || undefined}
              collaborators={collaborators}
            />
            <Button onClick={handleOpenCreate} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau collaborateur
            </Button>
          </div>
        }
      />

      {/* Barre d'onglets navigateur (conservée) */}
      <RHTabsBar collaborators={collaborators} />
      
      {/* Contenu des onglets */}
      <RHTabsContent overviewContent={overviewContent} />
      
      <CompetencesMatrixPrint
        open={showCompetencesMatrix}
        onOpenChange={setShowCompetencesMatrix}
      />

      {/* Wizard création/édition fiche collaborateur RH */}
      <CollaboratorWizard
        open={showWizard}
        onOpenChange={handleCloseWizard}
        onSubmit={wizardMode === 'edit' ? handleUpdateCollaborator : handleCreateCollaborator}
        isPending={wizardMode === 'edit' ? updateMutation.isPending : createMutation.isPending}
        mode={wizardMode}
        initialData={wizardInitialData}
      />
    </div>
  );
}

export default function RHSuiviIndex() {
  const { data: collaborators = [] } = useRHCollaborators({ includeFormer: false });
  
  return (
    <div className="container py-4 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <RHTabsProvider collaborators={collaborators}>
        <RHSuiviContent />
      </RHTabsProvider>
    </div>
  );
}
