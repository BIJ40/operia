/**
 * ResultatTabContent — Full P&L orchestrator matching Excel "Compte de Résultats"
 */
import { useState, useEffect, useRef } from 'react';
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
import { useRoyaltyAutoValues } from '@/hooks/useRoyaltyAutoValues';
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

  // Royalty auto-calc: use StatIA CA or saved CA for computation
  const currentMonthCA = statiaValues.ca_total ?? (financialMonth?.ca_total ?? undefined);
  const { data: royaltyValues } = useRoyaltyAutoValues(year, month, currentMonthCA);

  const isLoading = monthLoading || chargesLoading || summaryLoading;

  // ── Auto-seed: when StatIA has data but no financial_month row exists, create it ──
  const autoSeededRef = useRef<string>('');
  useEffect(() => {
    const seedKey = `${year}-${month}`;
    if (autoSeededRef.current === seedKey) return; // already seeded this month
    if (monthLoading || statiaLoading) return; // still loading
    if (financialMonth) return; // row already exists
    if (!statiaValues.ca_total || statiaValues.ca_total === 0) return; // no StatIA data

    autoSeededRef.current = seedKey;
    const seedValues: Record<string, number> = {};
    const fieldsToSeed = [
      'ca_total', 'nb_factures', 'nb_interventions', 'heures_facturees',
    ] as const;
    for (const f of fieldsToSeed) {
      if (statiaValues[f] != null && statiaValues[f]! > 0) {
        seedValues[f] = statiaValues[f]!;
      }
    }
    if (Object.keys(seedValues).length > 0) {
      upsertMonth.mutateAsync(seedValues).catch(() => {
        // Reset so it can retry
        autoSeededRef.current = '';
      });
    }
  }, [monthLoading, statiaLoading, financialMonth, statiaValues, year, month, upsertMonth]);

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

  const hasStatiaData = !statiaLoading && statiaValues.ca_total != null && statiaValues.ca_total > 0;
  const hasNoData = !summary && !isLoading && !hasStatiaData;

  // ── Reset handler: delete monthly row + variable charges for this month ──
  const handleReset = async () => {
    if (!agencyId || isLocked) return;
    setResetting(true);
    try {
      // 1. Delete the monthly data row (manual fields only — auto data re-populates)
      if (financialMonth?.id) {
        await (supabase as any)
          .from('agency_financial_months')
          .delete()
          .eq('id', financialMonth.id);
      }
      // 2. Delete variable charges for this month (they are month-specific)
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const variableChargeIds = charges
        .filter(c => c.category === 'VARIABLE' && c.start_month === monthDate)
        .map(c => c.id);
      if (variableChargeIds.length > 0) {
        await (supabase as any)
          .from('agency_financial_charges')
          .delete()
          .in('id', variableChargeIds);
      }
      // 3. Invalidate all queries
      queryClient.invalidateQueries({ queryKey: ['financial-month', agencyId, year, month] });
      queryClient.invalidateQueries({ queryKey: ['financial-charges', agencyId, year, month] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', agencyId, year, month] });
      toast({ title: 'Données réinitialisées', description: 'Les saisies manuelles ont été supprimées. Les données automatiques sont conservées.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

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
      if (key === 'panier_moyen' || key === 'ca_par_heure') {
        autoValues[key] = val;
      } else {
        tryAutoFill(key, val);
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
          {!isLocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={resetting || isLoading}>
                  <RotateCcw className={`h-3 w-3 ${resetting ? 'animate-spin' : ''}`} />
                  Réinitialiser
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser les saisies ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera toutes les valeurs saisies manuellement pour ce mois 
                    (masse salariale, achats, charges variables…). 
                    Les données automatiques (CA, interventions, heures depuis StatIA et effectifs depuis RH) 
                    seront conservées et ré-affichées. Les charges fixes annuelles ne sont pas affectées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
      <KpiRow summary={summary} isLoading={summaryLoading} autoValues={autoValues} />

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
