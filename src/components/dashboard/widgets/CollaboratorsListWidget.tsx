/**
 * Widget Liste Collaborateurs - Affiche les collaborateurs de l'agence
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function CollaboratorsListWidget() {
  const { agencyId } = useProfile();

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['widget-collaborators', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name, role, type, leaving_date')
        .eq('agency_id', agencyId)
        .is('leaving_date', null) // Actifs uniquement
        .order('last_name')
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!collaborators || collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-4">
        <Users className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground text-center">
          Aucun collaborateur
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/rh/suivi">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un collaborateur
          </Link>
        </Button>
      </div>
    );
  }

  const getTypeColor = (type: string | null) => {
    switch (type?.toUpperCase()) {
      case 'TECHNICIEN': return 'bg-helpconfort-blue text-white';
      case 'ADMINISTRATIF': return 'bg-helpconfort-orange text-white';
      case 'DIRIGEANT': return 'bg-violet-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-2">
      {collaborators.map((collab) => (
        <Link
          key={collab.id}
          to={`/rh/suivi?open=${collab.id}`}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className={cn('text-xs font-medium', getTypeColor(collab.type))}>
              {getInitials(collab.first_name, collab.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {collab.first_name} {collab.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {collab.role || collab.type || 'Collaborateur'}
            </p>
          </div>
        </Link>
      ))}
      
      <Link
        to="/rh/suivi"
        className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <User className="h-3 w-3" />
        Voir tous les collaborateurs
      </Link>
    </div>
  );
}
