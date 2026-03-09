/**
 * ApporteurDashboard - KPIs et vue d'ensemble pour l'apporteur
 */

import { useState, useMemo } from 'react';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { useApporteurSession } from '@/apporteur/contexts/ApporteurSessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, FolderOpen, Receipt, FileText, Euro, Loader2, AlertTriangle } from 'lucide-react';
import { ApporteurPlanningCard } from '../components/ApporteurPlanningCard';
import { NouvelleDemandeDialog } from '../components/NouvelleDemandeDialog';
import { useApporteurDossiers, formatCurrency } from '../hooks/useApporteurDossiers';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ApporteurDashboard() {
  const { apporteurUser } = useApporteurAuth();
  const { session } = useApporteurSession();
  const navigate = useNavigate();
  const [demandeOpen, setDemandeOpen] = useState(false);

  const displayFirstName = session?.firstName || apporteurUser?.firstName || apporteurUser?.apporteurName || 'Partenaire';
  const displayApporteurName = session?.apporteurName || apporteurUser?.apporteurName || 'Votre espace';
  
  const { data, isLoading, error } = useApporteurDossiers();
  const dossiers = data?.data?.dossiers || [];

  // Compute KPIs
  const kpis = useMemo(() => {
    const enCours = dossiers.filter(d => !['regle', 'clos', 'annule'].includes(d.status));
    const facturesNonReglees = dossiers.filter(d => d.factureId && d.restedu > 0);
    const devisEnvoyes = dossiers.filter(d => d.status === 'devis_envoye');

    return {
      enCours: {
        count: enCours.length,
      },
      facturesNonReglees: {
        count: facturesNonReglees.length,
        montant: facturesNonReglees.reduce((sum, d) => sum + d.restedu, 0),
      },
      devisEnvoyes: {
        count: devisEnvoyes.length,
        montant: devisEnvoyes.reduce((sum, d) => sum + d.devisHT, 0),
      },
    };
  }, [dossiers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenue, {displayFirstName}
          </h1>
          <p className="text-muted-foreground">
            {displayApporteurName} - Tableau de bord
          </p>
        </div>
        <Button onClick={() => setDemandeOpen(true)} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || data?.error === 'non_raccorde' ? (
        <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))]">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--ap-warning))]" />
              <p className="text-foreground">
                {data?.error === 'non_raccorde' 
                  ? 'Compte non raccordé à Apogée. Contactez l\'agence pour activer.'
                  : 'Erreur de chargement des données.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dossiers en cours */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/apporteur/dossiers')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dossiers en cours</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {kpis.enCours.count}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Cliquez pour voir le détail →
              </p>
            </CardContent>
          </Card>

          {/* Factures non réglées */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/apporteur/dossiers?status=attente_paiement')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Factures non réglées</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {kpis.facturesNonReglees.count}
                  </p>
                  <p className={cn(
                    "text-sm font-medium mt-1",
                    kpis.facturesNonReglees.montant > 0 ? "text-[hsl(var(--ap-danger))]" : "text-[hsl(var(--ap-success))]"
                  )}>
                    {formatCurrency(kpis.facturesNonReglees.montant)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--ap-danger-light))] flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-[hsl(var(--ap-danger))]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devis envoyés */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/apporteur/dossiers?status=devis_envoye')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Devis envoyés</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {kpis.devisEnvoyes.count}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    {formatCurrency(kpis.devisEnvoyes.montant)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Planning Card */}
      <ApporteurPlanningCard />

      {/* Dialog */}
      <NouvelleDemandeDialog open={demandeOpen} onOpenChange={setDemandeOpen} />
    </div>
  );
}
