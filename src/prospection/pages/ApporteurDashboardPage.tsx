/**
 * ApporteurDashboardPage - Fiche individuelle d'un apporteur
 * Données calculées en LIVE depuis l'API Apogée
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { useProfile } from '@/contexts/ProfileContext';
import { useApporteurDashboardLive } from '../hooks/useApporteurDashboardLive';
import { useApogeeCommanditaires } from '@/hooks/useApogeeCommanditaires';
import { generateApporteurInsights } from '../engine/insights';
import { ApporteurKPICards } from '../components/ApporteurKPICards';
import { ApporteurScoreCard } from '../components/ApporteurScoreCard';
import { ApporteurFunnel } from '../components/ApporteurFunnel';
import { ApporteurUniversChart } from '../components/ApporteurUniversChart';
import { ApporteurTrendCharts } from '../components/ApporteurTrendCharts';
import { InsightsPanel } from '../components/InsightsPanel';
import { FollowupPanel } from '../components/FollowupPanel';
import { MeetingTimeline } from '../components/MeetingTimeline';
import { MeetingCreateDialog } from '../components/MeetingCreateDialog';
import { ExportPitchButton } from '../components/ExportPitchButton';

interface Props {
  apporteurId: string;
  onBack: () => void;
}

type PeriodKey = '30j' | '90j' | '6m' | '12m';

function getPeriodDates(period: PeriodKey): { from: string; to: string } {
  const to = format(new Date(), 'yyyy-MM-dd');
  const map: Record<PeriodKey, Date> = {
    '30j': subDays(new Date(), 30),
    '90j': subDays(new Date(), 90),
    '6m': subMonths(new Date(), 6),
    '12m': subMonths(new Date(), 12),
  };
  return { from: format(map[period], 'yyyy-MM-dd'), to };
}

export function ApporteurDashboardPage({ apporteurId, onBack }: Props) {
  const { agence } = useProfile();
  const [period, setPeriod] = useState<PeriodKey>('6m');

  // Résoudre le nom de l'apporteur depuis Apogée
  const { data: commanditaires = [] } = useApogeeCommanditaires();
  const apporteurName = useMemo(() => {
    const found = commanditaires.find(c => String(c.id) === String(apporteurId));
    return found?.name || `Apporteur #${apporteurId}`;
  }, [commanditaires, apporteurId]);

  const { from, to } = getPeriodDates(period);
  const { data, isLoading } = useApporteurDashboardLive({
    apporteurId,
    dateFrom: from,
    dateTo: to,
  });

  const insights = data ? generateApporteurInsights(data.kpis, data.universData, undefined, undefined, undefined, data.adaptiveScore) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <h2 className="text-lg font-bold text-foreground">{apporteurName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <MeetingCreateDialog apporteurId={apporteurId} apporteurName={apporteurName} />
          {data && (
            <ExportPitchButton
              apporteurName={apporteurName}
              kpis={data.kpis}
              universData={data.universData}
              monthlyTrend={data.monthlyTrend}
              insights={insights}
              dateRange={`${from} → ${to}`}
            />
          )}
          <Select value={period} onValueChange={v => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30j">30 jours</SelectItem>
              <SelectItem value="90j">90 jours</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="12m">12 mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Score adaptatif */}
          {data.adaptiveScore && (
            <ApporteurScoreCard score={data.adaptiveScore} monthlyTrendFull={data.monthlyTrendFull} />
          )}

          {/* KPIs */}
          <ApporteurKPICards kpis={data.kpis} />

          {/* Funnel + Univers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ApporteurFunnel kpis={data.kpis} />
            <ApporteurUniversChart data={data.universData} />
          </div>

          {/* Tendances */}
          <ApporteurTrendCharts data={data.monthlyTrend} />

          {/* Insights */}
          <InsightsPanel insights={insights} />

          {/* Suivi commercial */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FollowupPanel apporteurId={apporteurId} apporteurName={apporteurName} />
            <MeetingTimeline apporteurId={apporteurId} />
          </div>
        </>
      ) : (
        <p className="text-center py-12 text-muted-foreground">Aucune donnée disponible pour cet apporteur.</p>
      )}
    </div>
  );
}
