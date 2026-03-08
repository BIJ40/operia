/**
 * StatIA Validator - Page de validation des métriques
 * Compare les résultats Frontend StatIA vs Edge Function unified-search
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// Liste des 23 métriques à valider
const METRICS_TO_VALIDATE = [
  // CA
  { id: 'ca_global_ht', label: 'CA Global HT', category: 'CA', format: 'currency' },
  { id: 'ca_par_mois', label: 'CA par Mois', category: 'CA', format: 'object' },
  { id: 'ca_moyen_par_jour', label: 'CA Moyen/Jour', category: 'CA', format: 'currency' },
  { id: 'panier_moyen', label: 'Panier Moyen', category: 'CA', format: 'currency' },
  { id: 'du_client', label: 'Dû Client TTC', category: 'CA', format: 'currency' },
  
  // Univers
  { id: 'ca_par_univers', label: 'CA par Univers', category: 'Univers', format: 'object' },
  { id: 'rentabilite_par_univers', label: 'Rentabilité €/h par Univers', category: 'Univers', format: 'object' },
  { id: 'mix_ca_global_par_univers', label: 'Mix CA % par Univers', category: 'Univers', format: 'object' },
  
  // Apporteurs
  { id: 'ca_par_apporteur', label: 'CA par Apporteur', category: 'Apporteurs', format: 'object' },
  { id: 'nb_dossiers_par_apporteur', label: 'Nb Dossiers/Apporteur', category: 'Apporteurs', format: 'object' },
  
  // Techniciens
  { id: 'ca_par_technicien', label: 'CA par Technicien', category: 'Techniciens', format: 'object' },
  { id: 'nb_techniciens_actifs', label: 'Nb Techniciens Actifs', category: 'Techniciens', format: 'number' },
  { id: 'ca_moyen_par_technicien_actif', label: 'CA Moyen/Tech Actif', category: 'Techniciens', format: 'currency' },
  
  // SAV
  { id: 'taux_sav_global', label: 'Taux SAV Global', category: 'SAV', format: 'percent' },
  { id: 'nb_sav_global', label: 'Nb SAV', category: 'SAV', format: 'number' },
  { id: 'taux_sav_par_univers', label: 'Taux SAV/Univers', category: 'SAV', format: 'object' },
  { id: 'ca_impacte_sav', label: 'CA Impacté SAV', category: 'SAV', format: 'currency' },
  
  // Devis
  { id: 'taux_transformation_devis', label: 'Taux Transfo Devis', category: 'Devis', format: 'percent' },
  { id: 'nb_devis', label: 'Nb Devis', category: 'Devis', format: 'number' },
  
  // Dossiers
  { id: 'nb_dossiers_crees', label: 'Nb Dossiers Créés', category: 'Dossiers', format: 'number' },
  { id: 'nb_dossiers_factures', label: 'Nb Dossiers Facturés', category: 'Dossiers', format: 'number' },
  
  // Qualité
  { id: 'taux_one_shot', label: 'Taux One-Shot', category: 'Qualité', format: 'percent' },
  { id: 'delai_dossier_premier_devis', label: 'Délai 1er Devis', category: 'Qualité', format: 'days' },
  { id: 'ca_moyen_par_dossier', label: 'CA Moyen/Dossier', category: 'Qualité', format: 'currency' },
  
  // Interventions
  { id: 'nb_interventions_periode', label: 'Nb Interventions', category: 'Interventions', format: 'number' },
];

interface ValidationResult {
  metricId: string;
  frontendValue: any;
  edgeValue: any;
  frontendError?: string;
  edgeError?: string;
  match: 'exact' | 'close' | 'mismatch' | 'error' | 'pending';
  difference?: number;
}

// Periods options
const PERIODS = [
  { id: 'current_month', label: 'Mois en cours' },
  { id: 'last_month', label: 'Mois dernier' },
  { id: '2_months_ago', label: 'Il y a 2 mois' },
  { id: '3_months_ago', label: 'Il y a 3 mois' },
];

function getPeriodDates(periodId: string): { start: Date; end: Date } {
  const now = new Date();
  switch (periodId) {
    case 'last_month':
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case '2_months_ago':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) };
    case '3_months_ago':
      return { start: startOfMonth(subMonths(now, 3)), end: endOfMonth(subMonths(now, 3)) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function formatValue(value: any, formatType: string): string {
  if (value === null || value === undefined) return '–';
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) {
      return keys.map(k => `${k}: ${typeof value[k] === 'number' ? Math.round(value[k]) : value[k]}`).join(', ');
    }
    return `{${keys.length} entrées}`;
  }
  switch (formatType) {
    case 'currency':
      return `${Math.round(Number(value)).toLocaleString('fr-FR')} €`;
    case 'percent':
      return `${Number(value).toFixed(1)} %`;
    case 'days':
      return `${Number(value).toFixed(1)} j`;
    default:
      return String(value);
  }
}

function compareValues(frontend: any, edge: any, _formatType: string): { match: 'exact' | 'close' | 'mismatch'; difference?: number } {
  // Handle null/undefined
  if ((frontend === null || frontend === undefined) && (edge === null || edge === undefined)) {
    return { match: 'exact' };
  }
  if ((frontend === null || frontend === undefined) || (edge === null || edge === undefined)) {
    return { match: 'mismatch' };
  }
  
  // Object comparison (compare totals)
  if (typeof frontend === 'object' && typeof edge === 'object') {
    let frontendTotal = 0;
    for (const v of Object.values(frontend)) {
      if (typeof v === 'number') frontendTotal += v;
    }
    let edgeTotal = 0;
    for (const v of Object.values(edge)) {
      if (typeof v === 'number') edgeTotal += v;
    }
    const diff = Math.abs(frontendTotal - edgeTotal);
    const maxVal = Math.max(Math.abs(frontendTotal), Math.abs(edgeTotal), 1);
    const percentDiff = (diff / maxVal) * 100;
    
    if (percentDiff < 0.1) return { match: 'exact', difference: diff };
    if (percentDiff < 5) return { match: 'close', difference: diff };
    return { match: 'mismatch', difference: diff };
  }
  
  // Numeric comparison
  const frontendNum = Number(frontend);
  const edgeNum = Number(edge);
  
  if (isNaN(frontendNum) || isNaN(edgeNum)) {
    return { match: frontend === edge ? 'exact' : 'mismatch' };
  }
  
  const diff = Math.abs(frontendNum - edgeNum);
  const maxVal = Math.max(Math.abs(frontendNum), Math.abs(edgeNum), 1);
  const percentDiff = (diff / maxVal) * 100;
  
  if (percentDiff < 0.1) return { match: 'exact', difference: diff };
  if (percentDiff < 5) return { match: 'close', difference: diff };
  return { match: 'mismatch', difference: diff };
}

export default function StatiaValidatorPage() {
  const { agence } = useProfile();
  const agencySlug = agence || 'dax';
  
  const [selectedPeriod, setSelectedPeriod] = useState('last_month');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMetric, setCurrentMetric] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    
    const period = getPeriodDates(selectedPeriod);
    const newResults: ValidationResult[] = [];
    
    for (let i = 0; i < METRICS_TO_VALIDATE.length; i++) {
      const metric = METRICS_TO_VALIDATE[i];
      setCurrentMetric(metric.label);
      setProgress(((i + 1) / METRICS_TO_VALIDATE.length) * 100);
      
      let frontendValue: any = null;
      let frontendError: string | undefined;
      let edgeValue: any = null;
      let edgeError: string | undefined;
      
      // 1. Call Edge Function with forceMetric for FRONTEND simulation
      // (In a real scenario, you'd call the frontend StatIA engine directly)
      // For now, we call the edge function twice: once as "frontend" and once with different query
      try {
        const monthName = format(period.start, 'MMMM yyyy', { locale: fr });
        
        // First call: use forceMetric to get the metric directly (simulates frontend)
        const { data: frontendData, error: frontendErr } = await supabase.functions.invoke('unified-search', {
          body: { 
            query: `${metric.label} en ${monthName}`,
            skipCache: true,
            forceMetric: metric.id,
          }
        });
        
        if (frontendErr) throw frontendErr;
        
        if (frontendData?.type === 'stats' && frontendData?.result) {
          frontendValue = frontendData.result.value ?? frontendData.result;
        } else if (frontendData?.result?.value !== undefined) {
          frontendValue = frontendData.result.value;
        } else {
          frontendError = 'Pas de résultat stats';
        }
      } catch (e: any) {
        frontendError = e.message || 'Erreur Frontend';
      }
      
      // 2. Call Edge Function with natural language query (NLP routing)
      try {
        const queryMap: Record<string, string> = {
          'ca_global_ht': 'quel est le CA total',
          'ca_par_mois': 'CA par mois',
          'ca_moyen_par_jour': 'CA moyen par jour',
          'panier_moyen': 'panier moyen',
          'du_client': 'dû client',
          'ca_par_univers': 'CA par univers',
          'ca_par_apporteur': 'CA par apporteur',
          'nb_dossiers_par_apporteur': 'nombre de dossiers par apporteur',
          'ca_par_technicien': 'classe moi les techniciens',
          'nb_techniciens_actifs': 'nombre de techniciens actifs',
          'ca_moyen_par_technicien_actif': 'CA moyen par technicien',
          'taux_sav_global': 'taux de SAV',
          'nb_sav_global': 'nombre de SAV',
          'taux_sav_par_univers': 'taux SAV par univers',
          'ca_impacte_sav': 'CA impacté par SAV',
          'taux_transformation_devis': 'taux de transformation des devis',
          'nb_devis': 'nombre de devis',
          'nb_dossiers_crees': 'nombre de dossiers créés',
          'nb_dossiers_factures': 'nombre de dossiers facturés',
          'taux_one_shot': 'taux one shot',
          'delai_dossier_premier_devis': 'délai premier devis',
          'ca_moyen_par_dossier': 'CA moyen par dossier',
          'nb_interventions_periode': 'nombre interventions',
        };
        
        const monthName = format(period.start, 'MMMM yyyy', { locale: fr });
        const query = `${queryMap[metric.id] || metric.label} en ${monthName}`;
        
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { 
            query,
            skipCache: true,
            // NO forceMetric - let NLP route naturally
          }
        });
        
        if (error) throw error;
        
        // Extract value from edge response
        if (data?.type === 'stats' && data?.result) {
          edgeValue = data.result.value ?? data.result;
        } else if (data?.result?.value !== undefined) {
          edgeValue = data.result.value;
        } else {
          // Check if we got routed to wrong metric
          if (data?.metric && data.metric !== metric.id) {
            edgeError = `Routé vers ${data.metric} au lieu de ${metric.id}`;
          } else {
            edgeError = 'Pas de résultat stats';
          }
        }
      } catch (e: any) {
        edgeError = e.message || 'Erreur Edge Function';
      }
      
      // 3. Compare
      let match: ValidationResult['match'] = 'pending';
      let difference: number | undefined;
      
      if (frontendError || edgeError) {
        match = 'error';
      } else {
        const comparison = compareValues(frontendValue, edgeValue, metric.format);
        match = comparison.match;
        difference = comparison.difference;
      }
      
      newResults.push({
        metricId: metric.id,
        frontendValue,
        edgeValue,
        frontendError,
        edgeError,
        match,
        difference,
      });
      
      setResults([...newResults]);
    }
    
    setIsRunning(false);
    setCurrentMetric(null);
  }, [selectedPeriod, agencySlug]);

  const stats = {
    total: results.length,
    exact: results.filter(r => r.match === 'exact').length,
    close: results.filter(r => r.match === 'close').length,
    mismatch: results.filter(r => r.match === 'mismatch').length,
    error: results.filter(r => r.match === 'error').length,
  };

  const matchIcon = (match: ValidationResult['match']) => {
    switch (match) {
      case 'exact': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'close': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'mismatch': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">StatIA Validator</h1>
          <p className="text-muted-foreground">
            Compare forceMetric vs NLP routing ({agencySlug})
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={runValidation} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer ({METRICS_TO_VALIDATE.length} métriques)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validation en cours: {currentMetric}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-500">{stats.exact}</div>
              <div className="text-sm text-muted-foreground">Identiques</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-yellow-500">{stats.close}</div>
              <div className="text-sm text-muted-foreground">Proches (&lt;5%)</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-500">{stats.mismatch}</div>
              <div className="text-sm text-muted-foreground">Écarts</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-destructive">{stats.error}</div>
              <div className="text-sm text-muted-foreground">Erreurs</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats détaillés</CardTitle>
            <CardDescription>
              Comparaison forceMetric (direct) vs NLP routing (langage naturel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Status</TableHead>
                  <TableHead>Métrique</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>forceMetric</TableHead>
                  <TableHead>NLP Routing</TableHead>
                  <TableHead>Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRICS_TO_VALIDATE.map((metric, idx) => {
                  const result = results[idx];
                  if (!result) return null;
                  
                  return (
                    <TableRow key={metric.id} className={result.match === 'mismatch' ? 'bg-red-500/5' : result.match === 'error' ? 'bg-destructive/5' : ''}>
                      <TableCell>{matchIcon(result.match)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{metric.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{metric.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{metric.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {result.frontendError ? (
                          <span className="text-destructive text-xs">{result.frontendError}</span>
                        ) : (
                          <span className="font-mono text-sm">
                            {formatValue(result.frontendValue, metric.format)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.edgeError ? (
                          <span className="text-destructive text-xs">{result.edgeError}</span>
                        ) : (
                          <span className="font-mono text-sm">
                            {formatValue(result.edgeValue, metric.format)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.difference !== undefined && (
                          <span className={`font-mono text-sm ${result.match === 'mismatch' ? 'text-red-500' : ''}`}>
                            {metric.format === 'currency' ? `${Math.round(result.difference).toLocaleString('fr-FR')} €` : 
                             metric.format === 'percent' ? `${result.difference.toFixed(1)} pts` :
                             Math.round(result.difference)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
