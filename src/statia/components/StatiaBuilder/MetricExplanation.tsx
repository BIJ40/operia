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
  breakdown?: Record<string, unknown>;
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
  const [showDetails, setShowDetails] = useState(false);
  
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
      {/* Explication principale - TOUJOURS VISIBLE */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2 mb-2">
          <Calculator className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
              {measureLabel}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {formulaInfo.explanation}
            </p>
          </div>
        </div>
        
        {/* Formule technique */}
        <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded font-mono text-[10px] border border-blue-200 dark:border-blue-700">
          <span className="text-muted-foreground">Formule :</span> {formulaInfo.formula}
        </div>
        
        {/* Contexte appliqué */}
        <div className="mt-2 text-[10px] text-blue-600 dark:text-blue-400">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {getContextDescription().map((line, i) => (
              <span key={i}>• {line}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Calcul détaillé pour CA - affiché si disponible */}
      {hasCABreakdown && (
        <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Détail du calcul :</div>
          
          {/* Factures */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-green-600" />
              Factures (HT)
            </span>
            <span className="font-medium text-green-600">
              {factureTotal > 0 ? `+${formatCurrency(factureTotal)}` : formatCurrency(factureTotal)}
              <span className="text-muted-foreground font-normal ml-1 text-xs">
                ({factureCount})
              </span>
            </span>
          </div>
          
          {/* Avoirs */}
          {avoirCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Minus className="h-3.5 w-3.5 text-red-600" />
                Avoirs (HT)
              </span>
              <span className="font-medium text-red-600">
                {formatCurrency(-Math.abs(avoirTotal))}
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  ({avoirCount})
                </span>
              </span>
            </div>
          )}
          
          {/* Séparateur */}
          <div className="border-t border-dashed" />
          
          {/* Total */}
          <div className="flex items-center justify-between font-semibold text-sm">
            <span className="flex items-center gap-2">
              <Equal className="h-3.5 w-3.5" />
              RÉSULTAT
            </span>
            <span className={cn(
              totalValue >= 0 ? 'text-primary' : 'text-red-600'
            )}>
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      )}

      {/* Enregistrements traités */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {recordCount} enregistrement{recordCount > 1 ? 's' : ''} traité{recordCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* Toggle pour détails avancés */}
      {breakdown && Object.keys(breakdown).length > 0 && !hasCABreakdown && (
        <>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Détails techniques
            </span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showDetails && (
            <div className="p-2 bg-muted/30 rounded text-[10px] font-mono animate-in slide-in-from-top-2">
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span>{typeof val === 'number' ? val.toLocaleString('fr-FR') : String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lien vers Apogée */}
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
  );
}
