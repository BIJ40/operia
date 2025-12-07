/**
 * WidgetContent - Contenu dynamique des widgets selon leur type
 * Widgets actifs: Derniers tickets, Mon équipe, Indicateurs globaux, CA par univers
 */

import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { CollaboratorsListWidget } from './widgets/CollaboratorsListWidget';
import { RecentTicketsWidget } from './widgets/RecentTicketsWidget';
import { CAParUniversWidget } from './widgets/CAParUniversWidget';
import { IndicateursGlobauxWidget } from './widgets/IndicateursGlobauxWidget';

interface WidgetContentProps {
  widget: UserWidget & { template: WidgetTemplate };
}

// Mapping module_source → composant spécialisé (4 widgets actifs)
const WIDGET_COMPONENTS: Record<string, React.FC> = {
  'RH.collaborateurs': CollaboratorsListWidget,
  'RH.collaborators': CollaboratorsListWidget,
  'Support.recent_tickets': RecentTicketsWidget,
  'StatIA.ca_par_univers': CAParUniversWidget,
  'StatIA.indicateurs_globaux': IndicateursGlobauxWidget,
};

export function WidgetContent({ widget }: WidgetContentProps) {
  const { module_source } = widget.template;

  const WidgetComponent = WIDGET_COMPONENTS[module_source];
  if (WidgetComponent) {
    return <WidgetComponent />;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
      Widget en développement...
    </div>
  );
}
