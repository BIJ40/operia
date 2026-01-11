/**
 * Page principale du module Suivi RH - Vue unifiée avec tableau complet
 * Accessible N2+ uniquement
 * Remplace l'ancienne page /equipe (fusionnée ici)
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
import { useUserManagement } from '@/hooks/use-user-management';
import { useAdminAgencies } from '@/hooks/use-admin-agencies';
import { CreateUserDialog } from '@/components/admin/users';
import { GlobalRole, getRoleLevel } from '@/types/globalRoles';
import { getUserManagementCapabilities } from '@/config/roleMatrix';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

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

export default function RHSuiviIndex() {
  const queryClient = useQueryClient();
  const { agencyId, agence, globalRole } = useAuth();
  
  // Toggle pour afficher les anciens collaborateurs (partis)
  const [showFormer, setShowFormer] = useState(false);
  
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators({ includeFormer: showFormer });
  const { data: tablePrefs } = useRHTablePrefs();
  const updatePrefs = useUpdateRHTablePrefs();
  const { data: epiSummaries = [] } = useCollaboratorsEpiSummary(agencyId || undefined);
  
  const [showCompetencesMatrix, setShowCompetencesMatrix] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Hook de gestion utilisateurs pour la création
  const { createUserMutation } = useUserManagement({ scope: 'ownAgency' });
  const { data: agencies = [] } = useAdminAgencies();

  // Calcul des rôles assignables
  const currentUserLevel = getRoleLevel(globalRole);
  const capabilities = getUserManagementCapabilities(globalRole);
  const assignableRoles = capabilities.canCreateRoles;

  // Handler de création qui invalide TOUTES les queries utilisateurs
  const handleCreate = async (data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    agence: string; 
    roleAgence: string;
    globalRole: GlobalRole; 
    sendEmail: boolean;
  }) => {
    await createUserMutation.mutateAsync(data, {
      onSuccess: () => {
        setShowCreateDialog(false);
        // Invalider toutes les queries utilisateurs pour synchro complète
        setTimeout(() => {
          ALL_USER_QUERY_PATTERNS.forEach(pattern => {
            queryClient.invalidateQueries({ queryKey: [pattern] });
          });
          queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
          queryClient.invalidateQueries({ queryKey: ['collaborators'] });
          refetch();
        }, 500);
      },
    });
  };

  // Onglet actif - persiste en sessionStorage via hook
  const [activeTab, setActiveTab] = usePersistedTab<RHTabId>('rh_suivi_active_tab', 'general');

  // Colonnes visibles - initialisées depuis les prefs utilisateur ou par défaut
  const [visibleColumnsByTab, setVisibleColumnsByTab] = useState<Record<RHTabId, string[]>>(DEFAULT_VISIBLE_COLUMNS);

  // Charger les préférences utilisateur
  useEffect(() => {
    if (tablePrefs?.hidden_columns) {
      // Les prefs stockent les colonnes masquées, on inverse la logique
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
      
      // Calculer les colonnes masquées pour la sauvegarde
      const allTabColumns = Object.keys(TAB_COLUMNS).flatMap(tab => 
        TAB_COLUMNS[tab as RHTabId].flatMap(g => g.columns.map(c => c.id))
      );
      const allVisible = Object.values(updated).flat();
      const hiddenColumns = allTabColumns.filter(col => !allVisible.includes(col));
      
      // Sauvegarder en BDD
      updatePrefs.mutate({ hidden_columns: hiddenColumns });
      
      return updated;
    });
  };

  const visibleColumns = visibleColumnsByTab[activeTab] || DEFAULT_VISIBLE_COLUMNS[activeTab];

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Suivi RH"
        subtitle="Vue complète de tous les collaborateurs et leurs informations"
        backTo="/rh"
        backLabel="Retour RH"
        rightElement={
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Nouveau collaborateur
          </Button>
        }
      />

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
      />
      
      <CompetencesMatrixPrint
        open={showCompetencesMatrix}
        onOpenChange={setShowCompetencesMatrix}
      />

      {/* Dialog de création utilisateur - synchro avec toutes les vues */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isPending={createUserMutation.isPending}
        assignableRoles={assignableRoles}
        agencies={agencies}
        currentUserLevel={currentUserLevel}
        currentUserAgency={agence}
        forceOwnAgency={true}
        agencyMode={true}
      />
    </div>
  );
}
