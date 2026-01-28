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
import { useAuth } from '@/contexts/AuthContext';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { CollaboratorFormData } from '@/types/collaborator';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';

import { ApogeeSyncButton } from '@/components/rh/ApogeeSync';
import { SalariesPillTabs } from '@/components/rh/salaries/SalariesPillTabs';
import { RHCollaboratorPanel } from '@/components/rh/browser-tabs/RHCollaboratorPanel';
import { RHTabsProvider } from '@/components/rh/browser-tabs/RHTabsContext';
import { RHCollaborator } from '@/types/rh-suivi';
import { cn } from '@/lib/utils';

interface OpenTabsState {
  tabs: string[];
  activeId: string | null;
}

export function RHSuiviContent() {
  const queryClient = useQueryClient();
  const { agencyId, agence } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators({ includeFormer: false });
  const { data: epiSummaries = [] } = useCollaboratorsEpiSummary(agencyId || undefined);
  
  // État des onglets ouverts - persisté en session
  const [tabsState, setTabsState] = useSessionState<OpenTabsState>('rh_salaries_tabs', {
    tabs: [],
    activeId: null,
  });
  
  // Sync avec URL (paramètre ?collab=)
  const urlCollab = searchParams.get('collab');
  const activeCollaboratorId = urlCollab || tabsState.activeId;
  
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

  // Sélectionner un collaborateur (ouvre un onglet si pas déjà ouvert)
  const handleSelectCollaborator = useCallback((id: string | null) => {
    if (id === null) {
      // Vue d'ensemble
      setTabsState(prev => ({ ...prev, activeId: null }));
      setSearchParams(params => {
        const newParams = new URLSearchParams(params);
        newParams.delete('collab');
        return newParams;
      }, { replace: true });
    } else {
      // Ouvrir le collaborateur
      setTabsState(prev => ({
        tabs: prev.tabs.includes(id) ? prev.tabs : [...prev.tabs, id],
        activeId: id,
      }));
      setSearchParams(params => {
        const newParams = new URLSearchParams(params);
        newParams.set('collab', id);
        return newParams;
      }, { replace: true });
    }
  }, [setTabsState, setSearchParams]);
  
  // Fermer un onglet
  const handleCloseTab = useCallback((id: string) => {
    setTabsState(prev => {
      const newTabs = prev.tabs.filter(t => t !== id);
      const wasActive = prev.activeId === id;
      const newActiveId = wasActive 
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
        : prev.activeId;
      
      // Mettre à jour URL si on ferme l'onglet actif
      if (wasActive) {
        setSearchParams(params => {
          const newParams = new URLSearchParams(params);
          if (newActiveId) {
            newParams.set('collab', newActiveId);
          } else {
            newParams.delete('collab');
          }
          return newParams;
        }, { replace: true });
      }
      
      return { tabs: newTabs, activeId: newActiveId };
    });
  }, [setTabsState, setSearchParams]);

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

        {/* Barre de pills salariés */}
        <SalariesPillTabs
          collaborators={collaborators}
          activeCollaboratorId={activeCollaboratorId}
          onSelectCollaborator={handleSelectCollaborator}
          openTabs={tabsState.tabs}
          onCloseTab={handleCloseTab}
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
          
          {/* Panneaux collaborateurs (restent montés pour préserver l'état) */}
          {tabsState.tabs.map(collabId => (
            <div
              key={collabId}
              className={cn(
                "h-full overflow-auto",
                activeCollaboratorId === collabId ? "block" : "hidden"
              )}
            >
              <RHCollaboratorPanel collaboratorId={collabId} />
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
