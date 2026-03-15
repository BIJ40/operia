/**
 * PrevisionnelTab — Orchestrateur
 * Charge le hook, distribue les données aux sous-composants.
 * Zero logique métier.
 */

import { useMemo } from 'react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useChargeTravauxAVenir } from '@/statia/hooks/useChargeTravauxAVenir';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

import { PrevisionnelExecutive } from '../previsionnel/PrevisionnelExecutive';
import { PipelineSection } from '../previsionnel/PipelineSection';
import { ChargeSection } from '../previsionnel/ChargeSection';
import { ActionsSection } from '../previsionnel/ActionsSection';
import { RiskSection } from '../previsionnel/RiskSection';

import { Card, CardContent } from '@/components/ui/card';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PrevisionnelTab() {
  const { isAgencyReady } = useAgency();
  const { data, rawData, isLoading } = useChargeTravauxAVenir();

  // Charge couverte = heures tech / (nbTechs uniques * 35h * 4 semaines)
  const chargeCouverte = useMemo(() => {
    if (!data?.parTechnicien || data.parTechnicien.length === 0) return 0;
    const totalHeures = data.parTechnicien.reduce((s, t) => s + t.heuresPlanifiees, 0);
    const capacity = data.parTechnicien.length * 35 * 4;
    return capacity > 0 ? totalHeures / capacity : 0;
  }, [data?.parTechnicien]);

  const dossiersARisque = useMemo(() => {
    return data?.dossiersRisque?.filter((d) => d.riskScoreGlobal > 30).length ?? 0;
  }, [data?.dossiersRisque]);

  if (!isAgencyReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Bandeau exécutif */}
      <PrevisionnelExecutive
        caPipelineTotal={data.caPipelineTotal}
        chargeCouverte={chargeCouverte}
        dossiersARisque={dossiersARisque}
        forecastReliabilityScore={data.forecastReliabilityScore}
        rawData={rawData ? {
          projects: rawData.projects,
          interventions: rawData.interventions,
          devis: rawData.devis,
          factures: rawData.factures,
        } : undefined}
      />

      {/* Pipeline & vieillissement */}
      <PipelineSection
        parEtat={data.parEtat}
        pipelineAge={data.pipelineAge}
      />

      {/* Charge technicien & hebdomadaire */}
      <ChargeSection
        parTechnicien={data.parTechnicien}
        chargeParSemaine={data.chargeParSemaine}
      />

      {/* Tables actions */}
      <ActionsSection parProjet={data.parProjet} />

      {/* Dossiers à risque */}
      <RiskSection dossiersRisque={data.dossiersRisque} />

      {/* Debug */}
      {data.debug && (
        <motion.div variants={itemVariants}>
          <Card className="bg-muted/50">
            <CardContent className="py-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Debug: {data.debug.totalProjects} projets • {data.debug.projectsEligibleState} éligibles • {data.debug.projectsAvecRT} avec RT • {data.debug.rtBlocksCount} blocs RT
              </p>
              <p className="text-xs text-muted-foreground">
                Pipeline: {data.caPipelineTotal > 0 ? `${Math.round(data.caPipelineTotal)}€` : '0€'} CA • Fiabilité {data.forecastReliabilityScore}% • {dossiersARisque} risques
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
