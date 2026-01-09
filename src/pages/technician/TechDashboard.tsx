/**
 * Dashboard Technicien Mobile - Page d'accueil avec KPIs personnels
 * Version mobile du dashboard avec les statistiques personnelles du technicien
 */

import { useState } from 'react';
import { Euro, Wrench, FolderCheck, LinkIcon, Calendar, TrendingUp, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Périodes simplifiées pour mobile
type MobilePeriod = 'week' | 'month' | 'year';

const PERIODS: { key: MobilePeriod; label: string; shortLabel: string }[] = [
  { key: 'week', label: 'Cette semaine', shortLabel: 'Semaine' },
  { key: 'month', label: 'Ce mois', shortLabel: 'Mois' },
  { key: 'year', label: 'Cette année', shortLabel: 'Année' },
];

function getPeriodDates(period: MobilePeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getPeriodLabel(period: MobilePeriod): string {
  const now = new Date();
  switch (period) {
    case 'week':
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(weekStart, 'd', { locale: fr })} - ${format(weekEnd, 'd MMM', { locale: fr })}`;
    case 'month':
      return format(now, 'MMMM yyyy', { locale: fr });
    case 'year':
      return `Année ${format(now, 'yyyy')}`;
    default:
      return '';
  }
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  suffix?: string;
}

function KpiCard({ label, value, icon, bgColor, iconColor, suffix }: KpiCardProps) {
  return (
    <Card className={cn("border-none shadow-sm", bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl", iconColor)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold">
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
              {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechKPIsGrid() {
  const [period, setPeriod] = useState<MobilePeriod>('month');
  const dateRange = getPeriodDates(period);
  const periodLabel = getPeriodLabel(period);
  
  const { data, isLoading } = usePersonalKpis({ dateRange });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Skeleton key={p.key} className="h-8 w-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // Si pas de lien apogee_user_id
  if (data?.type === 'not_linked') {
    return (
      <Alert variant="default" className="bg-amber-500/10 border-amber-500/20">
        <LinkIcon className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          Votre compte n'est pas encore lié à votre profil Apogée. 
          Contactez votre responsable RH.
        </AlertDescription>
      </Alert>
    );
  }

  const stats = data?.type === 'technicien' ? data.data : null;

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Données indisponibles
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Période selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.key)}
            className="shrink-0"
          >
            {p.shortLabel}
          </Button>
        ))}
      </div>
      
      {/* Period label */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span className="capitalize">{periodLabel}</span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Mon CA"
          value={stats.caMonth}
          suffix="€"
          icon={<Euro className="h-5 w-5 text-white" />}
          bgColor="bg-gradient-to-br from-primary/10 to-primary/5"
          iconColor="bg-primary"
        />
        <KpiCard
          label="Interventions"
          value={stats.interventionsRealisees}
          icon={<Wrench className="h-5 w-5 text-white" />}
          bgColor="bg-gradient-to-br from-blue-500/10 to-blue-500/5"
          iconColor="bg-blue-500"
        />
        <KpiCard
          label="Dossiers traités"
          value={stats.dossiersTraites}
          icon={<FolderCheck className="h-5 w-5 text-white" />}
          bgColor="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
          iconColor="bg-emerald-500"
        />
        <KpiCard
          label="Productivité"
          value={stats.tauxProductivite}
          suffix="%"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          bgColor="bg-gradient-to-br from-orange-500/10 to-orange-500/5"
          iconColor="bg-orange-500"
        />
      </div>
    </div>
  );
}

export default function TechDashboard() {
  return (
    <div className="p-4 space-y-6">
      {/* Header avec toggle mode bureau */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Mes statistiques</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        <Link 
          to="/" 
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Bureau</span>
        </Link>
      </div>

      {/* KPIs */}
      <TechKPIsGrid />

      {/* Message informatif */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <p>Utilisez les onglets ci-dessous pour accéder à votre planning, pointage et espace RH.</p>
        </CardContent>
      </Card>
    </div>
  );
}
