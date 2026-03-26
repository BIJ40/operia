/**
 * FinancierTab — Premium financial cockpit for the Stats Hub
 * V2: Center dialogs, clickable tiles, fiabilité panel, snapshot mode
 */

import { useState, useMemo, useCallback } from 'react';
import { useFinancialStats } from '@/apogee-connect/hooks/useFinancialStats';
import { FinancialHeroCards, KpiTileId } from '../financier/FinancialHeroCards';
import { FinancialChartsSection } from '../financier/FinancialChartsSection';
import { FinancialEntityTable } from '../financier/FinancialEntityTable';
import { FinancialDetailsSheet } from '../financier/FinancialDetailsSheet';
import { FinancialAlertsPanel } from '../financier/FinancialAlertsPanel';
import { FinancialFiabilitePanel } from '../financier/FinancialFiabilitePanel';
import { FinancialKpiDrillDialog } from '../financier/FinancialKpiDrillDialog';
import type { FinancialEntityStats } from '@/apogee-connect/types/financial';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function FinancierTab() {
  const { data: analysis, isLoading, isError } = useFinancialStats();
  const [selectedEntity, setSelectedEntity] = useState<FinancialEntityStats | null>(null);
  const [kpiDrillTile, setKpiDrillTile] = useState<KpiTileId | null>(null);

  // Build the current visible entity list for prev/next navigation
  const currentEntityList = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.byApporteur, ...analysis.byClient];
  }, [analysis]);

  const handleEntityNavigate = useCallback((entity: FinancialEntityStats) => {
    setSelectedEntity(entity);
  }, []);

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
      {/* A. Hero KPIs — clickable tiles */}
      <section>
        <FinancialHeroCards
          kpis={analysis?.kpis ?? null}
          fiabilite={analysis?.fiabilite ?? null}
          isLoading={isLoading}
          onTileClick={setKpiDrillTile}
        />
      </section>

      {/* Fiabilité + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertes & actions
          </h3>
          <FinancialAlertsPanel alerts={analysis?.alerts ?? []} isLoading={isLoading} />
        </div>
        {analysis?.fiabilite && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Fiabilité des données</h3>
            <FinancialFiabilitePanel fiabilite={analysis.fiabilite} />
          </div>
        )}
      </div>

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

      {/* D. Drill-down — center Dialog */}
      <FinancialDetailsSheet
        entity={selectedEntity}
        open={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        allEntities={currentEntityList}
        onNavigate={handleEntityNavigate}
      />

      {/* E. KPI tile drill-down */}
      <FinancialKpiDrillDialog
        tileId={kpiDrillTile}
        analysis={analysis ?? null}
        open={!!kpiDrillTile}
        onClose={() => setKpiDrillTile(null)}
      />

      {/* Data quality footer */}
      {analysis?.dataQuality && analysis.dataQuality.totalFacturesExclues > 0 && (
        <p className="text-[11px] text-muted-foreground/60 text-center">
          ⚠ {analysis.dataQuality.totalFacturesExclues} facture{analysis.dataQuality.totalFacturesExclues > 1 ? 's' : ''} exclue{analysis.dataQuality.totalFacturesExclues > 1 ? 's' : ''} (données incomplètes) ·{' '}
          {analysis.dataQuality.totalFacturesAnalysees} factures analysées · Fiabilité : {analysis.fiabilite.score}%
        </p>
      )}
    </motion.div>
  );
}
