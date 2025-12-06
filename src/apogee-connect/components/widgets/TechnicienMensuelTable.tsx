/**
 * Tableau des techniciens avec colonnes mensuelles et indicateurs d'évolution
 * - Première colonne: Nom du technicien
 * - Colonnes suivantes: Mois avec CA en haut, évolution en bas
 * - Toggle pour comparer: M-1 vs même mois année précédente
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TechMensuelData {
  techId: string;
  name: string;
  color: string;
  months: Record<string, number>; // "YYYY-MM" -> CA
}

interface TechnicienMensuelTableProps {
  data: TechMensuelData[];
  loading?: boolean;
  availableMonths: string[]; // ["2024-12", "2024-11", ...] ordonnés du plus récent au plus ancien
}

type CompareMode = "month" | "year"; // month = M vs M-1, year = M vs M année précédente

export function TechnicienMensuelTable({ 
  data, 
  loading = false, 
  availableMonths 
}: TechnicienMensuelTableProps) {
  const [compareMode, setCompareMode] = useState<CompareMode>("month");
  
  // Formateurs
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  const formatPercent = (value: number) => {
    if (!isFinite(value)) return "–";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(0)}%`;
  };
  
  // Formater le label du mois
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
  };
  
  // Calculer l'évolution
  const getEvolution = (currentCA: number, previousCA: number): { value: number; type: "up" | "down" | "neutral" } => {
    if (previousCA === 0) {
      if (currentCA === 0) return { value: 0, type: "neutral" };
      return { value: 100, type: "up" };
    }
    const evolution = ((currentCA - previousCA) / previousCA) * 100;
    if (Math.abs(evolution) < 1) return { value: 0, type: "neutral" };
    return { 
      value: evolution, 
      type: evolution > 0 ? "up" : "down" 
    };
  };
  
  // Obtenir la clé du mois de comparaison
  const getCompareMonthKey = (monthKey: string): string => {
    const [year, month] = monthKey.split("-").map(Number);
    
    if (compareMode === "month") {
      // Mois précédent
      if (month === 1) {
        return `${year - 1}-12`;
      }
      return `${year}-${String(month - 1).padStart(2, '0')}`;
    } else {
      // Même mois année précédente
      return `${year - 1}-${String(month).padStart(2, '0')}`;
    }
  };
  
  // Mois à afficher (les 6 derniers mois pour éviter surcharge)
  const displayMonths = useMemo(() => {
    return availableMonths.slice(0, 6);
  }, [availableMonths]);
  
  // Trier les techniciens par CA total décroissant
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const totalA = displayMonths.reduce((sum, m) => sum + (a.months[m] || 0), 0);
      const totalB = displayMonths.reduce((sum, m) => sum + (b.months[m] || 0), 0);
      return totalB - totalA;
    });
  }, [data, displayMonths]);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-helpconfort-blue" />
            Évolution CA par technicien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-helpconfort-blue" />
          Évolution CA par technicien
        </CardTitle>
        
        {/* Toggle mode de comparaison */}
        <div className="flex items-center gap-3">
          <Label htmlFor="compare-mode" className="text-sm text-muted-foreground">
            {compareMode === "month" ? "vs mois précédent" : "vs même mois N-1"}
          </Label>
          <Switch
            id="compare-mode"
            checked={compareMode === "year"}
            onCheckedChange={(checked) => setCompareMode(checked ? "year" : "month")}
          />
        </div>
      </CardHeader>
      
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-background z-10 py-3 px-4 text-left font-semibold text-sm">
                Technicien
              </th>
              {displayMonths.map((month) => (
                <th key={month} className="py-3 px-3 text-center font-semibold text-sm min-w-[100px]">
                  {formatMonthLabel(month)}
                </th>
              ))}
              <th className="py-3 px-4 text-center font-semibold text-sm bg-muted/30 min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((tech) => {
              const total = displayMonths.reduce((sum, m) => sum + (tech.months[m] || 0), 0);
              
              return (
                <tr key={tech.techId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  {/* Nom technicien */}
                  <td className="sticky left-0 bg-background z-10 py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tech.color }}
                      />
                      <span className="font-medium text-sm truncate max-w-[150px]">
                        {tech.name}
                      </span>
                    </div>
                  </td>
                  
                  {/* Colonnes mensuelles */}
                  {displayMonths.map((month) => {
                    const currentCA = tech.months[month] || 0;
                    const compareMonth = getCompareMonthKey(month);
                    const previousCA = tech.months[compareMonth] || 0;
                    const evo = getEvolution(currentCA, previousCA);
                    
                    return (
                      <td key={month} className="py-2 px-3">
                        <div className="flex flex-col items-center gap-0.5">
                          {/* CA en haut */}
                          <span className={cn(
                            "text-sm font-semibold",
                            currentCA === 0 && "text-muted-foreground"
                          )}>
                            {currentCA === 0 ? "–" : formatCurrency(currentCA)}
                          </span>
                          
                          {/* Évolution en bas */}
                          <div className={cn(
                            "flex items-center gap-0.5 text-xs",
                            evo.type === "up" && "text-green-600",
                            evo.type === "down" && "text-red-500",
                            evo.type === "neutral" && "text-muted-foreground"
                          )}>
                            {evo.type === "up" && <TrendingUp className="w-3 h-3" />}
                            {evo.type === "down" && <TrendingDown className="w-3 h-3" />}
                            {evo.type === "neutral" && <Minus className="w-3 h-3" />}
                            <span>{formatPercent(evo.value)}</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* Total */}
                  <td className="py-2 px-4 text-center bg-muted/30">
                    <span className="font-bold text-sm">
                      {formatCurrency(total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
