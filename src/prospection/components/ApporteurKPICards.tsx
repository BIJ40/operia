/**
 * ApporteurKPICards - Cards KPIs pour un apporteur
 * Deux taux de transformation : devis→facture ET dossier→facture
 */

import { Card, CardContent } from '@/components/ui/card';
import { FileText, PenTool, CheckCircle, Receipt, Euro, ShoppingCart, TrendingUp, Target, Clock } from 'lucide-react';
import type { AggregatedKPIs } from '../engine/aggregators';

interface Props {
  kpis: AggregatedKPIs;
}

function KPICard({ icon: Icon, label, value, suffix, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
}) {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold text-foreground">
              {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApporteurKPICards({ kpis }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <KPICard icon={FileText} label="Dossiers reçus" value={kpis.dossiers_received} color="bg-blue-600" />
      <KPICard icon={PenTool} label="Devis émis" value={kpis.devis_total} color="bg-indigo-600" />
      <KPICard icon={CheckCircle} label="Devis signés" value={kpis.devis_signed} color="bg-green-600" />
      <KPICard icon={Receipt} label="Factures" value={kpis.factures} color="bg-emerald-600" />
      <KPICard icon={Euro} label="CA HT" value={fmt(kpis.ca_ht)} suffix="€" color="bg-amber-600" />
      <KPICard icon={ShoppingCart} label="Panier moyen" value={kpis.panier_moyen != null ? fmt(kpis.panier_moyen) : '—'} suffix={kpis.panier_moyen != null ? '€' : ''} color="bg-orange-600" />
      <KPICard icon={TrendingUp} label="Tx transfo devis" value={kpis.taux_transfo_devis != null ? `${kpis.taux_transfo_devis.toFixed(1)}` : '—'} suffix={kpis.taux_transfo_devis != null ? '%' : ''} color="bg-purple-600" />
      <KPICard icon={Target} label="Tx transfo dossier" value={kpis.taux_transfo_dossier != null ? `${kpis.taux_transfo_dossier.toFixed(1)}` : '—'} suffix={kpis.taux_transfo_dossier != null ? '%' : ''} color="bg-rose-600" />
    </div>
  );
}
