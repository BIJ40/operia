/**
 * WidgetContent - Contenu dynamique des widgets selon leur type
 * Widgets actifs: Favoris, Derniers tickets, Mon équipe, Indicateurs globaux, CA par univers, Top 3 Techniciens, 
 * Raccourcis, KPIs Technicien, KPIs Assistante, Coffre RH, Taux SAV, CA Mensuel, CA Apporteurs, Panier Moyen, 
 * Recouvrement, Productivité Techniciens
 */

import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { CollaboratorsListWidget } from './widgets/CollaboratorsListWidget';
import { RecentTicketsWidget } from './widgets/RecentTicketsWidget';
import { CAParUniversWidget } from './widgets/CAParUniversWidget';
import { IndicateursGlobauxWidget } from './widgets/IndicateursGlobauxWidget';
import { Top3TechniciensWidget } from './widgets/Top3TechniciensWidget';
import { ShortcutWidget } from './widgets/ShortcutWidget';
import { FavorisWidget } from './widgets/FavorisWidget';
import { TechnicienKpisWidget } from './widgets/TechnicienKpisWidget';
import { AssistanteKpisWidget } from './widgets/AssistanteKpisWidget';
import { CoffreRHWidget } from './widgets/CoffreRHWidget';
import { TauxSavWidget } from './widgets/TauxSavWidget';
import { CAMensuelChartWidget } from './widgets/CAMensuelChartWidget';
import { CAApporteursWidget } from './widgets/CAApporteursWidget';
import { PanierMoyenWidget } from './widgets/PanierMoyenWidget';
import { RecouvrementWidget } from './widgets/RecouvrementWidget';
import { TechniciensProdWidget } from './widgets/TechniciensProdWidget';

interface WidgetContentProps {
  widget: UserWidget & { template: WidgetTemplate };
}

// Mapping module_source → composant spécialisé
const WIDGET_COMPONENTS: Record<string, React.FC> = {
  'Core.favoris': FavorisWidget,
  'RH.collaborateurs': CollaboratorsListWidget,
  'RH.collaborators': CollaboratorsListWidget,
  'Support.recent_tickets': RecentTicketsWidget,
  'StatIA.ca_par_univers': CAParUniversWidget,
  'StatIA.indicateurs_globaux': IndicateursGlobauxWidget,
  'StatIA.top3_techniciens': Top3TechniciensWidget,
  'StatIA.taux_sav': TauxSavWidget,
  'StatIA.ca_mensuel_chart': CAMensuelChartWidget,
  'StatIA.ca_par_apporteur': CAApporteursWidget,
  'StatIA.panier_moyen': PanierMoyenWidget,
  'StatIA.recouvrement': RecouvrementWidget,
  'StatIA.productivite_techs': TechniciensProdWidget,
  'Personal.technicien_kpis': TechnicienKpisWidget,
  'Personal.assistante_kpis': AssistanteKpisWidget,
  'Shortcut.coffre_rh': CoffreRHWidget,
};

export function WidgetContent({ widget }: WidgetContentProps) {
  // Handle case where template might be an array (from Supabase join)
  const template = Array.isArray(widget.template) ? widget.template[0] : widget.template;
  
  if (!template) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
        Template non trouvé
      </div>
    );
  }
  
  const { module_source, icon, name, default_params } = template;

  // Widget coffre RH avec icône spéciale
  if (module_source === 'Shortcut.coffre_rh') {
    return <CoffreRHWidget />;
  }

  // Gestion des autres widgets de type Shortcut
  if (module_source?.startsWith('Shortcut.')) {
    const params = default_params as { route?: string } | undefined;
    const route = params?.route || '/';
    return <ShortcutWidget route={route} icon={icon} name={name} />;
  }

  const WidgetComponent = module_source ? WIDGET_COMPONENTS[module_source] : null;
  if (WidgetComponent) {
    return <WidgetComponent />;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
      Widget en développement...
    </div>
  );
}
