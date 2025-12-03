/**
 * Sélecteur de métriques pour les bulletins de paie
 */

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface PayslipMetric {
  id: string;
  label: string;
  category: string;
  format: 'currency' | 'number' | 'percent' | 'hours';
  description?: string;
}

export const PAYSLIP_METRICS: PayslipMetric[] = [
  // Salaire de base
  { id: 'taux_horaire_brut', label: 'Taux horaire brut', category: 'Base', format: 'currency', description: 'Taux horaire de base' },
  { id: 'heures_base', label: 'Heures de base', category: 'Base', format: 'hours' },
  { id: 'montant_brut_base', label: 'Salaire de base', category: 'Base', format: 'currency' },
  
  // Totaux
  { id: 'total_brut', label: 'Brut total', category: 'Totaux', format: 'currency' },
  { id: 'net_imposable', label: 'Net imposable', category: 'Totaux', format: 'currency' },
  { id: 'net_a_payer', label: 'Net à payer', category: 'Totaux', format: 'currency' },
  { id: 'montant_net_social', label: 'Net social', category: 'Totaux', format: 'currency' },
  
  // Charges
  { id: 'total_charges_salariales', label: 'Charges salariales', category: 'Charges', format: 'currency' },
  { id: 'total_charges_patronales', label: 'Charges patronales', category: 'Charges', format: 'currency' },
  { id: 'cout_global_employeur', label: 'Coût employeur', category: 'Charges', format: 'currency' },
  
  // Cumuls
  { id: 'brut_cumule', label: 'Brut cumulé annuel', category: 'Cumuls', format: 'currency' },
  { id: 'net_imposable_cumule', label: 'Net imposable cumulé', category: 'Cumuls', format: 'currency' },
  { id: 'heures_cumulees', label: 'Heures cumulées', category: 'Cumuls', format: 'hours' },
];

// Métriques calculées depuis raw_data
export const DETAILED_METRICS: PayslipMetric[] = [
  // Primes (depuis lignes_remuneration_variables)
  { id: 'primes_total', label: 'Total primes', category: 'Primes', format: 'currency', description: 'Somme de toutes les primes' },
  { id: 'prime_panier_repas', label: 'Panier/Repas', category: 'Primes', format: 'currency' },
  { id: 'prime_deplacement', label: 'Déplacement', category: 'Primes', format: 'currency' },
  { id: 'prime_anciennete', label: 'Ancienneté', category: 'Primes', format: 'currency' },
  { id: 'prime_exceptionnelle', label: 'Prime exceptionnelle', category: 'Primes', format: 'currency' },
  
  // Heures supplémentaires
  { id: 'heures_supp_125', label: 'Heures sup 125%', category: 'Heures sup', format: 'hours' },
  { id: 'heures_supp_150', label: 'Heures sup 150%', category: 'Heures sup', format: 'hours' },
  { id: 'heures_supp_total', label: 'Total heures sup', category: 'Heures sup', format: 'hours' },
  { id: 'montant_heures_supp', label: 'Montant heures sup', category: 'Heures sup', format: 'currency' },
];

interface PayslipMetricSelectorProps {
  selectedMetrics: string[];
  onSelectionChange: (metrics: string[]) => void;
  includeDetailed?: boolean;
}

export function PayslipMetricSelector({
  selectedMetrics,
  onSelectionChange,
  includeDetailed = true,
}: PayslipMetricSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Base', 'Totaux']);

  const allMetrics = includeDetailed ? [...PAYSLIP_METRICS, ...DETAILED_METRICS] : PAYSLIP_METRICS;
  
  const categories = [...new Set(allMetrics.map(m => m.category))];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleMetric = (metricId: string) => {
    onSelectionChange(
      selectedMetrics.includes(metricId)
        ? selectedMetrics.filter(id => id !== metricId)
        : [...selectedMetrics, metricId]
    );
  };

  const selectAllInCategory = (category: string) => {
    const categoryMetrics = allMetrics.filter(m => m.category === category).map(m => m.id);
    const allSelected = categoryMetrics.every(id => selectedMetrics.includes(id));
    
    if (allSelected) {
      onSelectionChange(selectedMetrics.filter(id => !categoryMetrics.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedMetrics, ...categoryMetrics])]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Métriques à afficher</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
          className="text-xs"
        >
          Tout désélectionner
        </Button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md p-2">
        {categories.map(category => {
          const categoryMetrics = allMetrics.filter(m => m.category === category);
          const isExpanded = expandedCategories.includes(category);
          const selectedCount = categoryMetrics.filter(m => selectedMetrics.includes(m.id)).length;

          return (
            <Collapsible key={category} open={isExpanded}>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted text-sm"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span className="font-medium">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedCount}/{categoryMetrics.length})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(category);
                  }}
                >
                  {selectedCount === categoryMetrics.length ? 'Aucun' : 'Tous'}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="pl-6 space-y-1 pt-1">
                {categoryMetrics.map(metric => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <Checkbox
                      id={metric.id}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <Label
                      htmlFor={metric.id}
                      className="text-sm cursor-pointer"
                    >
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
