import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSessionState } from '@/hooks/useSessionState';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import type { ChargeTravauxResult } from '@/statia/shared/chargeTravauxEngine';
import { PipelineMaturityCard } from './PipelineMaturityCard';
import { PipelineAgingCard } from './PipelineAgingCard';
import { RiskDossiersCard } from './RiskDossiersCard';
import { ChargeTechnicienCard } from './ChargeTechnicienCard';
import { ChargeSemaineCard } from './ChargeSemaineCard';
import { FiabilitePrevisionnelCard } from './FiabilitePrevisionnelCard';

interface Props {
  data: ChargeTravauxResult;
}

export function PilotageAvanceSection({ data }: Props) {
  const [isOpen, setIsOpen] = useSessionState('previsionnel_pilotage_avance', false);

  return (
    <div className="space-y-2">
      <div className="h-px bg-border" />
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-3 w-full py-3 group cursor-pointer">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div className="text-left">
              <h3 className="text-sm font-semibold">Pilotage avancé</h3>
              <p className="text-xs text-muted-foreground">Analyse des risques, maturité pipeline et charge future</p>
            </div>
          </div>
          <div className="ml-auto">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 md:grid-cols-2 pt-2">
            <PipelineMaturityCard data={data.pipelineMaturity} />
            <PipelineAgingCard data={data.pipelineAging} />
            <RiskDossiersCard projects={data.riskProjects} />
            <ChargeTechnicienCard data={data.chargeByTechnician} />
            <ChargeSemaineCard data={data.weeklyLoad} />
            <FiabilitePrevisionnelCard data={data.dataQuality} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
