/**
 * Page principale du module Suivi RH - Vue unifiée avec tableau complet
 * Accessible N2+ uniquement
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRHCollaborators, useRHTablePrefs, useUpdateRHTablePrefs } from '@/hooks/useRHSuivi';
import { RHUnifiedTable } from '@/components/rh/unified/RHUnifiedTable';
import { TAB_COLUMNS, RHTabId } from '@/components/rh/unified/RHUnifiedTableColumns';
import { CompetencesMatrixPrint } from '@/components/rh/CompetencesMatrixPrint';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePersistedTab } from '@/hooks/usePersistedState';

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
  const { data: collaborators = [], isLoading, refetch } = useRHCollaborators();
  const { data: tablePrefs } = useRHTablePrefs();
  const updatePrefs = useUpdateRHTablePrefs();
  
  const [showCompetencesMatrix, setShowCompetencesMatrix] = useState(false);

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
      />
      
      <CompetencesMatrixPrint
        open={showCompetencesMatrix}
        onOpenChange={setShowCompetencesMatrix}
      />
    </div>
  );
}
