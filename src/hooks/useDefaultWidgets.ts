/**
 * Hook pour gérer les widgets par défaut selon le rôle et les modules activés
 */

import { useAuth } from '@/contexts/AuthContext';
import { useAddWidget, useUserWidgets } from './useDashboard';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GLOBAL_ROLES } from '@/types/globalRoles';

// Configuration des widgets par défaut par rôle/contexte
interface DefaultWidgetConfig {
  templateModuleSource: string;
  row: number;
  col: number;
}

// N2+ avec pilotage_agence: KPIs agence (ligne 1), collaborateurs/demandes (ligne 2), guides/support/faq (ligne 3)
const PILOTAGE_AGENCE_WIDGETS: DefaultWidgetConfig[] = [
  // Ligne 1: 6 KPIs
  { templateModuleSource: 'StatIA.ca_global_ht', row: 0, col: 0 },
  { templateModuleSource: 'StatIA.ca_moyen_par_jour', row: 0, col: 2 },
  { templateModuleSource: 'StatIA.nb_dossiers_crees', row: 0, col: 4 },
  { templateModuleSource: 'StatIA.taux_sav_global', row: 0, col: 6 },
  { templateModuleSource: 'StatIA.ca_moyen_par_tech', row: 0, col: 8 },
  { templateModuleSource: 'StatIA.ca_par_technicien', row: 0, col: 10 },
  // Ligne 2: Équipe + Demandes
  { templateModuleSource: 'RH.collaborators', row: 1, col: 0 },
  { templateModuleSource: 'RH.mes_demandes', row: 1, col: 6 },
  // Ligne 3: Guides + Support + FAQ
  { templateModuleSource: 'HelpAcademy.guides', row: 2, col: 0 },
  { templateModuleSource: 'Support.widget', row: 2, col: 4 },
  { templateModuleSource: 'Support.faq', row: 2, col: 8 },
];

// N1 Technicien: Mes statistiques
const TECHNICIEN_WIDGETS: DefaultWidgetConfig[] = [
  { templateModuleSource: 'StatIA.mes_stats_technicien', row: 0, col: 0 },
];

// N1 Assistante: Mes devis/factures
const ASSISTANTE_WIDGETS: DefaultWidgetConfig[] = [
  { templateModuleSource: 'StatIA.mes_devis_factures', row: 0, col: 0 },
];

// RH coffre widget pour N1 ou N2 salarié manager
const COFFRE_RH_WIDGET: DefaultWidgetConfig = {
  templateModuleSource: 'RH.mon_coffre',
  row: 3,
  col: 0,
};

export function useDefaultWidgets() {
  const { user, globalRole, enabledModules, isSalariedManager, hasModule, hasModuleOption, roleAgence } = useAuth();
  const { data: userWidgets, isLoading } = useUserWidgets();
  const addWidget = useAddWidget();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Don't run if no user, still loading, or already initialized
    if (!user || isLoading || hasInitialized.current) return;
    
    // If user already has widgets, don't add defaults
    if (userWidgets && userWidgets.length > 0) {
      hasInitialized.current = true;
      return;
    }

    const initializeDefaultWidgets = async () => {
      hasInitialized.current = true;
      
      const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
      const widgetsToAdd: DefaultWidgetConfig[] = [];
      
      // Determine which widgets to add based on role and modules
      const hasPilotageAgence = hasModule('pilotage_agence');
      const hasRhModule = hasModule('rh');
      const hasRhCoffre = hasModuleOption('rh', 'coffre');
      
      // N2+ avec pilotage_agence
      if (userLevel >= 2 && hasPilotageAgence) {
        widgetsToAdd.push(...PILOTAGE_AGENCE_WIDGETS);
      }
      // N1 Technicien
      else if (userLevel === 1 && roleAgence === 'technicien') {
        widgetsToAdd.push(...TECHNICIEN_WIDGETS);
      }
      // N1 Assistante
      else if (userLevel === 1 && roleAgence === 'assistante') {
        widgetsToAdd.push(...ASSISTANTE_WIDGETS);
      }
      
      // Add coffre RH widget if applicable
      if (hasRhModule && (hasRhCoffre || (userLevel >= 2 && isSalariedManager))) {
        widgetsToAdd.push(COFFRE_RH_WIDGET);
      }
      
      if (widgetsToAdd.length === 0) return;
      
      // Fetch templates matching our module sources
      const moduleSources = widgetsToAdd.map(w => w.templateModuleSource);
      const { data: templates } = await supabase
        .from('widget_templates')
        .select('id, module_source, default_width, default_height')
        .in('module_source', moduleSources);
      
      if (!templates || templates.length === 0) return;
      
      // Create widgets for each template
      for (const config of widgetsToAdd) {
        const template = templates.find(t => t.module_source === config.templateModuleSource);
        if (!template) continue;
        
        try {
          await addWidget.mutateAsync({
            templateId: template.id,
            position: {
              x: config.col,
              y: config.row,
            },
          });
        } catch (error) {
          console.error(`Failed to add widget ${config.templateModuleSource}:`, error);
        }
      }
    };

    initializeDefaultWidgets();
  }, [user, isLoading, userWidgets, globalRole, enabledModules, isSalariedManager, roleAgence, addWidget, hasModule, hasModuleOption]);
}
