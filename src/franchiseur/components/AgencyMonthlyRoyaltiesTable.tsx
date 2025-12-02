import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useRoyaltyConfig } from "../hooks/useRoyaltyConfig";
import { calculateRoyalties, formatCurrency, formatPercentage, DEFAULT_TIERS, RoyaltyTier } from "../utils/royaltyCalculator";
import { useAgencyMonthlyCA } from "../hooks/useAgencyMonthlyCA";

interface AgencyMonthlyRoyaltiesTableProps {
  agencyId: string;
  agencySlug?: string;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface MonthlyRoyaltyRow {
  month: number;
  monthLabel: string;
  ca: number;
  caCumul: number;
  royaltyMonth: number;
  royaltyCumul: number;
  straddlesTiers: boolean;
  tiersUsed: { from: number; to: number | null; percentage: number; amount: number }[];
}

export function AgencyMonthlyRoyaltiesTable({ agencyId, agencySlug }: AgencyMonthlyRoyaltiesTableProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { data: config, isLoading: configLoading } = useRoyaltyConfig(agencyId);
  const { data: monthlyCA, isLoading: caLoading, error: caError } = useAgencyMonthlyCA(agencySlug, selectedYear);

  const tiers: RoyaltyTier[] = useMemo(() => {
    if (config?.tiers && config.tiers.length > 0) {
      return config.tiers.map(t => ({
        from_amount: t.from_amount,
        to_amount: t.to_amount,
        percentage: t.percentage,
      }));
    }
    return DEFAULT_TIERS;
  }, [config]);

  const monthlyData = useMemo((): MonthlyRoyaltyRow[] => {
    if (!monthlyCA) return [];

    const rows: MonthlyRoyaltyRow[] = [];
    let caCumul = 0;
    let royaltyCumulPrevious = 0;

    for (let month = 0; month < 12; month++) {
      const ca = monthlyCA[month] || 0;
      const previousCaCumul = caCumul;
      caCumul += ca;

      // Calculate royalties on cumulative CA
      const currentRoyaltyResult = calculateRoyalties(caCumul, tiers);
      const royaltyCumul = currentRoyaltyResult.totalRoyalty;
      const royaltyMonth = royaltyCumul - royaltyCumulPrevious;

      // Check if this month straddles multiple tiers
      const previousResult = calculateRoyalties(previousCaCumul, tiers);
      const straddlesTiers = currentRoyaltyResult.details.length > previousResult.details.length ||
        (currentRoyaltyResult.details.length === previousResult.details.length && 
         currentRoyaltyResult.details.some((d, i) => {
           const prevDetail = previousResult.details[i];
           return prevDetail && d.tier.from_amount !== prevDetail.tier.from_amount;
         }));

      // Get tiers used for this month's CA increment
      const tiersUsed: MonthlyRoyaltyRow['tiersUsed'] = [];
      if (ca > 0) {
        let remainingCA = ca;
        let currentPosition = previousCaCumul;
        
        for (const tier of [...tiers].sort((a, b) => a.from_amount - b.from_amount)) {
          if (remainingCA <= 0) break;
          
          const tierEnd = tier.to_amount ?? Infinity;
          if (currentPosition >= tierEnd) continue;
          
          const startInTier = Math.max(currentPosition, tier.from_amount);
          const endInTier = Math.min(currentPosition + remainingCA, tierEnd);
          const amountInTier = endInTier - startInTier;
          
          if (amountInTier > 0) {
            tiersUsed.push({
              from: tier.from_amount,
              to: tier.to_amount,
              percentage: tier.percentage,
              amount: amountInTier * (tier.percentage / 100),
            });
            remainingCA -= amountInTier;
            currentPosition = endInTier;
          }
        }
      }

      rows.push({
        month,
        monthLabel: MONTHS[month],
        ca,
        caCumul,
        royaltyMonth,
        royaltyCumul,
        straddlesTiers: tiersUsed.length > 1,
        tiersUsed,
      });

      royaltyCumulPrevious = royaltyCumul;
    }

    return rows;
  }, [monthlyCA, tiers]);

  const totalCA = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].caCumul : 0;
  const totalRoyalty = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].royaltyCumul : 0;
  const effectiveRate = totalCA > 0 ? (totalRoyalty / totalCA) * 100 : 0;

  const isLoading = configLoading || caLoading;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (caError) {
    return (
      <Card className="rounded-2xl border-l-4 border-l-destructive">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-muted-foreground">Impossible de charger les données de CA</p>
          <p className="text-xs text-muted-foreground mt-1">{String(caError)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Détail mensuel des redevances
            </CardTitle>
            <CardDescription>
              CA et redevances calculées mois par mois avec barème progressif
            </CardDescription>
          </div>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {years.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">CA mensuel</TableHead>
                    <TableHead className="text-right">CA cumulé</TableHead>
                    <TableHead className="text-right">Redevance mois</TableHead>
                    <TableHead className="text-right">Redevance cumulée</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((row) => (
                    <TableRow key={row.month} className={row.straddlesTiers ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <TableCell className="font-medium">{row.monthLabel}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.ca > 0 ? formatCurrency(row.ca) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.caCumul > 0 ? formatCurrency(row.caCumul) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.royaltyMonth > 0 ? formatCurrency(row.royaltyMonth) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.royaltyCumul > 0 ? formatCurrency(row.royaltyCumul) : "-"}
                      </TableCell>
                      <TableCell>
                        {row.straddlesTiers && row.tiersUsed.length > 1 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="gap-1 cursor-help">
                                  <Info className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs p-3">
                                <p className="font-semibold mb-2">Calcul à cheval sur plusieurs tranches :</p>
                                <ul className="space-y-1 text-xs">
                                  {row.tiersUsed.map((t, i) => (
                                    <li key={i} className="flex justify-between gap-4">
                                      <span>
                                        Tranche {formatCurrency(t.from)} - {t.to ? formatCurrency(t.to) : "∞"} ({t.percentage}%)
                                      </span>
                                      <span className="font-mono">{formatCurrency(t.amount)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">CA Total {selectedYear}</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCA)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redevances Totales</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalRoyalty)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    Taux effectif
                    <TrendingUp className="h-3 w-3" />
                  </p>
                  <p className="text-2xl font-bold">{formatPercentage(effectiveRate)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
