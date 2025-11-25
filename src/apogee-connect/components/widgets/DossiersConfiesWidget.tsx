import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FolderOpen, Maximize2 } from "lucide-react";
import { DossiersParApporteur } from "@/apogee-connect/utils/apporteursCalculations";
import { WidgetDialog } from "./WidgetDialog";
import { Button } from "@/components/ui/button";

interface DossiersConfiesWidgetProps {
  dossiers: DossiersParApporteur[];
}

export const DossiersConfiesWidget = ({ dossiers }: DossiersConfiesWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const top10 = dossiers.slice(0, 5);
  
  const WidgetContent = ({ showAll = false }: { showAll?: boolean }) => {
    const displayData = showAll ? dossiers : top10;
    
    return (
      <div className="space-y-3">
        {displayData.map((apporteur, index) => (
          <div
            key={apporteur.apporteurId}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 min-h-[88px]"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground w-6">#{index + 1}</span>
              <span className="text-sm font-medium truncate">{apporteur.name}</span>
            </div>
            <span className="text-sm font-bold text-primary ml-2">
              {apporteur.nbDossiers}
            </span>
          </div>
        ))}
        {displayData.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucun dossier confié sur cette période
          </p>
        )}
      </div>
    );
  };
  
  return (
    <>
      <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsDialogOpen(true)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Top 5 Dossiers confiés
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Apporteurs ayant confié le plus de dossiers
        </p>
      
        <WidgetContent showAll={false} />
      </Card>
      
      <WidgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Dossiers confiés - Classement complet"
        maxWidth="xl"
      >
        <WidgetContent showAll={true} />
      </WidgetDialog>
    </>
  );
};
