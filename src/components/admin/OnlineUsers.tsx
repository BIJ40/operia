import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logError } from '@/lib/logger';

interface UserPresence {
  user_id: string;
  status: string;
  last_seen: string;
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

    // Subscribe to realtime changes
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

    // Refresh every 30 seconds
    const interval = setInterval(loadOnlineUsers, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadOnlineUsers = async () => {
    try {
      // Récupérer les présences
      const { data: presences, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('status', 'online')
        .order('last_seen', { ascending: false });

      if (error) throw error;

      // Récupérer les profils associés
      if (presences && presences.length > 0) {
        const userIds = presences.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, agence')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedPresences = presences
          .filter(presence => {
            const profile = profilesMap.get(presence.user_id);
            return profile && (profile.first_name || profile.last_name || profile.email);
          })
          .map(presence => ({
            ...presence,
            profile: profilesMap.get(presence.user_id)
          }));

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

  const getTimeSince = (lastSeen: string) => {
    const now = new Date();
    const last = new Date(lastSeen);
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins === 1) return 'Il y a 1 minute';
    if (diffMins < 60) return `Il y a ${diffMins} minutes`;
    
    return format(last, 'HH:mm', { locale: fr });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-green-500 fill-green-500" />
          Utilisateurs connectés
        </CardTitle>
        <CardDescription>
          {onlineUsers.length} utilisateur{onlineUsers.length > 1 ? 's' : ''} en ligne
        </CardDescription>
      </CardHeader>
      <CardContent>
        {onlineUsers.length > 0 ? (
          <div className="space-y-2">
            {onlineUsers.map((presence) => (
              <div 
                key={presence.user_id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Circle className="w-2 h-2 text-green-500 fill-green-500 animate-pulse" />
                  <div>
                    <p className="font-medium">{getDisplayName(presence)}</p>
                    {presence.profile?.agence && (
                      <p className="text-xs text-muted-foreground">
                        {presence.profile.agence}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getTimeSince(presence.last_seen)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Aucun utilisateur connecté
          </p>
        )}
      </CardContent>
    </Card>
  );
}
