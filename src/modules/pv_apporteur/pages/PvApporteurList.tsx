/**
 * Liste des dossiers pour créer un PV Apporteur
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClipboardCheck, Search, Calendar, MapPin, ChevronRight, CheckCircle, Clock, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyTechPlanning } from '@/apogee-connect/hooks/useWeeklyTechPlanning';
import { usePvApporteur } from '../hooks/usePvApporteur';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

export default function PvApporteurList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: weeklyData, isLoading } = useWeeklyTechPlanning();
  const { allPvs } = usePvApporteur();

  const pvIndex = useMemo(() => {
    const index: Record<number, { status: string; id: string }> = {};
    allPvs.forEach((pv) => {
      index[pv.dossierId] = { status: pv.status, id: pv.id };
    });
    return index;
  }, [allPvs]);

  const allDossiers = useMemo(() => {
    if (!weeklyData) return [];

    const dossiers: Array<{
      dossierId: number;
      projectId: number;
      date: Date;
      technicien: string;
      client: string;
      adresse: string;
      projectRef: string;
      apporteur?: string;
    }> = [];

    // Extraire les dossiers uniques depuis weeklyData
    const seenProjects = new Set<number>();
    
    weeklyData.forEach((techPlanning) => {
      techPlanning.days.forEach((day) => {
        day.slots.forEach((slot) => {
          if (!slot.projectId || seenProjects.has(slot.projectId)) return;
          seenProjects.add(slot.projectId);

          dossiers.push({
            dossierId: slot.projectId,
            projectId: slot.projectId,
            date: new Date(day.date),
            technicien: techPlanning.techName || 'Non assigné',
            client: slot.clientName || 'Client inconnu',
            adresse: '',
            projectRef: slot.projectRef || `#${slot.projectId}`,
            apporteur: undefined, // À enrichir si disponible
          });
        });
      });
    });

    return dossiers;
  }, [weeklyData]);

  const filteredDossiers = useMemo(() => {
    if (!search.trim()) return allDossiers;
    const searchLower = search.toLowerCase();
    return allDossiers.filter(
      (item) =>
        item.client.toLowerCase().includes(searchLower) ||
        item.adresse.toLowerCase().includes(searchLower) ||
        item.projectRef.toLowerCase().includes(searchLower)
    );
  }, [allDossiers, search]);

  const groupedDossiers = useMemo(() => {
    const today: typeof filteredDossiers = [];
    const thisWeek: typeof filteredDossiers = [];
    const other: typeof filteredDossiers = [];

    filteredDossiers.forEach((item) => {
      if (isToday(item.date)) {
        today.push(item);
      } else if (isThisWeek(item.date, { weekStartsOn: 1 })) {
        thisWeek.push(item);
      } else {
        other.push(item);
      }
    });

    return { today, thisWeek, other };
  }, [filteredDossiers]);

  const handleSelectDossier = (item: typeof allDossiers[0]) => {
    navigate(ROUTES.technicien.pvApporteurDetail.replace(':dossierId', String(item.dossierId)), {
      state: {
        dossierId: item.dossierId,
        projectId: item.projectId,
        client: item.client,
        adresse: item.adresse,
        projectRef: item.projectRef,
        technicien: item.technicien,
        date: item.date.toISOString(),
        apporteur: item.apporteur,
      },
    });
  };

  const renderDossierCard = (item: typeof allDossiers[0]) => {
    const pvStatus = pvIndex[item.dossierId];
    
    return (
      <Card
        key={item.dossierId}
        className={cn(
          'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          pvStatus?.status === 'signed' && 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/10'
        )}
        onClick={() => handleSelectDossier(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{item.client}</span>
                {pvStatus && (
                  <Badge variant="outline" className={cn(
                    'shrink-0',
                    pvStatus.status === 'draft' && 'bg-amber-50 text-amber-700',
                    pvStatus.status === 'signed' && 'bg-blue-50 text-blue-700'
                  )}>
                    {pvStatus.status === 'draft' ? <Clock className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    {pvStatus.status === 'draft' ? 'Brouillon' : 'Signé'}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(item.date, 'EEEE d MMMM', { locale: fr })}</span>
                </div>
                {item.apporteur && (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{item.apporteur}</span>
                  </div>
                )}
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
        <div className="p-2 rounded-lg bg-blue-500/10">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">PV Apporteur</h1>
          <p className="text-muted-foreground">Sélectionnez un dossier</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {allDossiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun dossier cette semaine</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Aujourd'hui ({groupedDossiers.today.length})</TabsTrigger>
            <TabsTrigger value="week">Semaine ({groupedDossiers.thisWeek.length})</TabsTrigger>
            <TabsTrigger value="other">Autres ({groupedDossiers.other.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="space-y-3 mt-4">
            {groupedDossiers.today.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucun dossier</p>
            ) : groupedDossiers.today.map(renderDossierCard)}
          </TabsContent>
          <TabsContent value="week" className="space-y-3 mt-4">
            {groupedDossiers.thisWeek.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucun dossier</p>
            ) : groupedDossiers.thisWeek.map(renderDossierCard)}
          </TabsContent>
          <TabsContent value="other" className="space-y-3 mt-4">
            {groupedDossiers.other.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucun dossier</p>
            ) : groupedDossiers.other.map(renderDossierCard)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
