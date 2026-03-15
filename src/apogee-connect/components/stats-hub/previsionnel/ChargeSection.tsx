/**
 * Charge par technicien + projection semaine S/S+1/S+2/S+3
 * Zero logique métier
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChargeTechnicien, ChargeParSemaine } from '@/statia/shared/chargeTravauxEngine';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const getChargeColor = (taux: number): string => {
  if (taux > 0.9) return 'hsl(0, 65%, 55%)';   // red
  if (taux > 0.7) return 'hsl(35, 90%, 60%)';   // amber
  return 'hsl(145, 60%, 55%)';                    // green
};

const getChargeBgClass = (taux: number): string => {
  if (taux > 0.9) return 'bg-red-500';
  if (taux > 0.7) return 'bg-amber-500';
  return 'bg-green-500';
};

interface Props {
  parTechnicien: ChargeTechnicien[];
  chargeParSemaine: ChargeParSemaine[];
}

export function ChargeSection({ parTechnicien, chargeParSemaine }: Props) {
  const techChartData = parTechnicien.slice(0, 10).map((t) => ({
    name: t.techName,
    heures: t.heuresPlanifiees,
    dossiers: t.nbDossiers,
    taux: t.tauxCharge,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Charge par technicien */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Charge par technicien</CardTitle>
          </CardHeader>
          <CardContent>
            {techChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={techChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}h`, 'Heures']}
                  />
                  <Bar dataKey="heures" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Aucun technicien assigné
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Projection hebdomadaire */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Charge prévisionnelle (4 semaines)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chargeParSemaine.map((s, i) => {
                const label = i === 0 ? 'Semaine courante' : `S+${i}`;
                const percent = Math.round(s.tauxCharge * 100);
                return (
                  <div key={s.week} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.heuresPlanifiees}h / {s.heuresDisponibles}h
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getChargeBgClass(s.tauxCharge)}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-right" style={{ color: getChargeColor(s.tauxCharge) }}>
                      {percent}%
                    </p>
                  </div>
                );
              })}
              {chargeParSemaine.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Aucune donnée de charge
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
