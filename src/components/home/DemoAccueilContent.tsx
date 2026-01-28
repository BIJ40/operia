/**
 * DemoAccueilContent - Contenu de démonstration pour les utilisateurs N0
 * Affiche des KPIs mockés avec un bandeau explicatif
 */

import { Euro, TrendingUp, Users, FileText, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { WarmCard, WarmKpiCard } from '@/components/ui/warm-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatEuros } from '@/apogee-connect/utils/formatters';

// Données mockées pour la démo
const DEMO_DATA = {
  caTotal: 125000,
  tauxTransformation: 68.5,
  panierMoyen: 850,
  dossiersOuverts: 42,
  devisEmis: 28,
  interventionsMois: 156,
  techniciens: [
    { nom: 'Jean Dupont', ca: 32500 },
    { nom: 'Marie Martin', ca: 28700 },
    { nom: 'Pierre Bernard', ca: 24300 },
  ],
  actionsEnAttente: 12,
};

export function DemoAccueilContent() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Bandeau d'information */}
      <Alert className="bg-warning/10 border-warning/30">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning-foreground">
          <strong>Mode démonstration</strong> — Les données affichées ci-dessous sont des exemples. 
          Pour accéder à vos données réelles, contactez votre administrateur pour activer les modules nécessaires.
        </AlertDescription>
      </Alert>

      {/* Titre */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">
          Aperçu des indicateurs clés de performance
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <WarmKpiCard
          label="CA Total HT"
          value={formatEuros(DEMO_DATA.caTotal)}
          icon={Euro}
          accentColor="green"
        />
        <WarmKpiCard
          label="Taux transfo"
          value={`${DEMO_DATA.tauxTransformation}%`}
          icon={TrendingUp}
          accentColor="blue"
        />
        <WarmKpiCard
          label="Panier moyen"
          value={formatEuros(DEMO_DATA.panierMoyen)}
          icon={BarChart3}
          accentColor="purple"
        />
        <WarmKpiCard
          label="Dossiers ouverts"
          value={DEMO_DATA.dossiersOuverts}
          icon={FileText}
          accentColor="orange"
        />
        <WarmKpiCard
          label="Devis émis"
          value={DEMO_DATA.devisEmis}
          icon={FileText}
          accentColor="teal"
        />
      </div>

      {/* Grille de contenu */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Techniciens */}
        <WarmCard
          variant="accent"
          accentColor="blue"
          title="Top Techniciens"
          description="Classement par CA ce mois"
          icon={Users}
        >
          <div className="space-y-3">
            {DEMO_DATA.techniciens.map((tech, index) => (
              <div 
                key={tech.nom}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm">{tech.nom}</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {formatEuros(tech.ca)}
                </span>
              </div>
            ))}
          </div>
        </WarmCard>

        {/* Interventions */}
        <WarmCard
          variant="accent"
          accentColor="green"
          title="Activité du mois"
          description="Interventions réalisées"
          icon={Clock}
        >
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {DEMO_DATA.interventionsMois}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                interventions ce mois
              </div>
            </div>
          </div>
        </WarmCard>

        {/* Actions à mener */}
        <WarmCard
          variant="accent"
          accentColor="orange"
          title="Actions à mener"
          description="Tâches en attente"
          icon={AlertTriangle}
        >
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-destructive">
                {DEMO_DATA.actionsEnAttente}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                actions en attente
              </div>
            </div>
          </div>
        </WarmCard>
      </div>

      {/* Note de bas de page */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        Ces données sont fictives et servent uniquement à illustrer les fonctionnalités disponibles.
      </div>
    </div>
  );
}
