import type { FinancialSummary } from '@/hooks/useFinancialSummary';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface KpiRowProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

function KpiCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-lg font-bold tabular-nums text-foreground">
        {value}{suffix && <span className="text-xs font-normal text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function KpiRow({ summary, isLoading }: KpiRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  const caNet = summary?.ca_net ?? 0;
  const margeBrute = summary?.marge_brute ?? 0;
  const margeContributive = summary?.marge_contributive ?? 0;
  const heures = summary?.heures_facturees ?? 0;
  const nbFactures = summary?.nb_factures ?? 0;

  const tauxMargeBrute = caNet > 0 ? (margeBrute / caNet) * 100 : 0;
  const tauxMargeContrib = caNet > 0 ? (margeContributive / caNet) * 100 : 0;
  const panierMoyen = nbFactures > 0 ? caNet / nbFactures : 0;
  const caParHeure = heures > 0 ? caNet / heures : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Taux marge brute" value={formatPercent(tauxMargeBrute)} />
      <KpiCard label="Taux marge contrib." value={formatPercent(tauxMargeContrib)} />
      <KpiCard label="Panier moyen" value={formatCurrency(panierMoyen)} />
      <KpiCard label="CA / heure" value={formatCurrency(caParHeure)} suffix="/h" />
    </div>
  );
}
