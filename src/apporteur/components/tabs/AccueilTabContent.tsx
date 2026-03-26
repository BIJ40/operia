/**
 * AccueilTabContent — Cockpit Dashboard V2
 * Consomme useApporteurKpis pour afficher KPIs, collaboration, univers, alertes
 */

import { useState } from 'react';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertTriangle, Euro, ShoppingCart, TrendingUp, FolderOpen, FileText, Receipt, Clock, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ApporteurPlanningCard } from '../ApporteurPlanningCard';
import { NouvelleDemandeDialog } from '../NouvelleDemandeDialog';
import { useApporteurKpis } from '../../hooks/useApporteurKpis';
import { KpiCard } from '../cockpit/KpiCard';
import { KpiDetailDialog, type KpiDetailType } from '../cockpit/KpiDetailDialog';
import { CollaborationGauge } from '../cockpit/CollaborationGauge';
import { UniversDonut } from '../cockpit/UniversDonut';
import { AlertesBanner } from '../cockpit/AlertesBanner';
import { PeriodSelector } from '../cockpit/PeriodSelector';
import { formatCurrency } from '@/lib/formatters';
import type { ApporteurStatsV2Request } from '../../types/apporteur-stats-v2';

export default function AccueilTabContent() {
  const { apporteurUser } = useApporteurAuth();
  const { session } = useApporteurSession();
  const [demandeOpen, setDemandeOpen] = useState(false);
  const [kpiDetail, setKpiDetail] = useState<KpiDetailType | null>(null);
  const [period, setPeriod] = useState<ApporteurStatsV2Request['period']>('month');

  const displayFirstName = session?.firstName || apporteurUser?.firstName || apporteurUser?.apporteurName || 'Partenaire';
  const displayApporteurName = session?.apporteurName || apporteurUser?.apporteurName || 'Votre espace';
  
  // Agency name & city from session
  const agencyName = session?.agencyName || '';
  const agencyCity = session?.agencyCity || '';
  const agencySubtitle = [agencyName, agencyCity].filter(Boolean).join(' — ') || displayApporteurName;

  const { data, isLoading, error } = useApporteurKpis({ period });
  const stats = data?.data;
  const kpis = stats?.kpis;
  const trends = stats?.trends;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenue, {displayFirstName}
          </h1>
          <p className="text-muted-foreground">
            {agencySubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setDemandeOpen(true)} className="gap-2 rounded-xl">
            <PlusCircle className="w-4 h-4" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !stats?.kpis ? (
        <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))] rounded-2xl">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--ap-warning))]" />
              <p className="text-foreground">
                {data?.error || 'Erreur de chargement des statistiques.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Alertes — compact inline chips */}
          {stats.alertes && stats.alertes.length > 0 && (
            <AlertesBanner alertes={stats.alertes} />
          )}

          {/* Period selector — just above KPI tiles */}
          <PeriodSelector value={period} onChange={setPeriod} />

          {/* 8 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="CA Généré"
              value={formatCurrency(kpis!.ca_genere)}
              icon={Euro}
              iconBg="bg-[hsl(var(--ap-success-light))]"
              iconColor="text-[hsl(var(--ap-success))]"
              trend={trends?.ca_genere}
            />
            <KpiCard
              label="Panier moyen"
              value={formatCurrency(kpis!.panier_moyen)}
              icon={ShoppingCart}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              trend={trends?.panier_moyen}
            />
            <KpiCard
              label="Taux transfo"
              value={`${kpis!.taux_transformation.toFixed(1)}%`}
              icon={TrendingUp}
              iconBg="bg-accent"
              iconColor="text-accent-foreground"
              trend={trends?.taux_transformation}
            />
            <KpiCard
              label="Dossiers en cours"
              value={String(kpis!.dossiers_en_cours)}
              icon={FolderOpen}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              trend={trends?.dossiers_en_cours}
            />
            <KpiCard
              label="Devis envoyés"
              value={String(kpis!.devis_envoyes)}
              icon={FileText}
              iconBg="bg-secondary/10"
              iconColor="text-secondary"
              trend={trends?.devis_envoyes}
            />
            <KpiCard
              label="Factures en attente"
              value={formatCurrency(kpis!.factures_en_attente.amount)}
              icon={Receipt}
              iconBg="bg-[hsl(var(--ap-warning-light))]"
              iconColor="text-[hsl(var(--ap-warning))]"
              subtitle={`${kpis!.factures_en_attente.count} facture(s)`}
              trend={trends?.factures_en_attente}
            />
            <KpiCard
              label="Délai RDV"
              value={`${kpis!.avg_rdv_delay_days.toFixed(0)}j`}
              icon={Clock}
              iconBg="bg-[hsl(var(--ap-info-light))]"
              iconColor="text-[hsl(var(--ap-info))]"
              subtitle={kpis!.coverage_rdv_delay < 100 ? `${kpis!.coverage_rdv_delay.toFixed(0)}% couverture` : undefined}
              trend={trends?.avg_rdv_delay_days}
            />
            <KpiCard
              label="Délai validation devis"
              value={`${kpis!.avg_devis_validation_delay_days.toFixed(0)}j`}
              icon={Timer}
              iconBg="bg-accent"
              iconColor="text-accent-foreground"
              subtitle={kpis!.coverage_devis_validation_delay < 100 ? `${kpis!.coverage_devis_validation_delay.toFixed(0)}% couverture` : undefined}
              trend={trends?.avg_devis_validation_delay_days}
            />
          </div>

          {/* Collaboration + Univers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {stats.collaboration && (
              <CollaborationGauge data={stats.collaboration} />
            )}
            {stats.repartition_univers && stats.repartition_univers.length > 0 && (
              <UniversDonut data={stats.repartition_univers} />
            )}
          </div>
        </>
      )}

      {/* Planning Card */}
      <ApporteurPlanningCard />

      {/* Dialog */}
      <NouvelleDemandeDialog open={demandeOpen} onOpenChange={setDemandeOpen} />
    </div>
  );
}
