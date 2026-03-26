/**
 * FinancierTab — Premium financial cockpit for the Stats Hub
 * Cash / Recouvrement / Encours / Risk management
 */

import { useState } from 'react';
import { useFinancialStats } from '@/apogee-connect/hooks/useFinancialStats';
import { FinancialHeroCards } from './financier/FinancialHeroCards';
import { FinancialChartsSection } from './financier/FinancialChartsSection';
import { FinancialEntityTable } from './financier/FinancialEntityTable';
import { FinancialDetailsSheet } from './financier/FinancialDetailsSheet';
import { FinancialAlertsPanel } from './financier/FinancialAlertsPanel';
import type { FinancialEntityStats } from '@/apogee-connect/types/financial';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function FinancierTab() {
  const { data: analysis, isLoading, isError } = useFinancialStats();
  const [selectedEntity, setSelectedEntity] = useState<FinancialEntityStats | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertTriangle className="h-10 w-10" />
        <p className="text-sm font-medium">Erreur lors du chargement des données financières</p>
        <p className="text-xs">Vérifiez la connexion à l'API Apogée</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* A. Hero KPIs */}
      <section>
        <FinancialHeroCards kpis={analysis?.kpis ?? null} isLoading={isLoading} />
      </section>

      {/* E. Alerts (above charts for urgency) */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> Alertes & actions
        </h3>
        <FinancialAlertsPanel alerts={analysis?.alerts ?? []} isLoading={isLoading} />
      </section>

      {/* B. Charts */}
      <section>
        <FinancialChartsSection analysis={analysis ?? null} isLoading={isLoading} />
      </section>

      {/* C. Table */}
      <section>
        <FinancialEntityTable
          byApporteur={analysis?.byApporteur ?? []}
          byClient={analysis?.byClient ?? []}
          isLoading={isLoading}
          onEntityClick={setSelectedEntity}
        />
      </section>

      {/* D. Drill-down */}
      <FinancialDetailsSheet
        entity={selectedEntity}
        open={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />

      {/* Data quality footer */}
      {analysis?.dataQuality && analysis.dataQuality.totalFacturesExclues > 0 && (
        <p className="text-[11px] text-muted-foreground/60 text-center">
          ⚠ {analysis.dataQuality.totalFacturesExclues} facture{analysis.dataQuality.totalFacturesExclues > 1 ? 's' : ''} exclue{analysis.dataQuality.totalFacturesExclues > 1 ? 's' : ''} (données incomplètes) ·{' '}
          {analysis.dataQuality.totalFacturesAnalysees} factures analysées
        </p>
      )}
    </motion.div>
  );
}
