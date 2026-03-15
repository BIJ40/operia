/**
 * Pipeline par état + vieillissement par buckets
 * Zero logique métier
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ChargeParEtatStats, PipelineAgeBucket } from '@/statia/shared/chargeTravauxEngine';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${Math.round(value)}€`;
};

const ETAT_COLORS: Record<string, string> = {
  'to_planify_tvx': 'hsl(200, 85%, 60%)',
  'devis_to_order': 'hsl(35, 90%, 60%)',
  'wait_fourn': 'hsl(270, 60%, 65%)',
  'planified_tvx': 'hsl(145, 60%, 55%)',
};

const AGE_COLORS: Record<string, string> = {
  '0-7j': 'hsl(145, 60%, 55%)',
  '8-15j': 'hsl(200, 85%, 60%)',
  '16-30j': 'hsl(35, 90%, 60%)',
  '30+j': 'hsl(0, 65%, 55%)',
};

interface Props {
  parEtat: ChargeParEtatStats[];
  pipelineAge: PipelineAgeBucket[];
}

export function PipelineSection({ parEtat, pipelineAge }: Props) {
  const chartData = parEtat.map((e) => ({
    name: e.etatLabel,
    dossiers: e.nbDossiers,
    ca: Math.round(e.devisHT),
    heures: Math.round(e.totalHeuresTech),
    color: ETAT_COLORS[e.etat] || '#6b7280',
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pipeline par état */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pipeline par état</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'ca') return [formatCurrency(value), 'CA Devis'];
                        return [`${value}`, 'Dossiers'];
                      }}
                    />
                    <Bar dataKey="dossiers" radius={[4, 4, 0, 0]} animationDuration={1500}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Aucun dossier en pipeline
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Vieillissement pipeline */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vieillissement pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {pipelineAge.map((bucket) => (
                  <div
                    key={bucket.bucket}
                    className="rounded-xl border p-4 text-center"
                    style={{ borderColor: AGE_COLORS[bucket.bucket] }}
                  >
                    <p className="text-xs font-medium text-muted-foreground">{bucket.bucket}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: AGE_COLORS[bucket.bucket] }}>
                      {bucket.nbDossiers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(bucket.caTotal)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
