/**
 * ResultatTabContent — Full P&L orchestrator matching Excel "Compte de Résultats"
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle, Keyboard, Calculator, Zap, Users, RotateCcw } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { CompletionIndicator } from './CompletionIndicator';
import { KpiRow } from './KpiRow';
import { PLSectionBlock } from './PLSectionBlock';
import { PL_SECTIONS } from '@/config/financialLineItems';
import { useFinancialMonth } from '@/hooks/useFinancialMonth';
import { useFinancialCharges } from '@/hooks/useFinancialCharges';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useCollaboratorCount } from '@/hooks/useCollaboratorCount';
import { useStatiaFinancialBridge } from '@/hooks/useStatiaFinancialBridge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export default function ResultatTabContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  const { isLocked, isLoading: monthLoading, upsertMonth, financialMonth } = useFinancialMonth(year, month);
  const { charges, completionScore, isLoading: chargesLoading, createCharge, updateChargeViaRpc } = useFinancialCharges(year, month);
  const { summary, isLoading: summaryLoading } = useFinancialSummary(year, month);
  const { counts: collabCounts } = useCollaboratorCount();
  const { statiaValues, isLoading: statiaLoading } = useStatiaFinancialBridge(year, month);

  const isLoading = monthLoading || chargesLoading || summaryLoading;

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const handleSaveMonthlyField = async (field: string, value: number) => {
    try {
      await upsertMonth.mutateAsync({ [field]: value });
      toast({ title: 'Donnée enregistrée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateCharge = async (values: { charge_type: string; category: 'FIXE' | 'VARIABLE'; amount: number }) => {
    try {
      await createCharge.mutateAsync(values);
      toast({ title: 'Charge enregistrée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpdateCharge = async (params: { charge_id: string; new_amount: number; new_start_month: string }) => {
    try {
      await updateChargeViaRpc.mutateAsync(params);
      toast({ title: 'Charge mise à jour' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const hasNoData = !summary && !isLoading;

  // Build auto-values map from StatIA + collaborators
  const autoValues: Record<string, number> = {};

  // Helper: only auto-fill if no manual value saved
  const tryAutoFill = (field: string, value: number | undefined) => {
    if (value == null || value === 0) return;
    const savedVal = financialMonth ? (financialMonth as any)[field] : null;
    if (!savedVal || savedVal === 0) {
      autoValues[field] = value;
    }
  };

  // Collaborator-based auto values
  tryAutoFill('nb_salaries', collabCounts.total || undefined);
  tryAutoFill('nb_heures_payees_productifs', collabCounts.heuresPayeesProductifs || undefined);
  tryAutoFill('nb_heures_payees_improductifs', collabCounts.heuresPayeesImproductifs || undefined);

  // StatIA auto values (activity + CA fields)
  const statiaFields: (keyof typeof statiaValues)[] = [
    'ca_total', 'nb_factures', 'nb_interventions', 'heures_facturees',
    'ca_plomberie', 'ca_electricite', 'ca_menuiserie', 'ca_serrurerie',
    'ca_vitrerie', 'ca_volets', 'ca_autres',
    'panier_moyen', 'ca_par_heure',
  ];
  for (const key of statiaFields) {
    const val = statiaValues[key];
    if (val != null && val > 0) {
      // Display-only fields (panier_moyen, ca_par_heure) always show
      if (key === 'panier_moyen' || key === 'ca_par_heure') {
        autoValues[key] = val;
      } else {
        // For storable fields, only auto-fill if no manual value
        const monthField = key; // keys match month_field names
        tryAutoFill(monthField, val);
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        <div className="flex items-center gap-3">
          {isLocked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Verrouillé
            </Badge>
          )}
          <div className="w-48">
            <CompletionIndicator score={completionScore} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-blue-500" /> Auto StatIA</span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> Auto RH</span>
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-amber-500" /> Saisie mensuelle</span>
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-green-500" /> Fixe annuel</span>
        <span className="flex items-center gap-1"><Keyboard className="h-3 w-3 text-orange-500" /> Variable mensuel</span>
        <span className="flex items-center gap-1"><Calculator className="h-3 w-3 text-muted-foreground" /> Calculé</span>
      </div>

      {/* Empty state */}
      {hasNoData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucune donnée pour ce mois. Saisissez les données d'activité, de masse salariale et de charges pour calculer votre résultat.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <KpiRow summary={summary} isLoading={summaryLoading} />

      {/* P&L Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left column: Activité, CA, Masse salariale, Achats/Marges */}
        <div className="space-y-3">
          {PL_SECTIONS.filter(s => ['activite', 'ca', 'masse_salariale', 'achats_marges'].includes(s.key)).map(section => (
            <PLSectionBlock
              key={section.key}
              section={section}
              summary={summary}
              charges={charges}
              isLocked={isLocked}
              isLoading={isLoading}
              onSaveMonthlyField={handleSaveMonthlyField}
              onCreateCharge={handleCreateCharge}
              onUpdateCharge={handleUpdateCharge}
              year={year}
              month={month}
              defaultCollapsed={section.key === 'ca'}
              autoValues={autoValues}
            />
          ))}
        </div>

        {/* Right column: Improductifs, Charges agence/locations/externes/autres, Résultat */}
        <div className="space-y-3">
          {PL_SECTIONS.filter(s => ['improductifs', 'charges_agence', 'locations', 'charges_externes', 'autres', 'resultat'].includes(s.key)).map(section => (
            <PLSectionBlock
              key={section.key}
              section={section}
              summary={summary}
              charges={charges}
              isLocked={isLocked}
              isLoading={isLoading}
              onSaveMonthlyField={handleSaveMonthlyField}
              onCreateCharge={handleCreateCharge}
              onUpdateCharge={handleUpdateCharge}
              year={year}
              month={month}
              defaultCollapsed={['charges_agence', 'locations', 'charges_externes', 'autres'].includes(section.key)}
              autoValues={autoValues}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
