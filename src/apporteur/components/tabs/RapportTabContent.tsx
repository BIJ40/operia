/**
 * RapportTabContent — Placeholder "Rapport d'activité"
 */

import { BarChart3 } from 'lucide-react';

export default function RapportTabContent() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
        <BarChart3 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Rapport d'activité</h2>
      <p className="text-muted-foreground max-w-md">
        Bientôt disponible — Visualisez vos statistiques mensuelles, taux de transformation, délais et répartition par univers.
      </p>
    </div>
  );
}
