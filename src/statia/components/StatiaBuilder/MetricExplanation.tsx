/**
 * StatIA Builder - Explication contextuelle des métriques
 * Affiche le détail du calcul, la formule et les références vérifiables
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Receipt,
  Minus,
  Equal,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MetricExplanationProps {
  measureId: string;
  measureLabel: string;
  value: number | Record<string, number>;
  breakdown?: Record<string, any>;
  dateRange: { start: Date; end: Date };
  agencySlug: string;
  dimensions?: {
    mois?: string;
    technicien?: { id: string; name: string };
    univers?: { id: string; name: string };
    apporteur?: { id: string; name: string };
  };
  recordCount: number;
}

// Formules métier en français
const METRIC_FORMULAS: Record<string, { formula: string; explanation: string }> = {
  ca_global_ht: {
    formula: 'SUM(factures.totalHT) - SUM(avoirs.totalHT)',
    explanation: 'Somme HT de toutes les factures, moins les avoirs (traités comme montants négatifs)'
  },
  ca_par_mois: {
    formula: 'SUM(factures.totalHT) GROUP BY mois',
    explanation: 'Chiffre d\'affaires ventilé par mois de facturation'
  },
  ca_par_univers: {
    formula: 'SUM(factures.totalHT) WHERE project.universes CONTAINS univers',
    explanation: 'CA réparti au prorata des univers du projet (multi-univers = prorata)'
  },
  ca_par_technicien: {
    formula: 'SUM(factures.totalHT) × (temps_tech / temps_total)',
    explanation: 'CA réparti au prorata du temps productif de chaque technicien'
  },
  ca_par_apporteur: {
    formula: 'SUM(factures.totalHT) WHERE project.commanditaireId = apporteur',
    explanation: 'CA filtré par commanditaire/apporteur du dossier'
  },
  du_client: {
    formula: 'SUM(factures.calcReglementsReste)',
    explanation: 'Montant total restant à encaisser sur les factures émises'
  },
  panier_moyen: {
    formula: 'SUM(factures.totalHT) / COUNT(factures)',
    explanation: 'Montant moyen par facture (hors avoirs)'
  },
  taux_transformation_devis_nombre: {
    formula: 'COUNT(devis_facturés) / COUNT(devis_émis) × 100',
    explanation: 'Pourcentage de devis transformés en factures (en nombre)'
  },
  taux_transformation_devis_montant: {
    formula: 'SUM(devis_facturés.HT) / SUM(devis_émis.HT) × 100',
    explanation: 'Pourcentage de devis transformés en factures (en valeur)'
  },
  taux_sav_global: {
    formula: 'COUNT(dossiers_SAV) / COUNT(dossiers_total) × 100',
    explanation: 'Pourcentage de dossiers ayant généré un SAV (retour chantier)'
  },
  taux_recouvrement_global: {
    formula: '(totalTTC - restePaidTTC) / totalTTC × 100',
    explanation: 'Pourcentage du CA effectivement encaissé'
  },
};

export function MetricExplanation({
  measureId,
  measureLabel,
  value,
  breakdown,
  dateRange,
  agencySlug,
  dimensions,
  recordCount
}: MetricExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formulaInfo = METRIC_FORMULAS[measureId] || {
    formula: 'Formule personnalisée',
    explanation: 'Calcul défini par l\'utilisateur'
  };

  // Formatter les valeurs monétaires
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  // Calculer le total si value est un objet
  const totalValue = typeof value === 'number' 
    ? value 
    : Object.values(value).reduce((sum, v) => sum + (v || 0), 0);

  // Construire le contexte sélectionné
  const getContextDescription = () => {
    const parts = [];
    
    if (dimensions?.mois) {
      parts.push(`Période : ${dimensions.mois}`);
    } else {
      parts.push(`Période : ${format(dateRange.start, 'dd/MM/yyyy', { locale: fr })} → ${format(dateRange.end, 'dd/MM/yyyy', { locale: fr })}`);
    }
    
    if (dimensions?.univers) {
      parts.push(`Univers : ${dimensions.univers.name}`);
    }
    
    if (dimensions?.technicien) {
      parts.push(`Technicien : ${dimensions.technicien.name}`);
    }
    
    if (dimensions?.apporteur) {
      parts.push(`Apporteur : ${dimensions.apporteur.name}`);
    }
    
    parts.push(`Agence : ${agencySlug}`);
    
    return parts;
  };

  // Extraire les détails du breakdown pour CA
  const hasCABreakdown = breakdown && (breakdown.factureCount !== undefined || breakdown.avoirCount !== undefined);
  const factureCount = breakdown?.factureCount || 0;
  const avoirCount = breakdown?.avoirCount || 0;
  const factureTotal = breakdown?.factureTotal || 0;
  const avoirTotal = breakdown?.avoirTotal || 0;

  return (
    <div className="mt-4 space-y-3 border-t pt-3">
      {/* Header avec toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Détail du calcul
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="space-y-3 text-xs animate-in slide-in-from-top-2">
          {/* Mesure */}
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0">MESURE</Badge>
            <span className="font-medium">{measureLabel}</span>
          </div>

          {/* Contexte sélectionné */}
          <div className="space-y-1">
            <Badge variant="outline" className="shrink-0">CONTEXTE</Badge>
            <ul className="ml-4 space-y-0.5 text-muted-foreground">
              {getContextDescription().map((line, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Formule */}
          <div className="space-y-1">
            <Badge variant="outline" className="shrink-0">FORMULE</Badge>
            <div className="ml-4 p-2 bg-muted/50 rounded font-mono text-[10px] border">
              {formulaInfo.formula}
            </div>
            <p className="ml-4 text-muted-foreground italic">
              {formulaInfo.explanation}
            </p>
          </div>

          {/* Calcul détaillé pour CA */}
          {hasCABreakdown && (
            <div className="space-y-2">
              <Badge variant="outline" className="shrink-0">CALCUL DÉTAILLÉ</Badge>
              <div className="ml-4 p-3 bg-muted/30 rounded-lg border space-y-2">
                {/* Factures */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-green-600" />
                    Factures (HT)
                  </span>
                  <span className="font-medium text-green-600">
                    {factureTotal > 0 ? `+${formatCurrency(factureTotal)}` : formatCurrency(factureTotal)}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({factureCount} facture{factureCount > 1 ? 's' : ''})
                    </span>
                  </span>
                </div>
                
                {/* Avoirs */}
                {avoirCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Minus className="h-3.5 w-3.5 text-red-600" />
                      Avoirs (HT)
                    </span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(-Math.abs(avoirTotal))}
                      <span className="text-muted-foreground font-normal ml-1">
                        ({avoirCount} avoir{avoirCount > 1 ? 's' : ''})
                      </span>
                    </span>
                  </div>
                )}
                
                {/* Séparateur */}
                <div className="border-t border-dashed" />
                
                {/* Total */}
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-2">
                    <Equal className="h-3.5 w-3.5" />
                    TOTAL NET
                  </span>
                  <span className={cn(
                    totalValue >= 0 ? 'text-primary' : 'text-red-600'
                  )}>
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Enregistrements traités */}
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Enregistrements traités
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {recordCount}
            </Badge>
          </div>

          {/* Breakdown détaillé si disponible */}
          {breakdown && Object.keys(breakdown).length > 0 && !hasCABreakdown && (
            <div className="space-y-1">
              <Badge variant="outline" className="shrink-0">DÉTAILS</Badge>
              <div className="ml-4 p-2 bg-muted/30 rounded text-[10px] font-mono">
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span>{typeof val === 'number' ? val.toLocaleString('fr-FR') : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lien vers Apogée */}
          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 w-full justify-start text-muted-foreground hover:text-primary"
              onClick={() => {
                const apogeeUrl = `https://${agencySlug}.hc-apogee.fr`;
                window.open(apogeeUrl, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Vérifier sur Apogée ({agencySlug})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
