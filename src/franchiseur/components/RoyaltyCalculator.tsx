import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCalculateRoyalty } from '../hooks/useRoyaltyCalculation';
import { formatCurrency, formatPercentage, RoyaltyCalculationResult, DEFAULT_TIERS } from '../utils/royaltyCalculator';

interface RoyaltyCalculatorProps {
  agencyId: string;
  agencyLabel?: string;
}

export function RoyaltyCalculator({ agencyId, agencyLabel }: RoyaltyCalculatorProps) {
  const [caInput, setCaInput] = useState<string>('');
  const [result, setResult] = useState<RoyaltyCalculationResult | null>(null);
  
  const { calculate, config, hasCustomConfig } = useCalculateRoyalty(agencyId);

  const handleCalculate = () => {
    const ca = parseFloat(caInput.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(ca) || ca < 0) {
      return;
    }
    setResult(calculate(ca));
  };

  const tiers = hasCustomConfig && config?.tiers 
    ? config.tiers 
    : DEFAULT_TIERS;

  return (
    <div className="space-y-6">
      {/* Affichage des tranches applicables */}
      <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Barème applicable
                {hasCustomConfig && (
                  <span className="text-xs font-normal bg-accent/20 text-accent px-2 py-1 rounded">
                    {config?.model_name || 'Personnalisé'}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {hasCustomConfig 
                  ? 'Configuration personnalisée pour cette agence'
                  : 'Barème standard du réseau'}
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Les redevances sont calculées par tranches progressives sur le CA cumulé annuel.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tranche CA</TableHead>
                <TableHead className="text-right">Taux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {tier.to_amount === null
                      ? `Au-delà de ${formatCurrency(tier.from_amount)}`
                      : `${formatCurrency(tier.from_amount)} → ${formatCurrency(tier.to_amount)}`}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {tier.percentage}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Simulateur de calcul */}
      <Card className="rounded-2xl border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur de calcul
          </CardTitle>
          <CardDescription>
            Entrez le CA cumulé annuel pour calculer la redevance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ca-input">CA cumulé annuel (€)</Label>
              <Input
                id="ca-input"
                type="text"
                value={caInput}
                onChange={(e) => setCaInput(e.target.value)}
                placeholder="Ex: 750000"
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
            </div>
            <Button onClick={handleCalculate}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculer
            </Button>
          </div>

          {result && (
            <div className="mt-6 space-y-4">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">CA Annuel</p>
                  <p className="text-lg font-bold">{formatCurrency(result.totalCA)}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-xs text-muted-foreground">Redevance</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(result.totalRoyalty)}</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/10 text-center">
                  <p className="text-xs text-muted-foreground">Taux effectif</p>
                  <p className="text-lg font-bold text-accent">{formatPercentage(result.effectiveRate)}</p>
                </div>
              </div>

              {/* Détail par tranche */}
              {result.details.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Détail par tranche</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tranche</TableHead>
                        <TableHead className="text-right">CA dans tranche</TableHead>
                        <TableHead className="text-right">Taux</TableHead>
                        <TableHead className="text-right">Redevance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.details.map((detail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">
                            {detail.tier.to_amount === null
                              ? `> ${formatCurrency(detail.tier.from_amount)}`
                              : `${formatCurrency(detail.tier.from_amount)} - ${formatCurrency(detail.tier.to_amount)}`}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(detail.baseAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.tier.percentage}%
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(detail.royaltyAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right text-primary">
                          {formatCurrency(result.totalRoyalty)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
