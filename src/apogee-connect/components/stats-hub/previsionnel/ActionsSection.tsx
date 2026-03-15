/**
 * Dossiers à commander + à planifier — tables collapsibles
 * Zero logique métier
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface Props {
  parProjet: ChargeTravauxProjet[];
}

function DossierTable({ dossiers, emptyText }: { dossiers: ChargeTravauxProjet[]; emptyText: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Référence</TableHead>
          <TableHead>Libellé</TableHead>
          <TableHead>Univers</TableHead>
          <TableHead className="text-right">H. Tech</TableHead>
          <TableHead className="text-right">CA Devis</TableHead>
          <TableHead className="text-right">Âge</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dossiers.map((d) => (
          <TableRow key={d.projectId}>
            <TableCell className="font-mono text-xs">{d.reference || d.projectId}</TableCell>
            <TableCell className="max-w-[200px] truncate">{d.label || '—'}</TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {d.universes.map((u) => (
                  <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">{d.totalHeuresTech > 0 ? `${d.totalHeuresTech}h` : '—'}</TableCell>
            <TableCell className="text-right font-medium">{d.devisHT > 0 ? formatCurrency(d.devisHT) : '—'}</TableCell>
            <TableCell className="text-right text-muted-foreground">{d.ageJours}j</TableCell>
          </TableRow>
        ))}
        {dossiers.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
              {emptyText}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function ActionsSection({ parProjet }: Props) {
  const [openCommander, setOpenCommander] = useState(true);
  const [openPlanifier, setOpenPlanifier] = useState(true);

  const aCommander = parProjet.filter((p) => p.etatWorkflow === 'devis_to_order');
  const aPlanifier = parProjet.filter((p) => p.etatWorkflow === 'to_planify_tvx');

  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <Collapsible open={openCommander} onOpenChange={setOpenCommander}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Dossiers à commander ({aCommander.length})
                  </CardTitle>
                  {openCommander ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <DossierTable dossiers={aCommander} emptyText="Aucun dossier à commander" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Collapsible open={openPlanifier} onOpenChange={setOpenPlanifier}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Dossiers à planifier ({aPlanifier.length})
                  </CardTitle>
                  {openPlanifier ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <DossierTable dossiers={aPlanifier} emptyText="Aucun dossier à planifier" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>
    </div>
  );
}
