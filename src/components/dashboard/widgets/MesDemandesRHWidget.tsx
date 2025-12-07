/**
 * Widget Mes Demandes RH - Affiche les dernières demandes RH
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Clock, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function MesDemandesRHWidget() {
  const { user, agencyId } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['widget-demandes-rh', user?.id, agencyId],
    queryFn: async () => {
      if (!user?.id || !agencyId) return [];
      
      // Récupérer le collaborator_id
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .eq('agency_id', agencyId)
        .single();

      if (!collaborator) return [];

      const { data, error } = await supabase
        .from('document_requests')
        .select('id, request_type, status, requested_at, employee_seen_at')
        .eq('collaborator_id', collaborator.id)
        .order('requested_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!agencyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-4">
        <Send className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground text-center">
          Aucune demande en cours
        </p>
        <Link 
          to="/mon-coffre-rh" 
          className="text-xs text-helpconfort-blue hover:underline flex items-center gap-1"
        >
          Faire une demande <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle2, color: 'text-green-500', label: 'Traité' };
      case 'REJECTED':
        return { icon: XCircle, color: 'text-red-500', label: 'Refusé' };
      case 'IN_PROGRESS':
        return { icon: Clock, color: 'text-helpconfort-orange', label: 'En cours' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', label: 'En attente' };
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'attestation_employeur': 'Attestation employeur',
      'bulletin_salaire': 'Bulletin de salaire',
      'certificat_travail': 'Certificat de travail',
      'autre': 'Autre demande',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const statusConfig = getStatusConfig(req.status);
        const StatusIcon = statusConfig.icon;
        const isUnread = (req.status === 'COMPLETED' || req.status === 'REJECTED') && !req.employee_seen_at;
        
        return (
          <div
            key={req.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              isUnread ? "bg-helpconfort-blue/10" : "hover:bg-accent/50"
            )}
          >
            <StatusIcon className={cn("h-4 w-4 shrink-0", statusConfig.color)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {getRequestTypeLabel(req.request_type)}
                {isUnread && <span className="ml-2 text-xs bg-helpconfort-blue text-white px-1.5 py-0.5 rounded">Nouveau</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(req.requested_at), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        );
      })}
      
      <Link
        to="/mon-coffre-rh"
        className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Send className="h-3 w-3" />
        Voir toutes les demandes
      </Link>
    </div>
  );
}
