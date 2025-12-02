import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info, TrendingUp, AlertTriangle, Loader2, GitCompareArrows } from "lucide-react";
import { useRoyaltyConfig, useAllRoyaltyModels } from "../hooks/useRoyaltyConfig";
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
  // Comparison data
  compareRoyaltyMonth?: number;
  compareRoyaltyCumul?: number;
  compareStraddlesTiers?: boolean;
  compareTiersUsed?: { from: number; to: number | null; percentage: number; amount: number }[];
}

export function AgencyMonthlyRoyaltiesTable({ agencyId, agencySlug }: AgencyMonthlyRoyaltiesTableProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [compareModelName, setCompareModelName] = useState<string>("");
  
  const { data: config, isLoading: configLoading } = useRoyaltyConfig(agencyId);
  const { data: allModels = [], isLoading: modelsLoading } = useAllRoyaltyModels();
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

  const compareTiers: RoyaltyTier[] | null = useMemo(() => {
    if (!compareModelName) return null;
    const model = allModels.find(m => m.model_name === compareModelName);
    if (!model) return null;
    return model.tiers.map(t => ({
      from_amount: t.from_amount,
      to_amount: t.to_amount,
      percentage: t.percentage,
    }));
  }, [compareModelName, allModels]);

  const calculateTiersUsed = (ca: number, previousCaCumul: number, tiersToUse: RoyaltyTier[]) => {
    const tiersUsed: MonthlyRoyaltyRow['tiersUsed'] = [];
    if (ca > 0) {
      let remainingCA = ca;
      let currentPosition = previousCaCumul;
      
      for (const tier of [...tiersToUse].sort((a, b) => a.from_amount - b.from_amount)) {
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
    return tiersUsed;
  };

  const monthlyData = useMemo((): MonthlyRoyaltyRow[] => {
    if (!monthlyCA) return [];

    const rows: MonthlyRoyaltyRow[] = [];
    let caCumul = 0;
    let royaltyCumulPrevious = 0;
    let compareRoyaltyCumulPrevious = 0;

    for (let month = 0; month < 12; month++) {
      const ca = monthlyCA[month] || 0;
      const previousCaCumul = caCumul;
      caCumul += ca;

      // Calculate royalties on cumulative CA - main model
      const currentRoyaltyResult = calculateRoyalties(caCumul, tiers);
      const royaltyCumul = currentRoyaltyResult.totalRoyalty;
      const royaltyMonth = royaltyCumul - royaltyCumulPrevious;
      const tiersUsed = calculateTiersUsed(ca, previousCaCumul, tiers);

      // Calculate comparison model
      let compareRoyaltyMonth: number | undefined;
      let compareRoyaltyCumul: number | undefined;
      let compareTiersUsed: MonthlyRoyaltyRow['compareTiersUsed'];
      
      if (compareTiers) {
        const compareResult = calculateRoyalties(caCumul, compareTiers);
        compareRoyaltyCumul = compareResult.totalRoyalty;
        compareRoyaltyMonth = compareRoyaltyCumul - compareRoyaltyCumulPrevious;
        compareTiersUsed = calculateTiersUsed(ca, previousCaCumul, compareTiers);
        compareRoyaltyCumulPrevious = compareRoyaltyCumul;
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
        compareRoyaltyMonth,
        compareRoyaltyCumul,
        compareStraddlesTiers: compareTiersUsed && compareTiersUsed.length > 1,
        compareTiersUsed,
      });

      royaltyCumulPrevious = royaltyCumul;
    }

    return rows;
  }, [monthlyCA, tiers, compareTiers]);

  const totalCA = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].caCumul : 0;
  const totalRoyalty = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].royaltyCumul : 0;
  const effectiveRate = totalCA > 0 ? (totalRoyalty / totalCA) * 100 : 0;
  
  const compareTotalRoyalty = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].compareRoyaltyCumul : undefined;
  const compareEffectiveRate = compareTotalRoyalty !== undefined && totalCA > 0 
    ? (compareTotalRoyalty / totalCA) * 100 
    : undefined;
  const royaltyDifference = compareTotalRoyalty !== undefined ? totalRoyalty - compareTotalRoyalty : undefined;

  const isLoading = configLoading || caLoading || modelsLoading;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const showComparison = !!compareModelName && !!compareTiers;

  // Filter out current model from comparison options
  const currentModelName = config?.model_name || 'Standard (défaut)';
  const comparisonModels = allModels.filter(m => m.model_name !== currentModelName);

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
          <div className="flex items-center gap-2 flex-wrap">
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
            
            {comparisonModels.length > 0 && (
              <Select value={compareModelName} onValueChange={setCompareModelName}>
                <SelectTrigger className="w-48 bg-background">
                  <GitCompareArrows className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Comparer avec..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="">Pas de comparaison</SelectItem>
                  {comparisonModels.map(model => (
                    <SelectItem key={model.model_name} value={model.model_name}>
                      {model.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
                    {showComparison && (
                      <>
                        <TableHead className="text-right bg-amber-50 dark:bg-amber-950/30 border-l">
                          {compareModelName} (mois)
                        </TableHead>
                        <TableHead className="text-right bg-amber-50 dark:bg-amber-950/30">
                          {compareModelName} (cumul)
                        </TableHead>
                        <TableHead className="w-10 bg-amber-50 dark:bg-amber-950/30"></TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((row) => (
                    <TableRow key={row.month} className={row.straddlesTiers ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
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
                      {showComparison && (
                        <>
                          <TableCell className="text-right font-mono bg-amber-50/50 dark:bg-amber-950/20 border-l">
                            {row.compareRoyaltyMonth !== undefined && row.compareRoyaltyMonth > 0 
                              ? formatCurrency(row.compareRoyaltyMonth) 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold bg-amber-50/50 dark:bg-amber-950/20">
                            {row.compareRoyaltyCumul !== undefined && row.compareRoyaltyCumul > 0 
                              ? formatCurrency(row.compareRoyaltyCumul) 
                              : "-"}
                          </TableCell>
                          <TableCell className="bg-amber-50/50 dark:bg-amber-950/20">
                            {row.compareStraddlesTiers && row.compareTiersUsed && row.compareTiersUsed.length > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="gap-1 cursor-help">
                                      <Info className="h-3 w-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-3">
                                    <p className="font-semibold mb-2">Calcul {compareModelName} :</p>
                                    <ul className="space-y-1 text-xs">
                                      {row.compareTiersUsed.map((t, i) => (
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
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className={`grid gap-4 text-center ${showComparison ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-3'}`}>
                <div>
                  <p className="text-sm text-muted-foreground">CA Total {selectedYear}</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCA)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Redevances ({currentModelName})</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalRoyalty)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    Taux effectif
                    <TrendingUp className="h-3 w-3" />
                  </p>
                  <p className="text-2xl font-bold">{formatPercentage(effectiveRate)}</p>
                </div>
                {showComparison && compareTotalRoyalty !== undefined && (
                  <>
                    <div className="bg-amber-100/50 dark:bg-amber-950/30 rounded-lg p-2 -m-2">
                      <p className="text-sm text-muted-foreground">Redevances ({compareModelName})</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(compareTotalRoyalty)}</p>
                    </div>
                    <div className="bg-amber-100/50 dark:bg-amber-950/30 rounded-lg p-2 -m-2">
                      <p className="text-sm text-muted-foreground">Taux effectif ({compareModelName})</p>
                      <p className="text-2xl font-bold">{formatPercentage(compareEffectiveRate || 0)}</p>
                    </div>
                    <div className={`rounded-lg p-2 -m-2 ${royaltyDifference && royaltyDifference > 0 ? 'bg-red-100/50 dark:bg-red-950/30' : 'bg-green-100/50 dark:bg-green-950/30'}`}>
                      <p className="text-sm text-muted-foreground">Différence</p>
                      <p className={`text-2xl font-bold ${royaltyDifference && royaltyDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {royaltyDifference && royaltyDifference > 0 ? '+' : ''}{formatCurrency(royaltyDifference || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
