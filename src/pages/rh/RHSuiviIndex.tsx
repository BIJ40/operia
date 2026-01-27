/**
 * Page principale du module Suivi RH - Vue unifiée avec système d'onglets
 * Accessible N2+ uniquement
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRHCollaborators, useRHTablePrefs, useUpdateRHTablePrefs } from '@/hooks/useRHSuivi';
import { RHUnifiedTable } from '@/components/rh/unified/RHUnifiedTable';
import { TAB_COLUMNS, RHTabId } from '@/components/rh/unified/RHUnifiedTableColumns';
import { CompetencesMatrixPrint } from '@/components/rh/CompetencesMatrixPrint';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePersistedTab } from '@/hooks/usePersistedState';
import { useCollaboratorsEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';
import { useAuth } from '@/contexts/AuthContext';
import { CollaboratorWizard } from '@/components/collaborators';
import { useCollaborators } from '@/hooks/useCollaborators';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { CollaboratorFormData } from '@/types/collaborator';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

// Système d'onglets
import { RHTabsProvider, RHTabsBar, RHTabsContent, useRHTabs } from '@/components/rh/browser-tabs';
import { ApogeeSyncButton } from '@/components/rh/ApogeeSync';

// Colonnes visibles par défaut par onglet
const DEFAULT_VISIBLE_COLUMNS: Record<RHTabId, string[]> = {
  general: ['email', 'phone', 'emergency_contact', 'emergency_phone', 'social_security_number', 'permis', 'cni', 'notes', 'hiring_date', 'leaving_date'],
  infos_perso: ['birth_date', 'birth_place', 'street', 'postal_code', 'city'],
  securite: ['taille_haut', 'taille_bas', 'pointure', 'statut_epi', 'date_renouvellement'],
  competences: ['hab_elec_statut', 'hab_elec_date', 'caces_count'],
  parc: ['vehicule_attribue', 'carte_carburant', 'carte_bancaire', 'carte_autre', 'materiels_liste'],
  idmdp: ['identifiants_liste'],
  documents: ['docs_icons'],
};

function RHSuiviContent() {
  const queryClient = useQueryClient();
  const { agencyId, agence } = useAuth();
  
  // Toggle pour afficher les anciens collaborateurs (partis)
  const [showFormer, setShowFormer] = useState(false);
  
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators({ includeFormer: showFormer });
  const { data: tablePrefs } = useRHTablePrefs();
  const updatePrefs = useUpdateRHTablePrefs();
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
  
  // Ouvrir le wizard en mode édition
  const handleOpenEdit = (collaboratorId: string) => {
    setWizardMode('edit');
    setEditingCollaboratorId(collaboratorId);
    setShowWizard(true);
  };
  
  // Fermer le wizard
  const handleCloseWizard = (open: boolean) => {
    if (!open) {
      setShowWizard(false);
      setEditingCollaboratorId(null);
    }
  };

  // Onglet actif pour le tableau - persiste en sessionStorage via hook
  const [activeTab, setActiveTab] = usePersistedTab<RHTabId>('rh_suivi_table_tab', 'general');

  // Colonnes visibles - initialisées depuis les prefs utilisateur ou par défaut
  const [visibleColumnsByTab, setVisibleColumnsByTab] = useState<Record<RHTabId, string[]>>(DEFAULT_VISIBLE_COLUMNS);

  // Charger les préférences utilisateur
  useEffect(() => {
    if (tablePrefs?.hidden_columns) {
      const allColumns: Record<RHTabId, string[]> = { ...DEFAULT_VISIBLE_COLUMNS };
      
      Object.keys(TAB_COLUMNS).forEach((tab) => {
        const tabKey = tab as RHTabId;
        const tabColumns = TAB_COLUMNS[tabKey].flatMap(g => g.columns.map(c => c.id));
        const hidden = tablePrefs.hidden_columns || [];
        allColumns[tabKey] = tabColumns.filter(col => !hidden.includes(col));
      });
      
      setVisibleColumnsByTab(allColumns);
    }
  }, [tablePrefs]);

  // Toggle une colonne
  const handleToggleColumn = (columnId: string) => {
    setVisibleColumnsByTab(prev => {
      const currentVisible = prev[activeTab] || [];
      const newVisible = currentVisible.includes(columnId)
        ? currentVisible.filter(id => id !== columnId)
        : [...currentVisible, columnId];
      
      const updated = { ...prev, [activeTab]: newVisible };
      
      const allTabColumns = Object.keys(TAB_COLUMNS).flatMap(tab => 
        TAB_COLUMNS[tab as RHTabId].flatMap(g => g.columns.map(c => c.id))
      );
      const allVisible = Object.values(updated).flat();
      const hiddenColumns = allTabColumns.filter(col => !allVisible.includes(col));
      
      updatePrefs.mutate({ hidden_columns: hiddenColumns });
      
      return updated;
    });
  };

  const visibleColumns = visibleColumnsByTab[activeTab] || DEFAULT_VISIBLE_COLUMNS[activeTab];

  // Contenu de l'onglet "Vue d'ensemble"
  const overviewContent = (
    <RHUnifiedTable
      collaborators={collaborators}
      isLoading={isLoading}
      visibleColumns={visibleColumns}
      onToggleColumn={handleToggleColumn}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={refetch}
      onPrintMatrix={() => setShowCompetencesMatrix(true)}
      epiSummaries={epiSummaries}
      showFormer={showFormer}
      onToggleShowFormer={() => setShowFormer(!showFormer)}
      onEditCollaborator={handleOpenEdit}
    />
  );

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <PageHeader
        title="Suivi RH"
        subtitle="Vue complète de tous les collaborateurs et leurs informations"
        backTo="/rh"
        backLabel="Retour RH"
        rightElement={
          <div className="flex items-center gap-2">
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

      {/* Barre d'onglets */}
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
