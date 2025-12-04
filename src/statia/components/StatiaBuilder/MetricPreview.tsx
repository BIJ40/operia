/**
 * StatIA Builder - Prévisualisation avec sélecteurs de valeurs spécifiques
 * Permet de valider les données en comparant avec Apogée
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, AlertCircle, TrendingUp, Calendar, User, Building2, Layers, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { cn } from '@/lib/utils';
import { DimensionType } from './config';

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
    });
  }
  return months;
};

// Techniciens simulés (en prod, charger depuis API)
const MOCK_TECHNICIANS = [
  { id: '1', name: 'Jean Dupont' },
  { id: '2', name: 'Marie Martin' },
  { id: '3', name: 'Pierre Durand' },
  { id: '4', name: 'Sophie Bernard' },
];

// Univers simulés (en prod, charger depuis API)
const MOCK_UNIVERS = [
  { id: 'plomberie', name: 'Plomberie' },
  { id: 'electricite', name: 'Électricité' },
  { id: 'chauffage', name: 'Chauffage' },
  { id: 'climatisation', name: 'Climatisation' },
  { id: 'serrurerie', name: 'Serrurerie' },
];

// Apporteurs simulés (en prod, charger depuis API)
const MOCK_APPORTEURS = [
  { id: 'direct', name: 'Direct' },
  { id: 'axa', name: 'AXA Assurances' },
  { id: 'maif', name: 'MAIF' },
  { id: 'generali', name: 'Generali' },
];

export function MetricPreview({ definition, agencySlug, measureLabel }: MetricPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Valeurs sélectionnées pour chaque dimension
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedUnivers, setSelectedUnivers] = useState<string>('');
  const [selectedApporteur, setSelectedApporteur] = useState<string>('');

  const availableMonths = useMemo(() => getAvailableMonths(), []);

  // Vérifier quelles dimensions sont actives
  const hasDimension = (dim: DimensionType) => {
    return definition?.dimensions?.includes(dim);
  };

  const handleRunPreview = async () => {
    if (!definition?.measure) {
      setError('Aucune mesure sélectionnée');
      return;
    }

    // Vérifier que toutes les dimensions requises ont une valeur
    if (hasDimension('mois') && !selectedMonth) {
      setError('Sélectionnez un mois');
      return;
    }
    if (hasDimension('technicien') && !selectedTechnician) {
      setError('Sélectionnez un technicien');
      return;
    }
    if (hasDimension('univers') && !selectedUnivers) {
      setError('Sélectionnez un univers');
      return;
    }
    if (hasDimension('apporteur') && !selectedApporteur) {
      setError('Sélectionnez un apporteur');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      // TODO: Appeler l'API StatIA avec les filtres spécifiques
      // getMetricForAgency(agencySlug, definition.measure, { 
      //   month: selectedMonth, 
      //   technicianId: selectedTechnician,
      //   univers: selectedUnivers,
      //   apporteur: selectedApporteur
      // })
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Valeur simulée pour la démo
      const simulatedValue = definition.measure.includes('taux') 
        ? Math.random() * 10 + 2 
        : Math.random() * 50000 + 10000;
      
      setPreviewResult(simulatedValue);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul');
    } finally {
      setIsRunning(false);
    }
  };

  const formatValue = (value: number) => {
    if (definition?.measure?.includes('taux')) {
      return `${value.toFixed(2)} %`;
    }
    if (definition?.measure?.includes('heure') || definition?.measure?.includes('duree')) {
      return `${value.toFixed(1)} h`;
    }
    if (definition?.measure?.includes('nb_') || definition?.measure?.includes('dossiers')) {
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
      const tech = MOCK_TECHNICIANS.find(t => t.id === selectedTechnician);
      parts.push(tech?.name || selectedTechnician);
    }
    
    if (hasDimension('univers') && selectedUnivers) {
      const uni = MOCK_UNIVERS.find(u => u.id === selectedUnivers);
      parts.push(uni?.name || selectedUnivers);
    }
    
    if (hasDimension('apporteur') && selectedApporteur) {
      const app = MOCK_APPORTEURS.find(a => a.id === selectedApporteur);
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
          <Badge variant="outline" className="text-xs">
            {agencySlug}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélecteurs de dimension */}
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

              {/* Sélecteur Technicien */}
              {hasDimension('technicien') && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Choisir un technicien" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_TECHNICIANS.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur Univers */}
              {hasDimension('univers') && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedUnivers} onValueChange={setSelectedUnivers}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Choisir un univers" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_UNIVERS.map(uni => (
                        <SelectItem key={uni.id} value={uni.id}>
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur Apporteur */}
              {hasDimension('apporteur') && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedApporteur} onValueChange={setSelectedApporteur}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Choisir un apporteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_APPORTEURS.map(app => (
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
              <span className="text-sm text-muted-foreground">Calcul en cours...</span>
            </div>
          ) : previewResult !== null ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold">{formatValue(previewResult)}</div>
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
                ? hasDimensions 
                  ? 'Sélectionnez les valeurs puis cliquez sur Exécuter'
                  : 'Cliquez sur Exécuter pour voir le résultat'
                : 'Sélectionnez une mesure pour prévisualiser'
              }
            </div>
          )}
        </div>

        {/* Bouton exécuter */}
        <Button 
          className="w-full" 
          onClick={handleRunPreview}
          disabled={!definition?.measure || isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Exécuter
            </>
          )}
        </Button>

        {/* Lien pour vérifier sur Apogée */}
        {previewResult !== null && (
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs" asChild>
              <a 
                href={`https://${agencySlug}.hc-apogee.fr`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Vérifier sur Apogée ({agencySlug})
              </a>
            </Button>
          </div>
        )}

        {/* Détails de la définition */}
        {definition?.measure && (
          <div className="pt-2 border-t space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Configuration</div>
            <div className="text-xs space-y-1">
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
