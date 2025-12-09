/**
 * Liste des interventions pour remplir un BI
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileSignature, Search, Calendar, MapPin, User, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyTechPlanning } from '@/apogee-connect/hooks/useWeeklyTechPlanning';
import { useBonIntervention } from '../hooks/useBonIntervention';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

export default function BonInterventionList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: weeklyData, isLoading } = useWeeklyTechPlanning();
  const { allBons } = useBonIntervention();

  const biIndex = useMemo(() => {
    const index: Record<number, { status: string; id: string }> = {};
    allBons.forEach((bi) => {
      index[bi.interventionId] = { status: bi.status, id: bi.id };
    });
    return index;
  }, [allBons]);

  const allInterventions = useMemo(() => {
    if (!weeklyData) return [];

    const interventions: Array<{
      intervention: any;
      date: Date;
      technicien: string;
      client: string;
      adresse: string;
      projectRef: string;
      projectId: number;
    }> = [];

    weeklyData.forEach((day) => {
      day.creneaux?.forEach((creneau: any) => {
        const intervention = creneau.intervention;
        if (!intervention) return;

        const type = (intervention.type2 || intervention.type || '').toLowerCase();
        if (type.includes('rt') || type.includes('releve') || type.includes('rdv tech')) {
          return;
        }

        interventions.push({
          intervention,
          date: new Date(day.date),
          technicien: creneau.technicien?.name || 'Non assigné',
          client: intervention.client?.name || intervention.data?.clientName || 'Client inconnu',
          adresse: intervention.client?.address || intervention.data?.address || '',
          projectRef: intervention.project?.ref || `#${intervention.projectId}`,
          projectId: intervention.projectId,
        });
      });
    });

    return interventions;
  }, [weeklyData]);

  const filteredInterventions = useMemo(() => {
    if (!search.trim()) return allInterventions;
    const searchLower = search.toLowerCase();
    return allInterventions.filter(
      (item) =>
        item.client.toLowerCase().includes(searchLower) ||
        item.adresse.toLowerCase().includes(searchLower) ||
        item.projectRef.toLowerCase().includes(searchLower)
    );
  }, [allInterventions, search]);

  const groupedInterventions = useMemo(() => {
    const today: typeof filteredInterventions = [];
    const thisWeek: typeof filteredInterventions = [];
    const other: typeof filteredInterventions = [];

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    filteredInterventions.forEach((item) => {
      if (isToday(item.date) || isYesterday(item.date)) {
        today.push(item);
      } else if (isWithinInterval(item.date, { start: weekStart, end: weekEnd })) {
        thisWeek.push(item);
      } else {
        other.push(item);
      }
    });

    return { today, thisWeek, other };
  }, [filteredInterventions]);

  const handleSelectIntervention = (item: typeof allInterventions[0]) => {
    navigate(ROUTES.technicien.bonInterventionDetail.replace(':interventionId', String(item.intervention.id)), {
      state: {
        intervention: item.intervention,
        client: item.client,
        adresse: item.adresse,
        projectRef: item.projectRef,
        projectId: item.projectId,
        technicien: item.technicien,
        date: item.date.toISOString(),
      },
    });
  };

  const renderInterventionCard = (item: typeof allInterventions[0]) => {
    const biStatus = biIndex[item.intervention.id];
    
    return (
      <Card
        key={item.intervention.id}
        className={cn(
          'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          biStatus?.status === 'signed' && 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10'
        )}
        onClick={() => handleSelectIntervention(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{item.client}</span>
                {biStatus && (
                  <Badge variant="outline" className={cn(
                    'shrink-0',
                    biStatus.status === 'draft' && 'bg-amber-50 text-amber-700',
                    biStatus.status === 'signed' && 'bg-green-50 text-green-700'
                  )}>
                    {biStatus.status === 'draft' ? <Clock className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    {biStatus.status === 'draft' ? 'Brouillon' : 'Signé'}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(item.date, 'EEEE d MMMM', { locale: fr })}</span>
                </div>
                {item.adresse && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{item.adresse}</span>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/10">
          <FileSignature className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bon d'Intervention</h1>
          <p className="text-muted-foreground">Sélectionnez une intervention</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {allInterventions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune intervention cette semaine</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Aujourd'hui ({groupedInterventions.today.length})</TabsTrigger>
            <TabsTrigger value="week">Semaine ({groupedInterventions.thisWeek.length})</TabsTrigger>
            <TabsTrigger value="other">Autres ({groupedInterventions.other.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="space-y-3 mt-4">
            {groupedInterventions.today.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucune intervention</p>
            ) : groupedInterventions.today.map(renderInterventionCard)}
          </TabsContent>
          <TabsContent value="week" className="space-y-3 mt-4">
            {groupedInterventions.thisWeek.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucune intervention</p>
            ) : groupedInterventions.thisWeek.map(renderInterventionCard)}
          </TabsContent>
          <TabsContent value="other" className="space-y-3 mt-4">
            {groupedInterventions.other.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucune intervention</p>
            ) : groupedInterventions.other.map(renderInterventionCard)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
