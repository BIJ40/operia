import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Maximize2 } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { FlopApporteurStats } from "@/apogee-connect/utils/apporteursCalculations";
import { WidgetDialog } from "./WidgetDialog";

interface FlopApporteursWidgetProps {
  data: FlopApporteurStats[];
}

export const FlopApporteursWidget = ({ data }: FlopApporteursWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const ApporteursList = ({ items, showAll = false }: { items: FlopApporteurStats[], showAll?: boolean }) => {
    const displayData = showAll ? items : items.slice(0, 10);
    
    return (
      <TooltipProvider>
        <div className="space-y-3">
          {displayData.map((apporteur, index) => (
            <div 
              key={apporteur.apporteurId}
              className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors border border-orange-200 dark:border-orange-800 min-h-[88px]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge 
                  variant="destructive"
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                >
                  {index + 1}
                </Badge>
                
                <div className="flex-1 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="font-semibold text-sm truncate cursor-help">{apporteur.name}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{apporteur.name}</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {apporteur.nbFacturesImpayees} facture{apporteur.nbFacturesImpayees > 1 ? 's' : ''} impayée{apporteur.nbFacturesImpayees > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">{formatEuros(apporteur.duTotal)}</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">TTC dû</p>
              </div>
            </div>
          ))}
        </div>
      </TooltipProvider>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Flop 10 Apporteurs
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun apporteur avec des factures impayées
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsDialogOpen(true)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Flop 10 Apporteurs
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Classement par montant dû TTC</p>
        
        <ApporteursList items={data} showAll={false} />
      </Card>

      <WidgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Flop ${data.length} Apporteurs - Classement complet`}
        maxWidth="full"
      >
        <ApporteursList items={data} showAll={true} />
      </WidgetDialog>
    </>
  );
};
