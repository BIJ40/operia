import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import { logError } from '@/lib/logger';
import { cn } from '@/lib/utils';

/** Seuils de présence */
const ACTIVE_THRESHOLD_MS = 60_000;   // < 1 min → vert "En ligne"
const IDLE_THRESHOLD_MS = 120_000;    // 1-2 min → orange "Inactif"
// > 2 min → filtré, pas affiché

type PresenceStatus = 'active' | 'idle';

interface UserPresence {
  user_id: string;
  status: string;
  last_seen: string;
  presenceStatus: PresenceStatus;
  profile?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    agence: string | null;
  };
}

export function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    loadOnlineUsers();

    const channel = supabase
      .channel('user_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          loadOnlineUsers();
        }
      )
      .subscribe();

    // Refresh every 15 seconds for more accurate status
    const interval = setInterval(loadOnlineUsers, 15_000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadOnlineUsers = async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - IDLE_THRESHOLD_MS).toISOString();
      const { data: presences, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('status', 'online')
        .gte('last_seen', twoMinutesAgo)
        .order('last_seen', { ascending: false });

      if (error) throw error;

      if (presences && presences.length > 0) {
        const userIds = presences.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, agence')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const now = Date.now();

        const enrichedPresences = presences
          .filter(presence => {
            const profile = profilesMap.get(presence.user_id);
            return profile && (profile.first_name || profile.last_name || profile.email);
          })
          .map(presence => {
            const diffMs = now - new Date(presence.last_seen).getTime();
            const presenceStatus: PresenceStatus = diffMs < ACTIVE_THRESHOLD_MS ? 'active' : 'idle';
            return {
              ...presence,
              presenceStatus,
              profile: profilesMap.get(presence.user_id)
            };
          });

        setOnlineUsers(enrichedPresences);
      } else {
        setOnlineUsers([]);
      }
    } catch (error) {
      logError('Erreur chargement utilisateurs en ligne:', error);
    }
  };

  const getDisplayName = (presence: UserPresence) => {
    const { profile } = presence;
    if (!profile) return 'Utilisateur inconnu';
    
    const name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(' ');
    
    return name || profile.email || 'Utilisateur inconnu';
  };

  const activeCount = onlineUsers.filter(u => u.presenceStatus === 'active').length;
  const idleCount = onlineUsers.filter(u => u.presenceStatus === 'idle').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-green-500 fill-green-500" />
          Utilisateurs en ligne
        </CardTitle>
        <CardDescription className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Circle className="w-2 h-2 text-green-500 fill-green-500" />
            {activeCount} actif{activeCount > 1 ? 's' : ''}
          </span>
          {idleCount > 0 && (
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 text-amber-500 fill-amber-500" />
              {idleCount} inactif{idleCount > 1 ? 's' : ''}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {onlineUsers.length > 0 ? (
          <div className="space-y-2">
            {onlineUsers.map((presence) => {
              const isActive = presence.presenceStatus === 'active';
              return (
                <div 
                  key={presence.user_id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Circle className={cn(
                      "w-2 h-2",
                      isActive 
                        ? "text-green-500 fill-green-500 animate-pulse" 
                        : "text-amber-500 fill-amber-500"
                    )} />
                    <div>
                      <p className="font-medium">{getDisplayName(presence)}</p>
                      {presence.profile?.agence && (
                        <p className="text-xs text-muted-foreground">
                          {presence.profile.agence}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      isActive 
                        ? "border-green-500/30 text-green-600" 
                        : "border-amber-500/30 text-amber-600"
                    )}
                  >
                    {isActive ? 'En ligne' : 'Inactif'}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Aucun utilisateur en ligne
          </p>
        )}
      </CardContent>
    </Card>
  );
}
