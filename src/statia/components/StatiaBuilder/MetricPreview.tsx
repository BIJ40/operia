/**
 * StatIA Builder - Prévisualisation avec données RÉELLES
 * Appelle l'API StatIA pour afficher les vraies valeurs
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, AlertCircle, TrendingUp, Calendar, User, Building2, Layers, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { cn } from '@/lib/utils';
import { DimensionType, getMeasureById } from './config';
import { getMetric } from '../../api/getMetric';
import { STAT_DEFINITIONS } from '../../definitions';
import { apogeeProxy } from '@/services/apogeeProxy';
import { useQuery } from '@tanstack/react-query';
import { MetricExplanation } from './MetricExplanation';

interface MetricPreviewProps {
  definition: CustomMetricDefinition | null;
  agencySlug: string;
  measureLabel?: string;
}

// Mois disponibles pour sélection (12 derniers mois)
const getAvailableMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: fr }),
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
  }
  return months;
};

export function MetricPreview({ definition, agencySlug, measureLabel }: MetricPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<number | Record<string, number> | null>(null);
  const [previewBreakdown, setPreviewBreakdown] = useState<Record<string, any> | null>(null);
  const [previewDateRange, setPreviewDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState<number>(0);
  
  // Valeurs sélectionnées pour chaque dimension
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedUnivers, setSelectedUnivers] = useState<string>('');
  const [selectedApporteur, setSelectedApporteur] = useState<string>('');

  const availableMonths = useMemo(() => getAvailableMonths(), []);
  
  // CRITICAL: Toujours utiliser agencySlug passé en prop EXPLICITEMENT
  // pour éviter les problèmes d'isolation des données (ex: admin sélectionne LE MANS mais voit DAX)
  // Reset les résultats quand l'agence change
  useEffect(() => {
    setPreviewResult(null);
    setPreviewBreakdown(null);
    setError(null);
  }, [agencySlug]);
  
  // Hook pour récupérer les données réelles des sélecteurs
  // Le queryKey DOIT inclure agencySlug pour forcer le refetch lors du changement
  const { data: apogeeData, isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ['apogee-preview-data', agencySlug, Date.now().toString().slice(0, -4)], // Force refresh every 10s
    queryFn: async () => {
      if (!agencySlug) {
        return null;
      }
      
      // CRITICAL: Appeler chaque endpoint INDIVIDUELLEMENT avec agencySlug EXPLICITE
      // pour éviter tout problème de cache ou de fallback
      const [users, clients, projects, interventions, factures, devis, creneaux] = await Promise.all([
        apogeeProxy.getUsers({ agencySlug, skipCache: true }),
        apogeeProxy.getClients({ agencySlug, skipCache: true }),
        apogeeProxy.getProjects({ agencySlug, skipCache: true }),
        apogeeProxy.getInterventions({ agencySlug, skipCache: true }),
        apogeeProxy.getFactures({ agencySlug, skipCache: true }),
        apogeeProxy.getDevis({ agencySlug, skipCache: true }),
        apogeeProxy.getInterventionsCreneaux({ agencySlug, skipCache: true }),
      ]);
      
      return { users, clients, projects, interventions, factures, devis, creneaux };
    },
    enabled: !!agencySlug,
    staleTime: 0, // Always stale - force refetch
    gcTime: 0, // No garbage collection delay
  });

  // Extraire les listes réelles depuis les données
  const technicians = useMemo(() => {
    if (!apogeeData?.users) return [];
    return apogeeData.users
      .filter((u: any) => u.isTechnicien || u.type === 'technicien' || 
        (u.type === 'utilisateur' && u.data?.universes?.length > 0))
      .filter((u: any) => u.is_on !== false && u.isActive !== false)
      .map((u: any) => ({
        id: String(u.id),
        name: `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.name || `Tech ${u.id}`,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [apogeeData?.users]);

  const univers = useMemo(() => {
    if (!apogeeData?.projects) return [];
    const universSet = new Set<string>();
    apogeeData.projects.forEach((p: any) => {
      const projectUniverses = p.data?.universes || p.universes || [];
      projectUniverses.forEach((u: string) => {
        if (u && u !== 'null') {
          // Normaliser l'ID pour correspondre aux clés du calcul StatIA
          universSet.add(u.toLowerCase().trim());
        }
      });
    });
    return Array.from(universSet)
      .map(u => ({ 
        id: u, // ID normalisé (minuscule)
        name: u.charAt(0).toUpperCase() + u.slice(1).replace(/_/g, ' ') 
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apogeeData?.projects]);

  const apporteurs = useMemo(() => {
    if (!apogeeData?.clients) return [];
    // Filtrer pour ne garder que les apporteurs (clients qui sont commanditaires)
    const apporteurIds = new Set<number>();
    apogeeData.projects?.forEach((p: any) => {
      const cmdId = p.data?.commanditaireId || p.commanditaireId;
      if (cmdId) apporteurIds.add(cmdId);
    });
    
    return apogeeData.clients
      .filter((c: any) => apporteurIds.has(c.id))
      .map((c: any) => ({
        id: String(c.id),
        name: c.nom || c.name || c.displayName || `Client ${c.id}`,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [apogeeData?.clients, apogeeData?.projects]);

  // Vérifier quelles dimensions sont actives
  const hasDimension = (dim: DimensionType) => {
    return definition?.dimensions?.includes(dim);
  };

  // Créer les services pour l'API StatIA (signatures alignées avec ApogeeDataServices)
  const createServices = () => {
    return {
      getFactures: async (_agencySlug: string, _dateRange: any) => apogeeData?.factures || [],
      getDevis: async (_agencySlug: string, _dateRange: any) => apogeeData?.devis || [],
      getInterventions: async (_agencySlug: string, _dateRange: any) => apogeeData?.interventions || [],
      getProjects: async (_agencySlug: string, _dateRange: any) => apogeeData?.projects || [],
      getUsers: async (_agencySlug: string) => apogeeData?.users || [],
      getClients: async (_agencySlug: string) => apogeeData?.clients || [],
    };
  };

  // Déterminer la bonne métrique StatIA en fonction de la mesure + dimensions
  const resolveMetricId = (measure: string, dimensions: string[]): string => {
    // Si dimension univers sélectionnée, utiliser ca_par_univers pour les métriques CA
    if (dimensions.includes('univers')) {
      if (measure === 'ca_mensuel' || measure === 'ca_global_ht' || measure === 'ca_par_mois') {
        return 'ca_par_univers';
      }
      if (measure === 'ca_par_technicien') {
        // Pour CA technicien + univers, utiliser ca_par_univers comme fallback
        return 'ca_par_univers';
      }
    }
    
    // Si dimension technicien sélectionnée
    if (dimensions.includes('technicien')) {
      if (measure === 'ca_mensuel' || measure === 'ca_global_ht' || measure === 'ca_par_mois') {
        return 'ca_par_technicien';
      }
    }
    
    // Si dimension apporteur sélectionnée
    if (dimensions.includes('apporteur')) {
      if (measure === 'ca_mensuel' || measure === 'ca_global_ht' || measure === 'ca_par_mois') {
        return 'ca_par_apporteur';
      }
    }
    
    // Sinon utiliser la mesure telle quelle
    return measure;
  };

  const handleRunPreview = async () => {
    if (!definition?.measure) {
      setError('Aucune mesure sélectionnée');
      return;
    }

    // Résoudre la métrique réelle à utiliser
    const effectiveMetricId = resolveMetricId(
      definition.measure, 
      definition.dimensions || []
    );

    // Vérifier que la métrique existe dans StatIA
    if (!STAT_DEFINITIONS[effectiveMetricId]) {
      setError(`Métrique "${effectiveMetricId}" non trouvée dans StatIA`);
      return;
    }

    // Vérifier que les données sont chargées
    if (!apogeeData || isLoadingData) {
      setError('Chargement des données en cours...');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      // Déterminer la période
      const monthData = availableMonths.find(m => m.value === selectedMonth);
      const dateRange = monthData 
        ? { start: monthData.start, end: monthData.end }
        : { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

      // Construire les filtres
      const filters: Record<string, any> = {};
      if (hasDimension('technicien') && selectedTechnician) {
        filters.technicienId = selectedTechnician;
      }
      if (hasDimension('univers') && selectedUnivers) {
        filters.univers = selectedUnivers;
      }
      if (hasDimension('apporteur') && selectedApporteur) {
        filters.apporteurId = selectedApporteur;
      }

      // Appeler l'API StatIA avec la métrique résolue
      const result = await getMetric(
        effectiveMetricId,
        {
          dateRange,
          agencySlug: agencySlug,
          filters,
        },
        createServices()
      );

      // Extraire la valeur selon le type de résultat
      let displayValue: number | Record<string, number> = 0;
      
      if (typeof result.value === 'number') {
        displayValue = result.value;
      } else if (typeof result.value === 'object') {
        // Normaliser les clés pour la correspondance (univers sont stockés en minuscules)
        const normalizeKey = (key: string) => key.toLowerCase().trim();
        const findValue = (key: string) => {
          const normalized = normalizeKey(key);
          // Chercher la clé exacte ou normalisée
          if (result.value[key] !== undefined) return result.value[key];
          if (result.value[normalized] !== undefined) return result.value[normalized];
          // Chercher parmi toutes les clés normalisées
          for (const k of Object.keys(result.value)) {
            if (normalizeKey(k) === normalized) return result.value[k];
          }
          return undefined;
        };
        
        // Si c'est un objet avec des ventilations, filtrer selon les dimensions sélectionnées
        if (hasDimension('technicien') && selectedTechnician) {
          const val = findValue(selectedTechnician);
          if (val !== undefined) displayValue = val;
          else displayValue = result.value;
        } else if (hasDimension('univers') && selectedUnivers) {
          const val = findValue(selectedUnivers);
          if (val !== undefined) displayValue = val;
          else displayValue = result.value;
        } else if (hasDimension('apporteur') && selectedApporteur) {
          const val = findValue(selectedApporteur);
          if (val !== undefined) displayValue = val;
          else displayValue = result.value;
        } else if (hasDimension('mois') && selectedMonth && result.value[selectedMonth] !== undefined) {
          displayValue = result.value[selectedMonth];
        } else {
          // Retourner la valeur complète ou la somme
          displayValue = result.value;
        }
      }

      setPreviewResult(displayValue);
      setPreviewBreakdown(result.breakdown || null);
      setPreviewDateRange(dateRange);
      setRecordCount(result.metadata?.recordCount || 0);
    } catch (err: any) {
      console.error('StatIA Preview Error:', err);
      setError(err.message || 'Erreur lors du calcul');
    } finally {
      setIsRunning(false);
    }
  };

  const formatValue = (value: number | Record<string, number>) => {
    if (typeof value === 'object') {
      // Afficher un résumé pour les objets
      const keys = Object.keys(value);
      if (keys.length === 0) return '0';
      if (keys.length <= 3) {
        return keys.map(k => `${k}: ${formatSingleValue(value[k])}`).join('\n');
      }
      const total = Object.values(value).reduce((sum, v) => sum + (v || 0), 0);
      return formatSingleValue(total) + ` (${keys.length} entrées)`;
    }
    return formatSingleValue(value);
  };

  const formatSingleValue = (value: number) => {
    const measureConfig = definition?.measure ? getMeasureById(definition.measure) : null;
    const unit = measureConfig?.unit || '€';
    const measureId = definition?.measure || '';
    
    if (unit === '%' || measureId.includes('taux')) {
      return `${value.toFixed(2)} %`;
    }
    if (unit === 'h' || measureId.includes('heure') || measureId.includes('duree')) {
      return `${value.toFixed(1)} h`;
    }
    if (unit === 'jours' || measureId.includes('delai') || measureId.includes('jour')) {
      return `${Math.round(value)} jours`;
    }
    if (measureId.includes('nb_') || measureId.includes('dossiers') || measureId.includes('nombre') || measureId.includes('count')) {
      return Math.round(value).toString();
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Construire le libellé du contexte sélectionné
  const getContextLabel = () => {
    const parts = [];
    
    if (hasDimension('mois') && selectedMonth) {
      const monthData = availableMonths.find(m => m.value === selectedMonth);
      parts.push(monthData?.label || selectedMonth);
    }
    
    if (hasDimension('technicien') && selectedTechnician) {
      const tech = technicians.find((t: any) => t.id === selectedTechnician);
      parts.push(tech?.name || selectedTechnician);
    }
    
    if (hasDimension('univers') && selectedUnivers) {
      const uni = univers.find((u: any) => u.id === selectedUnivers);
      parts.push(uni?.name || selectedUnivers);
    }
    
    if (hasDimension('apporteur') && selectedApporteur) {
      const app = apporteurs.find((a: any) => a.id === selectedApporteur);
      parts.push(app?.name || selectedApporteur);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const contextLabel = getContextLabel();
  const hasDimensions = (definition?.dimensions?.length || 0) > 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prévisualisation
          </span>
          <div className="flex items-center gap-2">
            {isLoadingData && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Chargement...
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {agencySlug}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélecteurs de dimension - avec données RÉELLES */}
        {hasDimensions && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Sélectionnez les valeurs à vérifier
            </div>
            
            <div className="grid gap-2">
              {/* Sélecteur Mois */}
              {hasDimension('mois') && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Choisir un mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur Technicien - DONNÉES RÉELLES */}
              {hasDimension('technicien') && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder={isLoadingData ? "Chargement..." : `Choisir parmi ${technicians.length} techniciens`} />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech: any) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur Univers - DONNÉES RÉELLES */}
              {hasDimension('univers') && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedUnivers} onValueChange={setSelectedUnivers}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder={isLoadingData ? "Chargement..." : `Choisir parmi ${univers.length} univers`} />
                    </SelectTrigger>
                    <SelectContent>
                      {univers.map((uni: any) => (
                        <SelectItem key={uni.id} value={uni.id}>
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur Apporteur - DONNÉES RÉELLES */}
              {hasDimension('apporteur') && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedApporteur} onValueChange={setSelectedApporteur}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder={isLoadingData ? "Chargement..." : `Choisir parmi ${apporteurs.length} apporteurs`} />
                    </SelectTrigger>
                    <SelectContent>
                      {apporteurs.map((app: any) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Résultat ou placeholder */}
        <div className={cn(
          "p-6 rounded-lg border-2 text-center transition-colors",
          previewResult !== null 
            ? "bg-primary/5 border-primary/20" 
            : "bg-muted/30 border-dashed"
        )}>
          {isRunning ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Calcul StatIA en cours...</span>
            </div>
          ) : previewResult !== null ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold whitespace-pre-line">
                {formatValue(previewResult)}
              </div>
              <div className="text-xs text-muted-foreground">{measureLabel || definition?.measure}</div>
              {contextLabel && (
                <div className="text-xs text-primary font-medium pt-1 border-t border-dashed">
                  {contextLabel}
                </div>
              )}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {definition?.measure 
                ? isLoadingData
                  ? 'Chargement des données Apogée...'
                  : hasDimensions 
                    ? 'Sélectionnez les valeurs puis cliquez sur Exécuter'
                    : 'Cliquez sur Exécuter pour voir le résultat'
                : 'Sélectionnez une mesure pour prévisualiser'
              }
            </div>
          )}
        </div>

        {/* Explication contextuelle */}
        {previewResult !== null && previewDateRange && definition?.measure && (
          <MetricExplanation
            measureId={definition.measure}
            measureLabel={measureLabel || definition.measure}
            value={previewResult}
            breakdown={previewBreakdown || undefined}
            dateRange={previewDateRange}
            agencySlug={agencySlug}
            dimensions={{
              mois: hasDimension('mois') && selectedMonth ? availableMonths.find(m => m.value === selectedMonth)?.label : undefined,
              technicien: hasDimension('technicien') && selectedTechnician ? { 
                id: selectedTechnician, 
                name: technicians.find((t: any) => t.id === selectedTechnician)?.name || selectedTechnician 
              } : undefined,
              univers: hasDimension('univers') && selectedUnivers ? { 
                id: selectedUnivers, 
                name: univers.find((u: any) => u.id === selectedUnivers)?.name || selectedUnivers 
              } : undefined,
              apporteur: hasDimension('apporteur') && selectedApporteur ? { 
                id: selectedApporteur, 
                name: apporteurs.find((a: any) => a.id === selectedApporteur)?.name || selectedApporteur 
              } : undefined,
            }}
            recordCount={recordCount}
          />
        )}

        {/* Bouton exécuter */}
        <Button 
          className="w-full" 
          onClick={handleRunPreview}
          disabled={!definition?.measure || isRunning || isLoadingData}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul StatIA...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Exécuter (données réelles)
            </>
          )}
        </Button>


        {/* Détails de la définition */}
        {definition?.measure && (
          <div className="pt-2 border-t space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Configuration StatIA</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Métrique:</span>
                <span className="font-mono">{definition.measure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources:</span>
                <span>{definition.sources?.join(', ') || 'factures'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agrégation:</span>
                <span>{definition.aggregation || 'sum'}</span>
              </div>
              {definition.dimensions && definition.dimensions.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span>{definition.dimensions.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
