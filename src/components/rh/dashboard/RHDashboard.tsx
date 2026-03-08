/**
 * Dashboard RH - Statistiques et métriques (P2-04)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

interface RHStats {
  collaborators: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  documents: {
    total: number;
    thisMonth: number;
  };
  requests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    avgProcessingDays: number;
  };
  contracts: {
    cdi: number;
    cdd: number;
    apprentice: number;
    other: number;
  };
}

export function RHDashboard() {
  const { agencyId } = useProfile();

  const { data: stats, isLoading } = useQuery<RHStats>({
    queryKey: ['rh-dashboard-stats', agencyId],
    queryFn: async () => {
      if (!agencyId) throw new Error('No agency');

      // Fetch collaborators
      const { data: collaborators } = await supabase
        .from('collaborators')
        .select('id, type, leaving_date')
        .eq('agency_id', agencyId);

      // Fetch documents from media_links (scoped to RH folders)
      const { data: documents } = await supabase
        .from('media_links')
        .select(`
          id,
          created_at,
          folder:media_folders!inner(path)
        `)
        .eq('agency_id', agencyId)
        .like('folder.path', '%/salaries/%');

      // Fetch requests
      const { data: requests } = await supabase
        .from('document_requests')
        .select('id, status, requested_at, processed_at')
        .eq('agency_id', agencyId);

      // Fetch contracts
      const { data: contracts } = await supabase
        .from('employment_contracts')
        .select('id, contract_type, is_current')
        .eq('agency_id', agencyId)
        .eq('is_current', true);

      // Process collaborators
      const activeCollaborators = (collaborators || []).filter(c => !c.leaving_date);
      const collabByType = (collaborators || []).reduce((acc, c) => {
        const type = c.type || 'AUTRE';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Process documents
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      
      const docsThisMonth = (documents || []).filter(
        d => new Date(d.created_at) >= thisMonthStart
      ).length;

      // Process requests
      const pending = (requests || []).filter(r => r.status === 'PENDING').length;
      const inProgress = (requests || []).filter(r => r.status === 'IN_PROGRESS').length;
      const completed = (requests || []).filter(r => r.status === 'COMPLETED');
      
      // Calculate avg processing time
      let avgDays = 0;
      if (completed.length > 0) {
        const totalDays = completed.reduce((sum, r) => {
          if (r.requested_at && r.processed_at) {
            const diff = new Date(r.processed_at).getTime() - new Date(r.requested_at).getTime();
            return sum + (diff / (1000 * 60 * 60 * 24));
          }
          return sum;
        }, 0);
        avgDays = Math.round((totalDays / completed.length) * 10) / 10;
      }

      // Process contracts
      const contractTypes = (contracts || []).reduce((acc, c) => {
        const type = c.contract_type?.toUpperCase() || 'OTHER';
        if (type === 'CDI') acc.cdi++;
        else if (type === 'CDD') acc.cdd++;
        else if (type.includes('APPRENTI') || type.includes('ALTERNANCE')) acc.apprentice++;
        else acc.other++;
        return acc;
      }, { cdi: 0, cdd: 0, apprentice: 0, other: 0 });

      return {
        collaborators: {
          total: (collaborators || []).length,
          active: activeCollaborators.length,
          byType: collabByType,
        },
        documents: {
          total: (documents || []).length,
          thisMonth: docsThisMonth,
        },
        requests: {
          total: (requests || []).length,
          pending,
          inProgress,
          completed: completed.length,
          avgProcessingDays: avgDays,
        },
        contracts: contractTypes,
      };
    },
    enabled: !!agencyId,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-helpconfort-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effectif actif</CardTitle>
            <Users className="h-4 w-4 text-helpconfort-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collaborators.active}</div>
            <p className="text-xs text-muted-foreground">
              sur {stats.collaborators.total} collaborateur{stats.collaborators.total > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-helpconfort-orange">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-helpconfort-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.documents.thisMonth} ce mois
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requests.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.requests.inProgress} en cours
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen traitement</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requests.avgProcessingDays}j</div>
            <p className="text-xs text-muted-foreground">
              {stats.requests.completed} demande{stats.requests.completed > 1 ? 's' : ''} traitée{stats.requests.completed > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Contracts breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Répartition contrats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">CDI</span>
                <Badge variant="secondary">{stats.contracts.cdi}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CDD</span>
                <Badge variant="secondary">{stats.contracts.cdd}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alternance</span>
                <Badge variant="secondary">{stats.contracts.apprentice}</Badge>
              </div>
              {stats.contracts.other > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Autres</span>
                  <Badge variant="secondary">{stats.contracts.other}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Collaborators by type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Par fonction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.collaborators.byType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{type.toLowerCase()}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Requests status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Statut demandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  En attente
                </span>
                <Badge variant="outline" className="bg-amber-50">{stats.requests.pending}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3 text-blue-500" />
                  En cours
                </span>
                <Badge variant="outline" className="bg-blue-50">{stats.requests.inProgress}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Traitées
                </span>
                <Badge variant="outline" className="bg-green-50">{stats.requests.completed}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
