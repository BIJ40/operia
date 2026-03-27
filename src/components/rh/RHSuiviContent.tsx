/**
 * Contenu de l'onglet "Salariés" - Suivi RH
 * Utilise un système de pills comme StatsHub pour afficher chaque salarié
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useRHCollaborators } from '@/hooks/useRHSuivi';
import { RHCockpitTable } from '@/components/rh/cockpit';
import { CompetencesMatrixPrint } from '@/components/rh/CompetencesMatrixPrint';
import { useCollaboratorsEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { CollaboratorFormData } from '@/types/collaborator';
import { Button } from '@/components/ui/button';
import { UserPlus, Printer } from 'lucide-react';

import { ApogeeSyncButton } from '@/components/rh/ApogeeSync';
import { SalariesFolderTabs } from '@/components/rh/salaries/SalariesFolderTabs';
import { RHCollaboratorPanel } from '@/components/rh/browser-tabs/RHCollaboratorPanel';
import { RHTabsProvider } from '@/components/rh/browser-tabs/RHTabsContext';
import { RHCollaborator } from '@/types/rh-suivi';
import { cn } from '@/lib/utils';
import { CreateUserDialog } from '@/components/admin/users/UserDialogs';
import { useUserManagement } from '@/hooks/use-user-management';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { usePermissions } from '@/contexts/PermissionsContext';
import { getRoleLevel } from '@/types/globalRoles';

export function RHSuiviContent() {
  const queryClient = useQueryClient();
  const { agencyId, agence } = useEffectiveAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators({ includeFormer: false });
  const { data: epiSummaries = [] } = useCollaboratorsEpiSummary(agencyId || undefined);
  
  // Création de compte Operia depuis collaborateur
  const canCreateAccount = useHasMinLevel(2);
  const { globalRole } = usePermissions();
  const currentUserLevel = getRoleLevel(globalRole || 'base_user');
  const { createUserMutation, assignableRoles, agencies } = useUserManagement({ scope: 'ownAgency' });
  const [createFromCollab, setCreateFromCollab] = useState<{
    collaboratorId: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  
  // Sync avec URL (paramètre ?collab=)
  const urlCollab = searchParams.get('collab');
  const activeCollaboratorId = urlCollab || null;
  
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
      birth_date: sensitiveData?.birth_date || '',
      social_security_number: sensitiveData?.social_security_number || '',
      emergency_contact: sensitiveData?.emergency_contact || '',
      emergency_phone: sensitiveData?.emergency_phone || '',
      competences: [],
    };
  }, [editingCollaborator, sensitiveData]);

  // Sélectionner un collaborateur (navigation via URL)
  const handleSelectCollaborator = useCallback((id: string | null) => {
    setSearchParams(params => {
      const newParams = new URLSearchParams(params);
      if (id === null) {
        newParams.delete('collab');
      } else {
        newParams.set('collab', id);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

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

  // Handler pour ouvrir un profil depuis le tableau
  const handleOpenProfile = (collaborator: RHCollaborator) => {
    handleSelectCollaborator(collaborator.id);
  };

  // Vérifier si l'onglet actif est valide
  const activeCollaborator = useMemo(() => {
    if (!activeCollaboratorId) return null;
    return collaborators.find(c => c.id === activeCollaboratorId) || null;
  }, [activeCollaboratorId, collaborators]);

  return (
    <RHTabsProvider collaborators={collaborators}>
      <div className="flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
        {/* Header avec actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            {collaborators.length} salarié{collaborators.length > 1 ? 's' : ''} actif{collaborators.length > 1 ? 's' : ''}
          </div>
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
              Nouveau salarié
            </Button>
          </div>
        </div>

        {/* Barre de tabs folder salariés - tous affichés en permanence */}
        <SalariesFolderTabs
          collaborators={collaborators}
          activeCollaboratorId={activeCollaboratorId}
          onSelectCollaborator={handleSelectCollaborator}
        />
        
        {/* Contenu */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Vue d'ensemble (tableau) */}
          <div className={cn(
            "h-full overflow-auto",
            activeCollaboratorId ? "hidden" : "block"
          )}>
            <RHCockpitTable
              collaborators={collaborators}
              epiSummaries={epiSummaries}
              isLoading={isLoading}
              onRefresh={refetch}
              onOpenProfile={handleOpenProfile}
              className="flex-1"
            />
          </div>
          
          {/* Panneaux collaborateurs (tous préchargés pour navigation instantanée) */}
          {collaborators.map(collab => (
            <div
              key={collab.id}
              className={cn(
                "h-full overflow-auto",
                activeCollaboratorId === collab.id ? "block" : "hidden"
              )}
            >
              <RHCollaboratorPanel collaboratorId={collab.id} />
            </div>
          ))}
        </div>
        
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
    </RHTabsProvider>
  );
}
