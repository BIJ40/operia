/**
 * ReliabilitySection — Checklist + priority actions.
 */
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { PRIORITY_ACTIONS } from '../constants';

interface ReliabilitySectionProps {
  flags: string[];
  completenessScore: number;
}

const CHECKLIST_ITEMS = [
  { label: 'Factures présentes', flag: 'no_invoices', invert: true },
  { label: 'Heures enregistrées', flag: 'no_hours', invert: true },
  { label: 'Profils coût techniciens', flag: 'missing_cost_profile', invert: true },
  { label: 'Coûts dossier validés', flag: 'no_project_costs_validated', invert: true },
  { label: 'Charges agence configurées', flag: 'overhead_not_configured', invert: true },
  { label: 'Coût MO calculé (pas estimé)', flag: 'labor_cost_estimated', invert: true },
];

export function ReliabilitySection({ flags, completenessScore }: ReliabilitySectionProps) {
  // Priority actions based on active flags
  const activeActions = PRIORITY_ACTIONS
    .filter(a => flags.includes(a.flag))
    .sort((a, b) => b.impact - a.impact);

  return (
    <div className="space-y-5">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <span className="text-lg font-bold">{completenessScore}</span>
        </div>
        <div>
          <p className="text-sm font-medium">Score de fiabilité</p>
          <p className="text-xs text-muted-foreground">Sur 100 — basé sur la complétude des données</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vérifications</p>
        {CHECKLIST_ITEMS.map((item) => {
          const pass = item.invert ? !flags.includes(item.flag) : flags.includes(item.flag);
          return (
            <div key={item.flag} className="flex items-center gap-2 text-sm">
              {pass ? (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span className={pass ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Priority actions */}
      {activeActions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions prioritaires</p>
          {activeActions.map((action) => (
            <div key={action.flag} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
              <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{action.action}</span>
              <span className="text-xs text-muted-foreground ml-auto">+{action.impact}pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
