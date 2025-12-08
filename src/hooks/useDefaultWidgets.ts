/**
 * Hook pour gérer les widgets par défaut selon le rôle et les modules activés
 * Widgets actifs: Favoris (tous), Derniers tickets, Mon équipe, Indicateurs globaux, CA par univers
 */

import { useAuth } from '@/contexts/AuthContext';
import { useAddWidget, useUserWidgets } from './useDashboard';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GLOBAL_ROLES } from '@/types/globalRoles';

interface DefaultWidgetConfig {
  templateModuleSource: string;
  row: number;
  col: number;
  forAll?: boolean; // Widget disponible pour tous les utilisateurs
}

// Widget Favoris par défaut pour TOUS les utilisateurs
const UNIVERSAL_WIDGETS: DefaultWidgetConfig[] = [
  { templateModuleSource: 'Core.favoris', row: 0, col: 0, forAll: true },
];

// Widgets par défaut pour N2+ avec pilotage_agence
const PILOTAGE_WIDGETS: DefaultWidgetConfig[] = [
  { templateModuleSource: 'StatIA.indicateurs_globaux', row: 0, col: 4 },
  { templateModuleSource: 'RH.collaborators', row: 0, col: 8 },
  { templateModuleSource: 'Support.recent_tickets', row: 1, col: 0 },
  { templateModuleSource: 'StatIA.ca_par_univers', row: 1, col: 6 },
];

export function useDefaultWidgets() {
  const { user, globalRole, hasModule } = useAuth();
  const { data: userWidgets, isLoading } = useUserWidgets();
  const addWidget = useAddWidget();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user || isLoading || hasInitialized.current) return;
    
    // Si l'utilisateur a déjà des widgets, ne pas ajouter les defaults
    if (userWidgets && userWidgets.length > 0) {
      hasInitialized.current = true;
      return;
    }

    const initializeDefaultWidgets = async () => {
      hasInitialized.current = true;
      
      const userLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
      const hasPilotageAgence = hasModule('pilotage_agence');
      
      // Construire la liste des widgets à ajouter
      let widgetsToAdd = [...UNIVERSAL_WIDGETS];
      
      // Ajouter les widgets pilotage pour N2+ avec le module
      if (userLevel >= 2 && hasPilotageAgence) {
        widgetsToAdd = [...widgetsToAdd, ...PILOTAGE_WIDGETS];
      }
      
      // Récupérer les templates
      const moduleSources = widgetsToAdd.map(w => w.templateModuleSource);
      const { data: templates } = await supabase
        .from('widget_templates')
        .select('id, module_source, default_width, default_height')
        .in('module_source', moduleSources);
      
      if (!templates || templates.length === 0) return;
      
      // Créer les widgets
      for (const config of widgetsToAdd) {
        const template = templates.find(t => t.module_source === config.templateModuleSource);
        if (!template) continue;
        
        try {
          await addWidget.mutateAsync({
            templateId: template.id,
            position: { x: config.col, y: config.row },
          });
        } catch (error) {
          console.error(`Failed to add widget ${config.templateModuleSource}:`, error);
        }
      }
    };

    initializeDefaultWidgets();
  }, [user, isLoading, userWidgets, globalRole, addWidget, hasModule]);
}
