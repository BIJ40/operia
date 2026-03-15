/**
 * Bandeau exécutif — 5 KPI cards
 * Zero logique métier, affichage uniquement
 */

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Euro, Activity, AlertTriangle, ShieldCheck, CalendarClock } from 'lucide-react';
import { CAPlanifieCard } from '../CAPlanifieCard';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

interface Props {
  caPipelineTotal: number;
  chargeCouverte: number; // 0-1 ratio
  dossiersARisque: number;
  forecastReliabilityScore: number;
  rawData?: {
    projects: any[];
    interventions: any[];
    devis: any[];
    factures: any[];
  };
}

export function PrevisionnelExecutive({
  caPipelineTotal,
  chargeCouverte,
  dossiersARisque,
  forecastReliabilityScore,
  rawData,
}: Props) {
  const chargePercent = Math.round(chargeCouverte * 100);
  const reliabilityColor =
    forecastReliabilityScore >= 70
      ? 'text-green-600'
      : forecastReliabilityScore >= 40
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* CA Pipeline */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">CA Pipeline</p>
            <Euro className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-1">{formatCurrency(caPipelineTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Devis en pipeline</p>
        </Card>
      </motion.div>

      {/* Charge couverte */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 border-l-4 border-l-accent">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Charge couverte</p>
            <Activity className="h-4 w-4 text-accent-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{chargePercent}%</p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                chargePercent > 90
                  ? 'bg-red-500'
                  : chargePercent > 70
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, chargePercent)}%` }}
            />
          </div>
        </Card>
      </motion.div>

      {/* Dossiers à risque */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 border-l-4 border-l-destructive">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Dossiers à risque</p>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold mt-1">{dossiersARisque}</p>
          <p className="text-xs text-muted-foreground mt-1">Score risque &gt; 30</p>
        </Card>
      </motion.div>

      {/* Fiabilité prévisionnel */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 border-l-4 border-l-secondary">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Fiabilité prév.</p>
            <ShieldCheck className="h-4 w-4 text-secondary-foreground" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${reliabilityColor}`}>
            {forecastReliabilityScore}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Complétude données</p>
        </Card>
      </motion.div>

      {/* CA Planifié (existing component) */}
      {rawData && (
        <CAPlanifieCard
          projects={rawData.projects}
          interventions={rawData.interventions}
          devis={rawData.devis}
          factures={rawData.factures}
        />
      )}
    </div>
  );
}
