/**
 * Dossiers à risque — table collapsible triée par riskScoreGlobal desc
 * Badges colorés flux / data / value
 * Zero logique métier
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import type { ChargeTravauxProjet } from '@/statia/shared/chargeTravauxEngine';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

function RiskBadge({ label, score, max }: { label: string; score: number; max: number }) {
  const ratio = score / max;
  const variant = ratio > 0.6 ? 'destructive' : ratio > 0.3 ? 'default' : 'secondary';
  return (
    <Badge variant={variant} className="text-xs">
      {label} {score}
    </Badge>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score > 60 ? 'bg-red-500' : score > 30 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

interface Props {
  dossiersRisque: ChargeTravauxProjet[];
}

export function RiskSection({ dossiersRisque }: Props) {
  const [open, setOpen] = useState(false);

  const highRisk = dossiersRisque.filter((d) => d.riskScoreGlobal > 30);

  return (
    <motion.div variants={itemVariants}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="border-destructive/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Dossiers à risque ({highRisk.length})
                </CardTitle>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Risques</TableHead>
                    <TableHead className="text-right">CA Devis</TableHead>
                    <TableHead className="text-right">Âge</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRisk.slice(0, 20).map((d) => (
                    <TableRow key={d.projectId}>
                      <TableCell className="font-mono text-xs">
                        {d.reference || d.projectId}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{d.label || '—'}</TableCell>
                      <TableCell>
                        <ScoreBar score={d.riskScoreGlobal} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {d.riskFlux > 0 && <RiskBadge label="Flux" score={d.riskFlux} max={33} />}
                          {d.riskData > 0 && <RiskBadge label="Data" score={d.riskData} max={33} />}
                          {d.riskValue > 0 && <RiskBadge label="Val" score={d.riskValue} max={34} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {d.devisHT > 0 ? formatCurrency(d.devisHT) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.ageJours}j</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {d.dataQualityFlags.map((f) => (
                            <Badge key={f} variant="outline" className="text-xs">
                              {f.replace('MISSING_', '').replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {highRisk.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Aucun dossier à risque élevé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}
