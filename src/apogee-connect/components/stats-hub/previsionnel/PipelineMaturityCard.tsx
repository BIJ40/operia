import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { PipelineMaturityInfo } from '@/statia/shared/chargeTravauxEngine';

const STAGES = [
  { key: 'commercial' as const, label: 'Commercial', color: 'hsl(var(--primary))', tooltip: 'Dossier sans devis validé ni date planifiée — phase commerciale initiale' },
  { key: 'a_commander' as const, label: 'À commander', color: 'hsl(35, 90%, 60%)', tooltip: 'Devis en attente de commande (état devis_to_order)' },
  { key: 'pret_planification' as const, label: 'Prêt planif.', color: 'hsl(200, 85%, 60%)', tooltip: 'Dossier prêt à planifier avec devis validé (état to_planify_tvx)' },
  { key: 'planifie' as const, label: 'Planifié', color: 'hsl(142, 76%, 36%)', tooltip: 'Date d\'intervention future déjà programmée' },
  { key: 'bloque' as const, label: 'Bloqué', color: 'hsl(0, 84%, 60%)', tooltip: 'En attente fournisseur (état wait_fourn)' },
];

interface Props {
  data: PipelineMaturityInfo;
}

export function PipelineMaturityCard({ data }: Props) {
  const total = STAGES.reduce((s, st) => s + data[st.key], 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Maturité pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <TooltipProvider delayDuration={200}>
          {STAGES.map(stage => {
            const value = data[stage.key];
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {stage.label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        {stage.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            );
          })}
        </TooltipProvider>
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun dossier</p>
        )}
      </CardContent>
    </Card>
  );
}
