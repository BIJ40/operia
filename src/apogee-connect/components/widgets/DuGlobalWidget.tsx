import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface DuGlobalWidgetProps {
  amount: number;
}

export const DuGlobalWidget = ({ amount }: DuGlobalWidgetProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Dû global
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Montant total des factures non payées
      </p>
      
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-orange-500 mb-2">{formatEuros(amount)}</p>
          <p className="text-sm text-muted-foreground">à encaisser</p>
        </div>
      </div>
    </Card>
  );
};
