import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Building2, Maximize2 } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { ApporteurStats } from "@/apogee-connect/utils/apporteursCalculations";
import { WidgetDialog } from "./WidgetDialog";

interface TopApporteursWidgetProps {
  data: ApporteurStats[];
}

export const TopApporteursWidget = ({ data }: TopApporteursWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const ApporteursList = ({ items, showAll = false }: { items: ApporteurStats[], showAll?: boolean }) => {
    const displayData = showAll ? items : items.slice(0, 5);
    
    return (
      <TooltipProvider>
        <div className="space-y-3">
          {displayData.map((apporteur, index) => (
            <div 
              key={apporteur.apporteurId}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors min-h-[88px]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge 
                  variant={index < 3 ? "default" : "secondary"}
                  className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${
                    index === 0 ? "bg-yellow-500 hover:bg-yellow-600" :
                    index === 1 ? "bg-gray-400 hover:bg-gray-500" :
                    index === 2 ? "bg-orange-600 hover:bg-orange-700" :
                    ""
                  }`}
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
                      {apporteur.nbDossiers} dossier{apporteur.nbDossiers > 1 ? 's' : ''}
                    </span>
                    {apporteur.nbDevis > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {apporteur.nbDevis} devis
                        </span>
                        {apporteur.tauxTransformation > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {apporteur.tauxTransformation.toFixed(0)}%
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-bold text-primary whitespace-nowrap">{formatEuros(apporteur.caHT)}</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">HT</p>
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
          <Building2 className="w-5 h-5" />
          Top 5 Apporteurs
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun apporteur pour cette période
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsDialogOpen(true)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Top 5 Apporteurs
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Classement par CA HT généré</p>
        
        <ApporteursList items={data} showAll={false} />
      </Card>

      <WidgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={`Top ${data.length} Apporteurs - Classement complet`}
        maxWidth="full"
      >
        <ApporteursList items={data} showAll={true} />
      </WidgetDialog>
    </>
  );
};
