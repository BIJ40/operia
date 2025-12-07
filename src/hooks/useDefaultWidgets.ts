/**
 * Hook pour gérer les widgets par défaut selon le rôle et les modules activés
 * Widgets actifs: Derniers tickets, Mon équipe, Indicateurs globaux, CA par univers
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
}

// Widgets par défaut pour N2+ avec pilotage_agence
const DEFAULT_WIDGETS: DefaultWidgetConfig[] = [
  // Ligne 1: Indicateurs globaux (pleine largeur)
  { templateModuleSource: 'StatIA.indicateurs_globaux', row: 0, col: 0 },
  // Ligne 2: CA par univers + Derniers tickets
  { templateModuleSource: 'StatIA.ca_par_univers', row: 1, col: 0 },
  { templateModuleSource: 'Support.recent_tickets', row: 1, col: 6 },
  // Ligne 3: Mon équipe
  { templateModuleSource: 'RH.collaborators', row: 2, col: 0 },
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
      
      // Seuls N2+ avec pilotage_agence ont les widgets par défaut
      if (userLevel < 2 || !hasPilotageAgence) return;
      
      // Récupérer les templates
      const moduleSources = DEFAULT_WIDGETS.map(w => w.templateModuleSource);
      const { data: templates } = await supabase
        .from('widget_templates')
        .select('id, module_source, default_width, default_height')
        .in('module_source', moduleSources);
      
      if (!templates || templates.length === 0) return;
      
      // Créer les widgets
      for (const config of DEFAULT_WIDGETS) {
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
