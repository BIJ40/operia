/**
 * WidgetContent - Contenu dynamique des widgets selon leur type
 * Connecté aux vraies données StatIA, RH, Support
 */

import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { StatiaKPIWidget } from './widgets/StatiaKPIWidget';
import { CollaboratorsListWidget } from './widgets/CollaboratorsListWidget';
import { HelpAcademyWidget } from './widgets/HelpAcademyWidget';

interface WidgetContentProps {
  widget: UserWidget & { template: WidgetTemplate };
}

// Mapping module_source → metricId pour StatIA
const STATIA_METRIC_MAP: Record<string, string> = {
  'StatIA.ca_global_ht': 'ca_global_ht',
  'StatIA.taux_sav_global': 'taux_sav_global',
  'StatIA.nb_dossiers_crees': 'nb_dossiers_crees',
  'StatIA.ca_moyen_par_jour': 'ca_moyen_par_jour',
  'StatIA.ca_moyen_par_tech': 'ca_moyen_par_tech',
  'StatIA.nb_interventions': 'nb_interventions',
  'StatIA.panier_moyen': 'panier_moyen',
  'StatIA.delai_premier_devis': 'delai_premier_devis',
};

export function WidgetContent({ widget }: WidgetContentProps) {
  const { type, module_source } = widget.template;

  // Widgets spéciaux
  if (module_source === 'RH.collaborateurs') {
    return <CollaboratorsListWidget />;
  }
  
  if (module_source === 'HelpAcademy.accueil') {
    return <HelpAcademyWidget />;
  }

  // Widgets KPI StatIA
  if (type === 'kpi' && STATIA_METRIC_MAP[module_source]) {
    return <StatiaKPIWidget metricId={STATIA_METRIC_MAP[module_source]} />;
  }

  // Fallback pour les types non implémentés
  return <PlaceholderWidget moduleSource={module_source} />;
}

function PlaceholderWidget({ moduleSource }: { moduleSource: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
      {moduleSource || 'Widget en développement...'}
    </div>
  );
}
